import React from "react";
import { useTurn } from "@/src/hooks/useTurn";

export default function TurnManager({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const { currentTurn, endTurn } = useTurn(gameId);

  const nextPlayerId = players[(players.indexOf(currentTurn || "") + 1) % players.length];

  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      <h3 className="text-lg font-bold">
        現在のターン: {currentTurn === playerId ? "あなたのターン" : "相手のターン"}
      </h3>
      {currentTurn === playerId ? (
        <button
          className="px-4 py-2 bg-green-400 text-white rounded"
          onClick={() => endTurn(nextPlayerId)}
        >
          ターンを終了
        </button>
      ) : (
        <p>待機中...</p>
      )}
    </div>
  );
}
