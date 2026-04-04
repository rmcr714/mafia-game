export function WaitingScreen({ name, roomCode, players, onLeave }) {
  return (
    <div className="screen center">
      <div className="logo-area small">
        <div className="logo-icon pulse">⏳</div>
        <h2>Waiting for God…</h2>
        <p className="logo-sub">
          Hi <strong>{name}</strong>, roles haven&apos;t been assigned yet.
        </p>
      </div>
      <div className="room-pill">
        Room: <strong>{roomCode}</strong>
      </div>
      <div className="waiting-players">
        <p className="section-title">In this room ({Object.keys(players).length})</p>
        {Object.keys(players).map((p) => (
          <div key={p} className={`player-chip waiting ${p === name ? "me" : ""}`}>
            <span className="player-dot" />
            {p} {p === name && <span className="you-tag">you</span>}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-outline leave-btn" style={{ marginTop: 24 }} onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}
