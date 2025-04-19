"use client";
import Grid from "./Grid";
import StockTable from "./StockTable";
import TurnManager from "./TurnManager";
import PlayerStatus from "./PlayerStatus";
import StockHandler from "./StockHandler";
import { useGame } from "@/src/app/contexts/GameContext";
import { useEffect } from "react";
// import HotelList from "./HotelList";
// import PlayerHand from "./PlayerHand";

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const { mergingHotels } = useGame() || {};
  useEffect(() => {
    console.log("mergingHotels", mergingHotels);
  }, [mergingHotels]);
  return (
    <div className="flex flex-row">
      <div className="sticky top-0 h-screen w-[400px]">
        <TurnManager gameId={gameId} playerId={playerId} />
        <StockTable gameId={gameId} players={players} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {mergingHotels && (
          <StockHandler
            gameId={gameId}
            playerId={playerId}
            players={players}
          />
        )}
        <Grid gameId={gameId} playerId={playerId} players={players} />
      </div>
      <div className="sticky top-0 h-screen w-[600px]">
        <PlayerStatus gameId={gameId} players={players} />
      </div>
    </div>
  );
}
