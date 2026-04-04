import { ROLES } from "../../constants/roles";
import { UserKickIcon } from "../icons/UserKickIcon";
import { ManualPlayerRow } from "../god/ManualPlayerRow";
import { GodPlayerRow } from "../god/GodPlayerRow";

export function GodScreen({
  roomCode,
  players,
  rolesAssigned,
  assignMode,
  setAssignMode,
  manualAssignments,
  setManualRole,
  onAssign,
  onManualAssign,
  onReassign,
  onEndGame,
  onKick,
  leaveNotif,
  showEndConfirm,
  setShowEndConfirm,
  onCopy,
  copied,
}) {
  const playerList = Object.entries(players);
  const teamMafia = playerList.filter(([, r]) => ROLES[r]?.team === "mafia");
  const teamTown = playerList.filter(([, r]) => ROLES[r]?.team === "town");
  const waiting = playerList.filter(([, r]) => r === "waiting");

  return (
    <div className="screen">
      {leaveNotif && (
        <div className="leave-notif">
          {leaveNotif.wasKicked ? "👢" : "🚶"}{" "}
          <strong>{leaveNotif.name}</strong>{" "}
          {leaveNotif.wasKicked ? "was kicked from the room" : "left the room"}
        </div>
      )}

      <div className="god-header">
        <div className="god-badge">👁️ GOD VIEW</div>
        <div className="room-code-display">
          <span className="room-code-label">Room Code</span>
          <span className="room-code-val">{roomCode}</span>
          <button type="button" className="copy-btn" onClick={onCopy}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
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
                  <span style={{ flex: 1 }}>{name}</span>
                  <button type="button" className="kick-btn" onClick={() => onKick(name)} title="Kick player">
                    <UserKickIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {playerList.length > 0 && (
            <>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${assignMode === "random" ? "active" : ""}`}
                  onClick={() => setAssignMode("random")}
                >
                  🎲 Random
                </button>
                <button
                  type="button"
                  className={`mode-btn ${assignMode === "manual" ? "active" : ""}`}
                  onClick={() => setAssignMode("manual")}
                >
                  ✋ Manual
                </button>
              </div>

              {assignMode === "random" && (
                <div className="assign-section">
                  <p className="assign-hint">Roles will be shuffled and assigned randomly to all players.</p>
                  <button type="button" className="btn btn-primary full assign-btn" onClick={onAssign}>
                    🎲 Assign Roles Randomly
                  </button>
                </div>
              )}

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
                    type="button"
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

          <button type="button" className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>
            🚪 End Game
          </button>
        </div>
      ) : (
        <div className="roles-section">
          <div className="team-block">
            <div className="team-label mafia-label">🔴 Mafia Team</div>
            {teamMafia.map(([name, role]) => (
              <GodPlayerRow key={name} name={name} roleKey={role} onKick={onKick} />
            ))}
          </div>
          <div className="team-block">
            <div className="team-label town-label">🟢 Town Team</div>
            {teamTown.map(([name, role]) => (
              <GodPlayerRow key={name} name={name} roleKey={role} onKick={onKick} />
            ))}
          </div>
          {waiting.length > 0 && (
            <div className="team-block">
              <div className="team-label">⏳ Still Waiting</div>
              {waiting.map(([name]) => (
                <div key={name} className="player-row-waiting">
                  {name}
                </div>
              ))}
            </div>
          )}
          <div className="god-actions">
            <button type="button" className="btn btn-outline full" onClick={onReassign}>
              🔄 Reassign Roles
            </button>
            <button type="button" className="btn btn-danger full" onClick={() => setShowEndConfirm(true)}>
              🚪 End Game
            </button>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">End this game?</h3>
            <p className="modal-desc">All players will be sent back to home and the room will be deleted.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-danger full" onClick={onEndGame}>
                Yes, End Game
              </button>
              <button type="button" className="btn btn-outline full" onClick={() => setShowEndConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
