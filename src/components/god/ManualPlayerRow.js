import { ROLES } from "../../constants/roles";

export function ManualPlayerRow({ name, selectedRole, onSelect }) {
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
        onChange={(e) => onSelect(e.target.value)}
        style={{
          borderColor: role ? role.color + "66" : "var(--border2)",
          color: role?.color || "var(--text2)",
        }}
      >
        <option value="">— Pick role —</option>
        {Object.entries(ROLES).map(([key, r]) => (
          <option key={key} value={key}>
            {r.emoji} {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
