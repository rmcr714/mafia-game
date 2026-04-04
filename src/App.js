import { useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update, remove, onDisconnect } from "firebase/database";
import "./App.css";

// ── Firebase config ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Role definitions ─────────────────────────────────────────────
const ROLES = {
  MAFIA:      { label: "Mafia",      emoji: "🔪", team: "mafia", color: "#c0392b", desc: "Kill one citizen each night." },
  GODFATHER:  { label: "Godfather",  emoji: "🎩", team: "mafia", color: "#8e1c1c", desc: "Mafia leader. Appears innocent to the Detective and Healer." },
  JIHADI:     { label: "Jihadi",     emoji: "💣", team: "mafia", color: "#e67e22", desc: "Works for Mafia. Can take someone down when eliminated." },
  DETECTIVE:  { label: "Detective",  emoji: "🔍", team: "town",  color: "#9b59b6", desc: "Investigate one player each night to learn if they are Mafia or not." },
  HEALER:     { label: "Healer",     emoji: "💊", team: "town",  color: "#27ae60", desc: "Save one player from death each night." },
  SHIELD:     { label: "Shield",     emoji: "🛡️", team: "town",  color: "#2980b9", desc: "Protect a player from being killed." },
  CITIZEN:    { label: "Citizen",    emoji: "👤", team: "town",  color: "#7f8c8d", desc: "Vote out suspects during the day." },
};

// Roles that are "special" — assigned first before filling rest with Citizen
const SPECIAL_ROLES = ["MAFIA", "GODFATHER", "JIHADI", "DETECTIVE", "HEALER", "SHIELD"];

// ── Helpers ──────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignRolesRandomly(players) {
  const names = Object.keys(players);
  const shuffled = shuffle(names);
  const assignments = {};
  SPECIAL_ROLES.forEach((role, i) => {
    if (i < shuffled.length) assignments[shuffled[i]] = role;
  });
  for (let i = SPECIAL_ROLES.length; i < shuffled.length; i++) {
    assignments[shuffled[i]] = "CITIZEN";
  }
  return assignments;
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [myName, setMyName] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [players, setPlayers] = useState({});
  const [rolesAssigned, setRolesAssigned] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [assignMode, setAssignMode] = useState("random"); // "random" | "manual"
  const [manualAssignments, setManualAssignments] = useState({}); // { playerName: roleKey }
  const [leaveNotif, setLeaveNotif] = useState(null); // { name, wasKicked }
  const prevPlayersRef = useRef({}); // ref to detect who left

  // ── Create room ──────────────────────────────────────────────
  async function createRoom() {
    const code = generateCode();
    await set(ref(db, `rooms/${code}`), {
      players: {},
      rolesAssigned: false,
      gameStatus: "lobby",
      createdAt: Date.now(),
    });
    setRoomCode(code);
    setScreen("god");
    listenRoom(code, true);
    setTimeout(() => remove(ref(db, `rooms/${code}`)), 2 * 60 * 60 * 1000);
  }

  // ── Join room ────────────────────────────────────────────────
  async function joinRoom() {
    setError("");
    const code = inputCode.trim().toUpperCase();
    if (!code || !playerName.trim()) { setError("Enter both a room code and your name."); return; }
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) { setError("Room not found. Check the code."); return; }
    const name = playerName.trim();
    const playerRef = ref(db, `rooms/${code}/players/${name}`);

    // Auto-remove player from Firebase if they close the tab or lose connection
    onDisconnect(playerRef).remove();

    await set(playerRef, "waiting");
    setRoomCode(code);
    setMyName(name);
    setScreen("player");
    listenRoom(code, false, name);
  }

  // ── Listen to room ───────────────────────────────────────────
  function listenRoom(code, isGod, name) {
    onValue(ref(db, `rooms/${code}`), (snap) => {
      if (!snap.exists()) { resetLocal(); return; }
      const data = snap.val();
      const p = data.players || {};
      const status = data.gameStatus || "lobby";

      // Detect who left — compare with previous snapshot
      if (isGod) {
        const prev = prevPlayersRef.current;
        const prevNames = Object.keys(prev);
        const currNames = Object.keys(p);
        const left = prevNames.filter(n => !currNames.includes(n));
        if (left.length > 0) {
          setLeaveNotif({ name: left[0], wasKicked: false });
          setTimeout(() => setLeaveNotif(null), 4000);
        }
      }
      prevPlayersRef.current = p;

      setPlayers(p);
      setRolesAssigned(!!data.rolesAssigned);
      if (!isGod) {
        if (status === "ended") { resetLocal(); return; }
        // Player was kicked — their entry is gone
        if (name && !p[name]) { resetLocal(); return; }
        if (status === "lobby" && !data.rolesAssigned) { setMyRole(null); setScreen("player"); return; }
        if (data.rolesAssigned && p[name] && p[name] !== "waiting") { setMyRole(p[name]); setScreen("role"); }
      }
    });
  }

  // ── Random assign ────────────────────────────────────────────
  async function handleAssignRoles() {
    if (Object.keys(players).length === 0) return;
    const assignments = assignRolesRandomly(players);
    await update(ref(db, `rooms/${roomCode}`), { players: assignments, rolesAssigned: true, gameStatus: "active" });
  }

  // ── Manual assign ────────────────────────────────────────────
  async function handleManualAssign() {
    const names = Object.keys(players);
    // Fill any unassigned players with Citizen
    const final = { ...manualAssignments };
    names.forEach(n => { if (!final[n]) final[n] = "CITIZEN"; });
    await update(ref(db, `rooms/${roomCode}`), { players: final, rolesAssigned: true, gameStatus: "active" });
  }

  function setManualRole(playerName, roleKey) {
    setManualAssignments(prev => ({ ...prev, [playerName]: roleKey }));
  }

  // ── Kick player ──────────────────────────────────────────────
  async function kickPlayer(name) {
    await remove(ref(db, `rooms/${roomCode}/players/${name}`));
    // Clear from manual assignments too
    setManualAssignments(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    setLeaveNotif({ name, wasKicked: true });
    setTimeout(() => setLeaveNotif(null), 4000);
  }

  // ── Reassign ─────────────────────────────────────────────────
  async function handleReassign() {
    const resetPlayers = {};
    Object.keys(players).forEach(p => (resetPlayers[p] = "waiting"));
    setManualAssignments({});
    await update(ref(db, `rooms/${roomCode}`), { players: resetPlayers, rolesAssigned: false, gameStatus: "lobby" });
  }

  // ── End game ─────────────────────────────────────────────────
  async function handleEndGame() {
    await update(ref(db, `rooms/${roomCode}`), { gameStatus: "ended" });
    await remove(ref(db, `rooms/${roomCode}`));
    resetLocal();
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetLocal() {
    setScreen("home"); setRoomCode(""); setInputCode(""); setPlayerName("");
    setMyName(""); setMyRole(null); setPlayers({}); setRolesAssigned(false);
    setError(""); setShowEndConfirm(false); setManualAssignments({}); setAssignMode("random");
    setLeaveNotif(null); prevPlayersRef.current = {};
  }

  // ── Screens ──────────────────────────────────────────────────

  // Explicit voluntary leave — remove from Firebase, cancel onDisconnect
  async function leaveRoom() {
    if (myName && roomCode) {
      const playerRef = ref(db, `rooms/${roomCode}/players/${myName}`);
      await onDisconnect(playerRef).cancel(); // cancel the auto-remove so it doesn't double fire
      await remove(playerRef);               // manually remove right now
    }
    resetLocal();
  }

  if (screen === "home")    return <HomeScreen onCreate={createRoom} onJoin={() => setScreen("joining")} />;
  if (screen === "joining") return <JoinScreen inputCode={inputCode} setInputCode={setInputCode} playerName={playerName} setPlayerName={setPlayerName} onJoin={joinRoom} error={error} onBack={resetLocal} />;
  if (screen === "god")     return (
    <GodScreen
      roomCode={roomCode} players={players} rolesAssigned={rolesAssigned}
      assignMode={assignMode} setAssignMode={setAssignMode}
      manualAssignments={manualAssignments} setManualRole={setManualRole}
      onAssign={handleAssignRoles} onManualAssign={handleManualAssign}
      onReassign={handleReassign} onEndGame={handleEndGame}
      onKick={kickPlayer} leaveNotif={leaveNotif}
      showEndConfirm={showEndConfirm} setShowEndConfirm={setShowEndConfirm}
      onCopy={copyCode} copied={copied}
    />
  );
  if (screen === "player")  return <WaitingScreen name={myName} roomCode={roomCode} players={players} onLeave={leaveRoom} />;
  if (screen === "role")    return <RoleScreen name={myName} roleKey={myRole} onLeave={leaveRoom} />;
  return null;
}

// ── Home Screen ──────────────────────────────────────────────────
function HomeScreen({ onCreate, onJoin }) {
  return (
    <div className="screen center">
      <div className="logo-area">
        <div className="logo-icon">🎭</div>
        <h1 className="logo-title">MAFIA</h1>
        <p className="logo-sub">The Role Assignment System</p>
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={onCreate}>
          <span>Create Room</span>
          <span className="btn-hint">You are the God</span>
        </button>
        <button className="btn btn-secondary" onClick={onJoin}>
          <span>Join Room</span>
          <span className="btn-hint">Enter with a code</span>
        </button>
      </div>
      <div className="roles-preview">
        {Object.entries(ROLES).map(([key, r]) => (
          <div key={key} className="role-chip" style={{ borderColor: r.color + "55", color: r.color }}>
            {r.emoji} {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Join Screen ──────────────────────────────────────────────────
function JoinScreen({ inputCode, setInputCode, playerName, setPlayerName, onJoin, error, onBack }) {
  return (
    <div className="screen center">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="logo-area small">
        <div className="logo-icon">🚪</div>
        <h2>Join a Room</h2>
      </div>
      <div className="form">
        <div className="input-group">
          <label>Room Code</label>
          <input className="input" placeholder="e.g. AB12C" value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} maxLength={5} />
        </div>
        <div className="input-group">
          <label>Your Name</label>
          <input className="input" placeholder="Enter your name" value={playerName} onChange={e => setPlayerName(e.target.value)} onKeyDown={e => e.key === "Enter" && onJoin()} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary full" onClick={onJoin}>Enter the Room</button>
      </div>
    </div>
  );
}

// ── God Screen ───────────────────────────────────────────────────
function GodScreen({
  roomCode, players, rolesAssigned,
  assignMode, setAssignMode,
  manualAssignments, setManualRole,
  onAssign, onManualAssign,
  onReassign, onEndGame, onKick,
  leaveNotif,
  showEndConfirm, setShowEndConfirm,
  onCopy, copied
}) {
  const playerList = Object.entries(players);
  const teamMafia  = playerList.filter(([, r]) => ROLES[r]?.team === "mafia");
  const teamTown   = playerList.filter(([, r]) => ROLES[r]?.team === "town");
  const waiting    = playerList.filter(([, r]) => r === "waiting");

  const allAssigned = playerList.length > 0 &&
    playerList.every(([name]) => !!manualAssignments[name]);

  return (
    <div className="screen">
      {/* Leave / Kick notification */}
      {leaveNotif && (
        <div className="leave-notif">
          {leaveNotif.wasKicked ? "👢" : "🚶"}{" "}
          <strong>{leaveNotif.name}</strong>{" "}
          {leaveNotif.wasKicked ? "was kicked from the room" : "left the room"}
        </div>
      )}

      {/* Header */}
      <div className="god-header">
        <div className="god-badge">👁️ GOD VIEW</div>
        <div className="room-code-display">
          <span className="room-code-label">Room Code</span>
          <span className="room-code-val">{roomCode}</span>
          <button className="copy-btn" onClick={onCopy}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
        <p className="share-hint">Share this code with your players</p>
      </div>

      {!rolesAssigned ? (
        <div className="waiting-section">
          <h3 className="section-title">Players Joined ({playerList.length})</h3>

          {playerList.length === 0
            ? <p className="empty-hint">Waiting for players to join…</p>
            : <div className="player-list">
                {playerList.map(([name]) => (
                  <div key={name} className="player-chip waiting">
                    <span className="player-dot" />
                    <span style={{ flex: 1 }}>{name}</span>
                    <button className="kick-btn" onClick={() => onKick(name)} title="Kick player">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="18" y1="8" x2="23" y2="13" />
                        <line x1="23" y1="8" x2="18" y2="13" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
          }

          {/* Mode toggle */}
          {playerList.length > 0 && (
            <>
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${assignMode === "random" ? "active" : ""}`}
                  onClick={() => setAssignMode("random")}
                >
                  🎲 Random
                </button>
                <button
                  className={`mode-btn ${assignMode === "manual" ? "active" : ""}`}
                  onClick={() => setAssignMode("manual")}
                >
                  ✋ Manual
                </button>
              </div>

              {/* RANDOM MODE */}
              {assignMode === "random" && (
                <div className="assign-section">
                  <p className="assign-hint">Roles will be shuffled and assigned randomly to all players.</p>
                  <button className="btn btn-primary full assign-btn" onClick={onAssign}>
                    🎲 Assign Roles Randomly
                  </button>
                </div>
              )}

              {/* MANUAL MODE */}
              {assignMode === "manual" && (
                <div className="assign-section">
                  <p className="assign-hint">Pick a role for each player. Unassigned players get Citizen.</p>
                  <div className="manual-list">
                    {playerList.map(([name]) => (
                      <ManualPlayerRow
                        key={name}
                        name={name}
                        selectedRole={manualAssignments[name] || ""}
                        onSelect={(role) => setManualRole(name, role)}
                      />
                    ))}
                  </div>
                  <button
                    className="btn btn-primary full assign-btn"
                    onClick={onManualAssign}
                    disabled={playerList.length === 0}
                  >
                    ✅ Confirm & Assign Roles
                  </button>
                </div>
              )}
            </>
          )}

          <button className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>
            🚪 End Game
          </button>
        </div>
      ) : (
        /* Roles assigned view */
        <div className="roles-section">
          <div className="team-block">
            <div className="team-label mafia-label">🔴 Mafia Team</div>
            {teamMafia.map(([name, role]) => <GodPlayerRow key={name} name={name} roleKey={role} onKick={onKick} />)}
          </div>
          <div className="team-block">
            <div className="team-label town-label">🟢 Town Team</div>
            {teamTown.map(([name, role]) => <GodPlayerRow key={name} name={name} roleKey={role} onKick={onKick} />)}
          </div>
          {waiting.length > 0 && (
            <div className="team-block">
              <div className="team-label">⏳ Still Waiting</div>
              {waiting.map(([name]) => <div key={name} className="player-row-waiting">{name}</div>)}
            </div>
          )}
          <div className="god-actions">
            <button className="btn btn-outline full" onClick={onReassign}>🔄 Reassign Roles</button>
            <button className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>🚪 End Game</button>
          </div>
        </div>
      )}

      {/* End game confirm modal */}
      {showEndConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">End this game?</h3>
            <p className="modal-desc">All players will be sent back to home and the room will be deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-danger full" onClick={onEndGame}>Yes, End Game</button>
              <button className="btn btn-outline full" onClick={() => setShowEndConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manual Player Row ────────────────────────────────────────────
function ManualPlayerRow({ name, selectedRole, onSelect }) {
  const role = ROLES[selectedRole];
  return (
    <div className="manual-row">
      <div className="manual-player-name">
        <span className="player-dot" style={{ background: role?.color || "var(--text3)" }} />
        {name}
      </div>
      <select
        className="role-select"
        value={selectedRole}
        onChange={e => onSelect(e.target.value)}
        style={{ borderColor: role ? role.color + "66" : "var(--border2)", color: role?.color || "var(--text2)" }}
      >
        <option value="">— Pick role —</option>
        {Object.entries(ROLES).map(([key, r]) => (
          <option key={key} value={key}>{r.emoji} {r.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── God Player Row ───────────────────────────────────────────────
function GodPlayerRow({ name, roleKey, onKick }) {
  const role = ROLES[roleKey];
  if (!role) return null;
  return (
    <div className="god-player-row" style={{ borderLeftColor: role.color }}>
      <div className="god-player-name">{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="god-player-role" style={{ color: role.color }}>{role.emoji} {role.label}</div>
        {onKick && (
          <button className="kick-btn" onClick={() => onKick(name)} title="Kick player">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Waiting Screen ───────────────────────────────────────────────
function WaitingScreen({ name, roomCode, players, onLeave }) {
  return (
    <div className="screen center">
      <div className="logo-area small">
        <div className="logo-icon pulse">⏳</div>
        <h2>Waiting for God…</h2>
        <p className="logo-sub">Hi <strong>{name}</strong>, roles haven't been assigned yet.</p>
      </div>
      <div className="room-pill">Room: <strong>{roomCode}</strong></div>
      <div className="waiting-players">
        <p className="section-title">In this room ({Object.keys(players).length})</p>
        {Object.keys(players).map(p => (
          <div key={p} className={`player-chip waiting ${p === name ? "me" : ""}`}>
            <span className="player-dot" />
            {p} {p === name && <span className="you-tag">you</span>}
          </div>
        ))}
      </div>
      <button className="btn btn-outline leave-btn" style={{ marginTop: 24 }} onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}

// ── Role Reveal Screen ───────────────────────────────────────────
function RoleScreen({ name, roleKey, onLeave }) {
  const role = ROLES[roleKey];
  if (!role) return null;
  return (
    <div className="screen center role-screen" style={{ "--role-color": role.color }}>
      <div className="role-reveal">
        <p className="role-greeting">Your role, <strong>{name}</strong></p>
        <div className="role-emoji-big">{role.emoji}</div>
        <h1 className="role-name" style={{ color: role.color }}>{role.label}</h1>
        <div className="role-team-badge" style={{ background: role.color + "22", color: role.color, border: `1px solid ${role.color}55` }}>
          {role.team === "mafia" ? "🔴 Mafia Team" : "🟢 Town Team"}
        </div>
        <p className="role-desc">{role.desc}</p>
        <div className="role-warning">🤫 Keep your role secret!</div>
      </div>
      <button className="btn btn-outline leave-btn" onClick={onLeave}>Leave Room</button>
    </div>
  );
}