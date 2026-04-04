import { ROLES } from "../../constants/roles";

export function HomeScreen({ onCreate, onJoin }) {
  return (
    <div className="screen center">
      <div className="logo-area">
        <div className="logo-icon">🎭</div>
        <h1 className="logo-title">MAFIA</h1>
        <p className="logo-sub">The Role Assignment System</p>
      </div>
      <div className="btn-group">
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <span>Create Room</span>
          <span className="btn-hint">You are the God</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={onJoin}>
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
