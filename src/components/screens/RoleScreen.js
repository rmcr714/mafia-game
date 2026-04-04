import { ROLES } from "../../constants/roles";

export function RoleScreen({ name, roleKey, onLeave }) {
  const role = ROLES[roleKey];
  if (!role) return null;
  return (
    <div className="screen center role-screen" style={{ "--role-color": role.color }}>
      <div className="role-reveal">
        <p className="role-greeting">
          Your role, <strong>{name}</strong>
        </p>
        <div className="role-emoji-big">{role.emoji}</div>
        <h1 className="role-name" style={{ color: role.color }}>
          {role.label}
        </h1>
        <div
          className="role-team-badge"
          style={{
            background: role.color + "22",
            color: role.color,
            border: `1px solid ${role.color}55`,
          }}
        >
          {role.team === "mafia" ? "🔴 Mafia Team" : "🟢 Town Team"}
        </div>
        <p className="role-desc">{role.desc}</p>
        <div className="role-warning">🤫 Keep your role secret!</div>
      </div>
      <button type="button" className="btn btn-outline leave-btn" onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}
