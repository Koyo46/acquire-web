"use client";
import Grid from "./Grid";
import StockTable from "./StockTable";
import TurnManager from "./TurnManager";
import { GameProvider } from "@/src/app/contexts/GameContext";
import PlayerStatus from "./PlayerStatus";
// import HotelList from "./HotelList";
// import PlayerHand from "./PlayerHand";

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {

  return (
    <GameProvider gameId={gameId}>
      <div className="flex flex-row">
        <div className="sticky top-0 h-screen w-[400px]">
          <TurnManager gameId={gameId} playerId={playerId} />
          <StockTable gameId={gameId} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Grid gameId={gameId} playerId={playerId} players={players} />
        </div>
        <div className="sticky top-0 h-screen w-[600px]">
          <PlayerStatus gameId={gameId} players={players} />
        </div>
      </div>
    </GameProvider>
  );
}