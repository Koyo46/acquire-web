import React from "react";
import { useTurn } from "@/src/hooks/useTurn";

export default function TurnManager({ gameId, playerId }: { gameId: string, playerId: string }) {
  const { currentTurn, endTurn } = useTurn(gameId);
  console.log("currentTurn", currentTurn);
  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      <h3 className="text-lg font-bold">
        現在のターン: {currentTurn === playerId ? "あなたのターン" : "相手のターン"}
      </h3>
      {currentTurn === playerId ? (
        <div
          className="px-4 py-2 bg-green-400 text-white font-bold rounded"
        >
          袋からタイルを補充してターンを終了してね
        </div>
      ) : (
        <p>待機中...</p>
      )}
    </div>
  );
}
