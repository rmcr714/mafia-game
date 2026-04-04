import { ref, set, get, update, remove, onDisconnect } from "firebase/database";
import { db } from "../lib/firebase";

export const roomPath = (code) => `rooms/${code}`;
export const playersPath = (code) => `rooms/${code}/players`;
export const playerPath = (code, name) => `rooms/${code}/players/${name}`;

export function roomRef(code) {
  return ref(db, roomPath(code));
}

export function playersRef(code) {
  return ref(db, playersPath(code));
}

export function playerRef(code, name) {
  return ref(db, playerPath(code, name));
}

export async function fetchRoomSnapshot(code) {
  return get(roomRef(code));
}

export async function writeNewRoom(code) {
  await set(roomRef(code), {
    players: {},
    rolesAssigned: false,
    gameStatus: "lobby",
    createdAt: Date.now(),
  });
}

export function scheduleRoomDeletion(code, delayMs) {
  setTimeout(() => remove(roomRef(code)), delayMs);
}

export function registerDisconnectRemove(code, name) {
  return onDisconnect(playerRef(code, name)).remove();
}

export async function setPlayerWaiting(code, name) {
  await set(playerRef(code, name), "waiting");
}

export async function updateRoomFields(code, fields) {
  await update(roomRef(code), fields);
}

export async function deleteRoom(code) {
  await remove(roomRef(code));
}

export async function deletePlayer(code, name) {
  await remove(playerRef(code, name));
}

export async function cancelPlayerOnDisconnect(code, name) {
  await onDisconnect(playerRef(code, name)).cancel();
}
