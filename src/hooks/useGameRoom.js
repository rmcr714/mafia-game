import { useState, useRef, useCallback, useEffect } from "react";
import { onValue, onChildRemoved } from "firebase/database";
import * as rooms from "../api/rooms";
import { assignRolesRandomly } from "../constants/roles";
import { ROOM_TTL_MS, LEAVE_NOTIFICATION_MS, COPY_FEEDBACK_MS } from "../constants/game";
import { generateRoomCode } from "../utils/generateRoomCode";

/**
 * All room / lobby / role-assignment state and Firebase wiring for God + players.
 */
export function useGameRoom() {
  const [screen, setScreen] = useState("home");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("mafia_preferredName") || "");
  const [myName, setMyName] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [players, setPlayers] = useState({});
  const [rolesAssigned, setRolesAssigned] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [assignMode, setAssignMode] = useState("random");
  const [manualAssignments, setManualAssignments] = useState({});
  const [leaveNotif, setLeaveNotif] = useState(null);
  const [roomSize, setRoomSize] = useState(4);
  const [snapshot, setSnapshot] = useState(null);
  const [rejoinPrompt, setRejoinPrompt] = useState(null);
  const [isToastDismissed, setIsToastDismissed] = useState(false);

  const roomUnsubRef = useRef(null);
  const pendingKickRef = useRef(null);

  const detachRoomListeners = useCallback(() => {
    if (roomUnsubRef.current) {
      roomUnsubRef.current();
      roomUnsubRef.current = null;
    }
  }, []);

  const checkSession = useCallback(async () => {
    const sessionStr = localStorage.getItem("mafia_session");
    if (!sessionStr) return;
    try {
      const session = JSON.parse(sessionStr);
      if (Date.now() - session.timestamp > 3600000) {
        localStorage.removeItem("mafia_session");
        return;
      }
      const snap = await rooms.fetchRoomSnapshot(session.roomCode);
      if (snap.exists()) {
        const data = snap.val();
        if (data.gameStatus === "active" && data.rolesAssigned && data.snapshot && data.snapshot[session.playerName]) {
          setIsToastDismissed(false);
          setRejoinPrompt({ roomCode: session.roomCode, playerName: session.playerName });
        } else {
           localStorage.removeItem("mafia_session");
        }
      } else {
        localStorage.removeItem("mafia_session");
      }
    } catch (e) {
      localStorage.removeItem("mafia_session");
    }
  }, []);

  const resetLocal = useCallback(() => {
    detachRoomListeners();
    pendingKickRef.current = null;
    setScreen("home");
    setRoomCode("");
    setInputCode("");
    setPlayerName(localStorage.getItem("mafia_preferredName") || "");
    setMyName("");
    setMyRole(null);
    setPlayers({});
    setRolesAssigned(false);
    setError("");
    setShowEndConfirm(false);
    setManualAssignments({});
    setAssignMode("random");
    setLeaveNotif(null);
    setRoomSize(4);
    setSnapshot(null);
    checkSession();
  }, [detachRoomListeners, checkSession]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const listenRoom = useCallback(
    (code, isGod, joinedPlayerName) => {
      detachRoomListeners();

      const rRef = rooms.roomRef(code);
      const pRef = rooms.playersRef(code);

      let unsubChildRemoved = null;
      if (isGod) {
        unsubChildRemoved = onChildRemoved(pRef, (childSnap) => {
          const leftName = childSnap.key;
          if (pendingKickRef.current === leftName) {
            pendingKickRef.current = null;
            return;
          }
          setLeaveNotif({ name: leftName, wasKicked: false });
          setTimeout(() => setLeaveNotif(null), LEAVE_NOTIFICATION_MS);
        });
      }

      const unsubValue = onValue(rRef, (snap) => {
        if (!snap.exists()) {
          resetLocal();
          return;
        }
        const data = snap.val();
        const p = data.players || {};
        const status = data.gameStatus || "lobby";

        setPlayers(p);
        setRolesAssigned(!!data.rolesAssigned);
        if (data.roomSize) setRoomSize(data.roomSize);
        if (data.snapshot !== undefined) setSnapshot(data.snapshot);
        if (!isGod) {
          if (status === "ended") {
            resetLocal();
            return;
          }
          if (joinedPlayerName && !p[joinedPlayerName]) {
            resetLocal();
            return;
          }
          if (status === "lobby" && !data.rolesAssigned) {
            setMyRole(null);
            setScreen("player");
            return;
          }
          if (data.rolesAssigned && p[joinedPlayerName] && p[joinedPlayerName] !== "waiting") {
            setMyRole(p[joinedPlayerName]);
            setScreen("role");
            localStorage.setItem("mafia_session", JSON.stringify({
              roomCode: code,
              playerName: joinedPlayerName,
              timestamp: Date.now()
            }));
          }
        }
      });

      roomUnsubRef.current = () => {
        unsubValue();
        if (unsubChildRemoved) unsubChildRemoved();
      };
    },
    [detachRoomListeners, resetLocal]
  );

  const createRoom = useCallback(async (size = 4) => {
    const code = generateRoomCode();
    await rooms.writeNewRoom(code, size);
    setRoomCode(code);
    setScreen("god");
    setRoomSize(size);
    listenRoom(code, true);
    rooms.scheduleRoomDeletion(code, ROOM_TTL_MS);
  }, [listenRoom]);

  const joinRoom = useCallback(async () => {
    setError("");
    const code = inputCode.trim().toUpperCase();
    if (!code || !playerName.trim()) {
      setError("Enter both a room code and your name.");
      return;
    }
    const snap = await rooms.fetchRoomSnapshot(code);
    if (!snap.exists()) {
      setError("Room not found. Check the code.");
      return;
    }
    const name = playerName.trim();
    localStorage.setItem("mafia_preferredName", name);
    rooms.registerDisconnectRemove(code, name);
    await rooms.setPlayerWaiting(code, name);
    setRoomCode(code);
    setMyName(name);
    setScreen("player");
    listenRoom(code, false, name);
  }, [inputCode, playerName, listenRoom]);

  const handleAssignRoles = useCallback(async () => {
    if (Object.keys(players).length === 0) return;
    const assignments = assignRolesRandomly(players);
    await rooms.updateRoomFields(roomCode, {
      players: assignments,
      rolesAssigned: true,
      gameStatus: "active",
      snapshot: assignments,
    });
  }, [players, roomCode]);

  const handleManualAssign = useCallback(async () => {
    const names = Object.keys(players);
    const final = { ...manualAssignments };
    names.forEach((n) => {
      if (!final[n]) final[n] = "CITIZEN";
    });
    await rooms.updateRoomFields(roomCode, {
      players: final,
      rolesAssigned: true,
      gameStatus: "active",
      snapshot: final,
    });
  }, [players, manualAssignments, roomCode]);

  const setManualRole = useCallback((player, roleKey) => {
    setManualAssignments((prev) => ({ ...prev, [player]: roleKey }));
  }, []);

  const kickPlayer = useCallback(
    async (name) => {
      pendingKickRef.current = name;
      try {
        await rooms.deletePlayer(roomCode, name);
      } catch (e) {
        pendingKickRef.current = null;
        throw e;
      }
      setManualAssignments((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
      setLeaveNotif({ name, wasKicked: true });
      setTimeout(() => setLeaveNotif(null), LEAVE_NOTIFICATION_MS);
    },
    [roomCode]
  );

  const handleReassign = useCallback(async () => {
    const resetPlayers = {};
    Object.keys(players).forEach((p) => {
      resetPlayers[p] = "waiting";
    });
    setManualAssignments({});
    await rooms.updateRoomFields(roomCode, {
      players: resetPlayers,
      rolesAssigned: false,
      gameStatus: "lobby",
      snapshot: null,
    });
  }, [players, roomCode]);

  const handleEndGame = useCallback(async () => {
    await rooms.updateRoomFields(roomCode, { gameStatus: "ended" });
    await rooms.deleteRoom(roomCode);
    resetLocal();
  }, [roomCode, resetLocal]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [roomCode]);

  const leaveRoom = useCallback(async () => {
    localStorage.removeItem("mafia_session");
    if (myName && roomCode) {
      try {
        await rooms.cancelPlayerOnDisconnect(roomCode, myName);
      } catch (_) {
        /* still remove */
      }
      try {
        await rooms.deletePlayer(roomCode, myName);
      } catch (e) {
        console.warn("Leave room: remove failed", e);
      }
    }
    resetLocal();
  }, [myName, roomCode, resetLocal]);

  const confirmRejoin = useCallback(async () => {
    if (!rejoinPrompt) return;
    const { roomCode: code, playerName: name } = rejoinPrompt;
    setRejoinPrompt(null);
    setIsToastDismissed(false);
    setError("");

    const snap = await rooms.fetchRoomSnapshot(code);
    if (!snap.exists()) {
       localStorage.removeItem("mafia_session");
       setError("Room not found or no longer active.");
       return;
    }
    const data = snap.val();
    if (data.rolesAssigned && data.snapshot && data.snapshot[name]) {
       const role = data.snapshot[name];
       rooms.registerDisconnectRemove(code, name);
       await rooms.updateRoomFields(code, {
         [`players/${name}`]: role
       });
       setRoomCode(code);
       setMyName(name);
       listenRoom(code, false, name);
    } else {
       localStorage.removeItem("mafia_session");
       setError("Rejoin failed. Roles may have been reset.");
    }
  }, [rejoinPrompt, listenRoom]);

  const cancelRejoin = useCallback(() => {
    setIsToastDismissed(true);
  }, []);

  const goToJoin = useCallback(() => setScreen("joining"), []);

  return {
    screen,
    roomCode,
    inputCode,
    setInputCode,
    playerName,
    setPlayerName,
    myName,
    myRole,
    players,
    rolesAssigned,
    error,
    copied,
    showEndConfirm,
    setShowEndConfirm,
    assignMode,
    setAssignMode,
    manualAssignments,
    leaveNotif,
    roomSize,
    snapshot,
    rejoinPrompt,
    isToastDismissed,
    confirmRejoin,
    cancelRejoin,
    createRoom,
    joinRoom,
    handleAssignRoles,
    handleManualAssign,
    setManualRole,
    kickPlayer,
    handleReassign,
    handleEndGame,
    copyCode,
    resetLocal,
    leaveRoom,
    goToJoin,
  };
}
