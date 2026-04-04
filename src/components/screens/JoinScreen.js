export function JoinScreen({
  inputCode,
  setInputCode,
  playerName,
  setPlayerName,
  onJoin,
  error,
  onBack,
}) {
  return (
    <div className="screen center">
      <button type="button" className="back-btn" onClick={onBack}>
        ← Back
      </button>
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
            onKeyDown={(e) => e.key === "Enter" && onJoin()}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn btn-primary full" onClick={onJoin}>
          Enter the Room
        </button>
      </div>
    </div>
  );
}
