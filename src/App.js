import { useGameRoom } from "./hooks/useGameRoom";
import { HomeScreen } from "./components/screens/HomeScreen";
import { JoinScreen } from "./components/screens/JoinScreen";
import { GodScreen } from "./components/screens/GodScreen";
import { WaitingScreen } from "./components/screens/WaitingScreen";
import { RoleScreen } from "./components/screens/RoleScreen";
import "./App.css";

export default function App() {
  const game = useGameRoom();

  if (game.screen === "home") {
    return <HomeScreen onCreate={game.createRoom} onJoin={game.goToJoin} />;
  }
  if (game.screen === "joining") {
    return (
      <JoinScreen
        inputCode={game.inputCode}
        setInputCode={game.setInputCode}
        playerName={game.playerName}
        setPlayerName={game.setPlayerName}
        onJoin={game.joinRoom}
        error={game.error}
        onBack={game.resetLocal}
      />
    );
  }
  if (game.screen === "god") {
    return (
      <GodScreen
        roomCode={game.roomCode}
        roomSize={game.roomSize}
        snapshot={game.snapshot}
        players={game.players}
        rolesAssigned={game.rolesAssigned}
        assignMode={game.assignMode}
        setAssignMode={game.setAssignMode}
        manualAssignments={game.manualAssignments}
        setManualRole={game.setManualRole}
        onAssign={game.handleAssignRoles}
        onManualAssign={game.handleManualAssign}
        onReassign={game.handleReassign}
        onEndGame={game.handleEndGame}
        onKick={game.kickPlayer}
        leaveNotif={game.leaveNotif}
        showEndConfirm={game.showEndConfirm}
        setShowEndConfirm={game.setShowEndConfirm}
        onCopy={game.copyCode}
        copied={game.copied}
      />
    );
  }
  if (game.screen === "player") {
    return (
      <WaitingScreen
        name={game.myName}
        roomCode={game.roomCode}
        players={game.players}
        onLeave={game.leaveRoom}
      />
    );
  }
  if (game.screen === "role") {
    return <RoleScreen name={game.myName} roleKey={game.myRole} onLeave={game.leaveRoom} />;
  }
  return null;
}
