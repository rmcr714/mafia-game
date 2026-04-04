import { shuffle } from "../utils/shuffle";

export const ROLES = {
  MAFIA:      { label: "Mafia",      emoji: "🔪", team: "mafia", color: "#c0392b", desc: "Kill one citizen each night." },
  GODFATHER:  { label: "Godfather",  emoji: "🎩", team: "mafia", color: "#8e1c1c", desc: "Mafia leader. Appears innocent to the Detective and Healer." },
  JIHADI:     { label: "Jihadi",     emoji: "💣", team: "mafia", color: "#e67e22", desc: "Works for Mafia. Can take someone down when eliminated." },
  DETECTIVE:  { label: "Detective",  emoji: "🔍", team: "town",  color: "#9b59b6", desc: "Investigate one player each night to learn if they are Mafia or not." },
  HEALER:     { label: "Healer",     emoji: "💊", team: "town",  color: "#27ae60", desc: "Save one player from death each night." },
  SHIELD:     { label: "Shield",     emoji: "🛡️", team: "town",  color: "#2980b9", desc: "Protect a player from being killed." },
  CITIZEN:    { label: "Citizen",    emoji: "👤", team: "town",  color: "#7f8c8d", desc: "Vote out suspects during the day." },
};

/** Assigned first before filling remaining players with Citizen */
export const SPECIAL_ROLES = ["MAFIA", "GODFATHER", "JIHADI", "DETECTIVE", "HEALER", "SHIELD"];

export function assignRolesRandomly(players) {
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
