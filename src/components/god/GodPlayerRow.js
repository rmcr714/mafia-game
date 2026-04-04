import { ROLES } from "../../constants/roles";
import { UserKickIcon } from "../icons/UserKickIcon";

export function GodPlayerRow({ name, roleKey, onKick }) {
  const role = ROLES[roleKey];
  if (!role) return null;
  return (
    <div className="god-player-row" style={{ borderLeftColor: role.color }}>
      <div className="god-player-name">{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="god-player-role" style={{ color: role.color }}>
          {role.emoji} {role.label}
        </div>
        {onKick && (
          <button type="button" className="kick-btn" onClick={() => onKick(name)} title="Kick player">
            <UserKickIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
