import React, { useEffect, useState } from "react";
import { useTurn } from "@/src/hooks/useTurn";
import { fetchGameStarted } from "@/src/hooks/useGame";
import { supabase } from "@/src/utils/supabaseClient";
export default function TurnManager({ gameId, playerId }: { gameId: string, playerId: string }) {
  const { currentTurn, endTurn } = useTurn(gameId);
  const [gameStarted, setGameStarted] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      const isGameStarted = await fetchGameStarted(gameId);
      setGameStarted(isGameStarted);
    };
    fetchData();

    const channel = supabase
      .channel("game_tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, async () => {
        const isGameStarted = await fetchGameStarted(gameId);
        setGameStarted(isGameStarted);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
  console.log("gameStarted", gameStarted);
  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      {!gameStarted ? (<h3 className="text-lg font-bold">
        ゲーム開始中...
      </h3>

      ) : (
        <>
          <h3 className="text-lg font-bold">
            現在のターン: {currentTurn === playerId ? "あなたのターン" : "相手のターン"}
          </h3>
          {currentTurn === playerId ? (
            <div className="px-4 py-2 bg-green-400 text-white font-bold rounded">
              袋からタイルを補充してターンを終了してね
            </div>
          ) : (
            <p>待機中...</p>
          )}
        </>
      )}
    </div>
  );
}