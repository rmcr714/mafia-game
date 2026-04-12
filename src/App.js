import { useGameRoom } from "./hooks/useGameRoom";
import { HomeScreen } from "./components/screens/HomeScreen";
import { JoinScreen } from "./components/screens/JoinScreen";
import { GodScreen } from "./components/screens/GodScreen";
import { WaitingScreen } from "./components/screens/WaitingScreen";
import { RoleScreen } from "./components/screens/RoleScreen";
import "./App.css";

export default function App() {
  const game = useGameRoom();

  let content = null;
  if (game.screen === "home") {
    content = <HomeScreen onCreate={game.createRoom} onJoin={game.goToJoin} />;
  } else if (game.screen === "joining") {
    content = (
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
  } else if (game.screen === "god") {
    content = (
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
  } else if (game.screen === "player") {
    content = (
      <WaitingScreen
        name={game.myName}
        roomCode={game.roomCode}
        players={game.players}
        onLeave={game.leaveRoom}
      />
    );
  } else if (game.screen === "role") {
    content = <RoleScreen name={game.myName} roleKey={game.myRole} onLeave={game.leaveRoom} />;
  }

  return (
    <>
      {game.rejoinPrompt && (
        <div className="rejoin-toast-container">
          <div className="rejoin-toast-header">
            <span>🔄</span>
            <span>
              Reconnect to <strong>{game.rejoinPrompt.roomCode}</strong> as <strong>{game.rejoinPrompt.playerName}</strong>?
            </span>
          </div>
          <div className="rejoin-toast-actions">
            <button type="button" className="btn btn-primary" onClick={game.confirmRejoin}>
              Rejoin
            </button>
            <button type="button" className="btn btn-outline" onClick={game.cancelRejoin}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      {content}
    </>
  );
}
