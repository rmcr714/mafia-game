import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update, remove } from "firebase/database";
import "./App.css";

// ── Firebase config ──────────────────────────────────────────────
// Replace with your own Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Role definitions ─────────────────────────────────────────────
const ROLES = {
  MAFIA:     { label: "Mafia",     emoji: "🔪", team: "mafia", color: "#c0392b", desc: "Kill one citizen each night." },
  GODFATHER: { label: "Godfather", emoji: "🎩", team: "mafia", color: "#8e1c1c", desc: "Mafia leader. Appears innocent to the Healer." },
  JIHADI:    { label: "Jihadi",    emoji: "💣", team: "mafia", color: "#e67e22", desc: "Works for Mafia. Can take someone down when eliminated." },
  HEALER:    { label: "Healer",    emoji: "💊", team: "town",  color: "#27ae60", desc: "Save one player from death each night." },
  SHIELD:    { label: "Shield",    emoji: "🛡️", team: "town",  color: "#2980b9", desc: "Protect a player from being killed." },
  CITIZEN:   { label: "Citizen",   emoji: "👤", team: "town",  color: "#7f8c8d", desc: "Vote out suspects during the day." },
};

const SPECIAL_ROLES = ["MAFIA", "GODFATHER", "JIHADI", "HEALER", "SHIELD"];

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

function assignRoles(players) {
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

  // ── Create room (God) ────────────────────────────────────────
  async function createRoom() {
    const code = generateCode();
    await set(ref(db, `rooms/${code}`), {
      players: {},
      rolesAssigned: false,
      gameStatus: "lobby",
    });
    setRoomCode(code);
    setScreen("god");
    listenRoom(code, true);
  }

  // ── Join room (Player) ───────────────────────────────────────
  async function joinRoom() {
    setError("");
    const code = inputCode.trim().toUpperCase();
    if (!code || !playerName.trim()) {
      setError("Enter both a room code and your name.");
      return;
    }
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) {
      setError("Room not found. Check the code.");
      return;
    }
    const name = playerName.trim();
    await update(ref(db, `rooms/${code}/players`), { [name]: "waiting" });
    setRoomCode(code);
    setMyName(name);
    setScreen("player");
    listenRoom(code, false, name);
  }

  // ── Listen to room changes ───────────────────────────────────
  function listenRoom(code, isGod, name) {
    onValue(ref(db, `rooms/${code}`), (snap) => {
      // Room deleted — send everyone home
      if (!snap.exists()) {
        resetLocal();
        return;
      }

      const data = snap.val();
      const p = data.players || {};
      const status = data.gameStatus || "lobby";

      setPlayers(p);
      setRolesAssigned(!!data.rolesAssigned);

      if (!isGod) {
        // God ended the game
        if (status === "ended") {
          resetLocal();
          return;
        }
        // God hit Reassign — pull player back to waiting screen
        if (status === "lobby" && !data.rolesAssigned) {
          setMyRole(null);
          setScreen("player");
          return;
        }
        // Roles assigned — show role card
        if (data.rolesAssigned && p[name] && p[name] !== "waiting") {
          setMyRole(p[name]);
          setScreen("role");
        }
      }
    });
  }

  // ── God assigns roles ────────────────────────────────────────
  async function handleAssignRoles() {
    if (Object.keys(players).length === 0) return;
    const assignments = assignRoles(players);
    await update(ref(db, `rooms/${roomCode}`), {
      players: assignments,
      rolesAssigned: true,
      gameStatus: "active",
    });
  }

  // ── God reassigns roles ───────────────────────────────────────
  async function handleReassign() {
    const resetPlayers = {};
    Object.keys(players).forEach((p) => (resetPlayers[p] = "waiting"));
    // gameStatus: "lobby" pushes all players back to waiting screen automatically
    await update(ref(db, `rooms/${roomCode}`), {
      players: resetPlayers,
      rolesAssigned: false,
      gameStatus: "lobby",
    });
  }

  // ── God ends game ─────────────────────────────────────────────
  async function handleEndGame() {
    await update(ref(db, `rooms/${roomCode}`), { gameStatus: "ended" });
    await remove(ref(db, `rooms/${roomCode}`));
    resetLocal();
  }

  // ── Copy room code ────────────────────────────────────────────
  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Reset local state ─────────────────────────────────────────
  function resetLocal() {
    setScreen("home");
    setRoomCode("");
    setInputCode("");
    setPlayerName("");
    setMyName("");
    setMyRole(null);
    setPlayers({});
    setRolesAssigned(false);
    setError("");
    setShowEndConfirm(false);
  }

  // ── Screens ──────────────────────────────────────────────────
  if (screen === "home")    return <HomeScreen onCreate={createRoom} onJoin={() => setScreen("joining")} />;
  if (screen === "joining") return (
    <JoinScreen
      inputCode={inputCode} setInputCode={setInputCode}
      playerName={playerName} setPlayerName={setPlayerName}
      onJoin={joinRoom} error={error} onBack={resetLocal}
    />
  );
  if (screen === "god") return (
    <GodScreen
      roomCode={roomCode} players={players}
      rolesAssigned={rolesAssigned}
      onAssign={handleAssignRoles}
      onReassign={handleReassign}
      onEndGame={handleEndGame}
      showEndConfirm={showEndConfirm}
      setShowEndConfirm={setShowEndConfirm}
      onCopy={copyCode} copied={copied}
    />
  );
  if (screen === "player") return (
    <WaitingScreen name={myName} roomCode={roomCode} players={players} />
  );
  if (screen === "role") return (
    <RoleScreen name={myName} roleKey={myRole} onLeave={resetLocal} />
  );
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
          <input
            className="input"
            placeholder="e.g. AB12C"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            maxLength={5}
          />
        </div>
        <div className="input-group">
          <label>Your Name</label>
          <input
            className="input"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary full" onClick={onJoin}>Enter the Room</button>
      </div>
    </div>
  );
}

// ── God Screen ───────────────────────────────────────────────────
function GodScreen({ roomCode, players, rolesAssigned, onAssign, onReassign, onEndGame, showEndConfirm, setShowEndConfirm, onCopy, copied }) {
  const playerList = Object.entries(players);
  const teamMafia  = playerList.filter(([, r]) => ROLES[r]?.team === "mafia");
  const teamTown   = playerList.filter(([, r]) => ROLES[r]?.team === "town");
  const waiting    = playerList.filter(([, r]) => r === "waiting");

  return (
    <div className="screen">
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
          {playerList.length === 0 ? (
            <p className="empty-hint">Waiting for players to join…</p>
          ) : (
            <div className="player-list">
              {playerList.map(([name]) => (
                <div key={name} className="player-chip waiting">
                  <span className="player-dot" />
                  {name}
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary full assign-btn" onClick={onAssign} disabled={playerList.length === 0}>
            🎲 Assign Roles Randomly
          </button>
          <button className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>
            🚪 End Game
          </button>
        </div>
      ) : (
        <div className="roles-section">
          <div className="team-block">
            <div className="team-label mafia-label">🔴 Mafia Team</div>
            {teamMafia.map(([name, role]) => (
              <GodPlayerRow key={name} name={name} roleKey={role} />
            ))}
          </div>
          <div className="team-block">
            <div className="team-label town-label">🟢 Town Team</div>
            {teamTown.map(([name, role]) => (
              <GodPlayerRow key={name} name={name} roleKey={role} />
            ))}
          </div>
          {waiting.length > 0 && (
            <div className="team-block">
              <div className="team-label">⏳ Still Waiting</div>
              {waiting.map(([name]) => (
                <div key={name} className="player-row-waiting">{name}</div>
              ))}
            </div>
          )}
          <div className="god-actions">
            <button className="btn btn-outline full" onClick={onReassign}>🔄 Reassign Roles</button>
            <button className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>🚪 End Game</button>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">End this game?</h3>
            <p className="modal-desc">All players will be sent back to the home screen and the room will be deleted.</p>
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

function GodPlayerRow({ name, roleKey }) {
  const role = ROLES[roleKey];
  if (!role) return null;
  return (
    <div className="god-player-row" style={{ borderLeftColor: role.color }}>
      <div className="god-player-name">{name}</div>
      <div className="god-player-role" style={{ color: role.color }}>
        {role.emoji} {role.label}
      </div>
    </div>
  );
}

// ── Waiting Screen ───────────────────────────────────────────────
function WaitingScreen({ name, roomCode, players }) {
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
        {Object.keys(players).map((p) => (
          <div key={p} className={`player-chip waiting ${p === name ? "me" : ""}`}>
            <span className="player-dot" />
            {p} {p === name && <span className="you-tag">you</span>}
          </div>
        ))}
      </div>
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
