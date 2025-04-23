"use client";
import Grid from "./Grid";
import StockTable from "./StockTable";
import TurnManager from "./TurnManager";
import PlayerStatus from "./PlayerStatus";
import StockHandler from "./StockHandler";
import { useGame } from "@/src/app/contexts/GameContext";
import { useEffect } from "react";
import { useStockStore } from "@/src/store/stockStore";
import StockPriceTable from "@/src/app/components/StockPriceTable";

type Player = {
  id: string;
  username: string;
};

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const { mergingHotels } = useGame() || {};
  const updateAll = useStockStore((state) => state.updateAll);
  const isInitialized = useStockStore((state) => state.isInitialized);
  const subscribeToChanges = useStockStore((state) => state.subscribeToChanges);

  useEffect(() => {
    console.log("mergingHotels", mergingHotels);
  }, [mergingHotels]);

  useEffect(() => {
    const initializeData = async () => {
      if (!isInitialized && players.length > 0) {
        const playerObjects: Player[] = players.map(id => ({
          id,
          username: `プレイヤー${id}`
        }));
        await updateAll(gameId, playerObjects);
      }
    };
    initializeData();
  }, [gameId, players, isInitialized, updateAll]);

  useEffect(() => {
    const playerObjects: Player[] = players.map(id => ({
      id,
      username: `プレイヤー${id}`
    }));
    const unsubscribe = subscribeToChanges(gameId, playerObjects);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [gameId, players, subscribeToChanges]);

  return (
    <div className="flex flex-row">
      <div className="sticky top-0 h-screen w-[400px]">
        <TurnManager gameId={gameId} playerId={playerId} />
        <StockTable />
      </div>
      <div className="flex-1 overflow-y-auto">
        <StockHandler
          gameId={gameId}
          playerId={playerId}
          players={players}
        />
        <Grid gameId={gameId} playerId={playerId} players={players} />
      </div>
      <div className="top-0 h-screen w-[600px]">
        <PlayerStatus />
        <StockPriceTable />
      </div>
    </div>
  );
}
