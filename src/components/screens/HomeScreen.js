import { useState } from "react";
import { ROLES } from "../../constants/roles";

export function HomeScreen({ onCreate, onJoin }) {
  const [roomSize, setRoomSize] = useState(0);

  return (
    <div className="screen center">
      <div className="logo-area">
        <div className="logo-icon">🎭</div>
        <h1 className="logo-title">MAFIA</h1>
        <p className="logo-sub">The Role Assignment System</p>
      </div>
      <div className="btn-group">
        <div className="create-room-group">
          <div className="input-group">
            <label>Room Size</label>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setRoomSize(Math.max(0, roomSize - 1))}
              >
                −
              </button>
              <div className="stepper-value">{roomSize}</div>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setRoomSize(Math.min(20, roomSize + 1))}
              >
                +
              </button>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => onCreate(roomSize)}
            disabled={roomSize <= 1}
          >
            <span>Create Room</span>
            <span className="btn-hint">You are the God</span>
          </button>
        </div>
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
