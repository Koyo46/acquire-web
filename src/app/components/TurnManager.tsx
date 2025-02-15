"use client";
import React, { useEffect, useState } from "react";
import { useGame } from "@/src/app/contexts/GameContext";
import { supabase } from "@/src/utils/supabaseClient";
export default function TurnManager({ gameId, playerId }: { gameId: string, playerId: string }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const { currentTurn, fetchGameStarted } = useGame() || {};
  useEffect(() => {
    const fetchData = async () => {
      if (fetchGameStarted) {
        const isGameStarted = await fetchGameStarted(gameId);
        setGameStarted(isGameStarted);
      }
    };
    fetchData();

    const channel = supabase
      .channel("game_tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, async () => {
        if (fetchGameStarted) {
          const isGameStarted = await fetchGameStarted(gameId);
          console.log("🔍 ゲームスタートチェック:", isGameStarted);
          setGameStarted(isGameStarted);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    if (gameStarted) {
      setIsMyTurn(currentTurn === playerId);
    }
  }, [gameStarted, currentTurn, playerId]);

  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      {!gameStarted ? (<h3 className="text-lg font-bold">
        ゲーム開始中...
      </h3>

      ) : (
        <>
          <h3 className="text-lg font-bold">
            現在のターン: {isMyTurn ? "あなたのターン" : "相手のターン"}
          </h3>
          {isMyTurn ? (
            <div className="px-4 py-2 bg-green-400 text-white font-bold rounded">
              タイルを配置したら、袋からタイルを補充してターンを終了してね
            </div>
          ) : (
            <p>待機中...</p>
          )}
        </>
      )}
    </div>
  );
}