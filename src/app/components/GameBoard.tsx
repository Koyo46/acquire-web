"use client";
import Grid from "./Grid";
import TurnManager from "./TurnManager";
import { GameProvider } from "@/src/app/contexts/GameContext";
// import HotelList from "./HotelList";
// import PlayerHand from "./PlayerHand";

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {

  return (
    <GameProvider gameId={gameId}>
      <div className="flex flex-row">
        <div className="w-1/4">
          <TurnManager gameId={gameId} playerId={playerId} />
        </div>
        <div className="w-3/4">
          <Grid gameId={gameId} playerId={playerId} players={players} />
        </div>
      </div>
    </GameProvider>
  );
}