import React, { useEffect, useState } from "react";
import { fetchGameStarted } from "@/src/hooks/useGame";
import { supabase } from "@/src/utils/supabaseClient";
export default function TurnManager({ gameId, playerId }: { gameId: string, playerId: string }) {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      const isGameStarted = await fetchGameStarted(gameId);
      console.log("isGameStarted", isGameStarted);
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
  }, []);

  useEffect(() => {
    if (!gameId) return;

    console.log("🔄 useTurn: ターン情報を取得開始", gameId);

    const fetchTurn = async () => {
      const { data, error } = await supabase
        .from("game_tables")
        .select("current_turn")
        .eq("id", gameId)
        .single();

      if (error) {
        console.error("ターン取得エラー:", error);
      } else {
        console.log("✅ 初回ターン取得:", data.current_turn);
        setCurrentTurn(data.current_turn);
      }
    };

    fetchTurn();

    console.log("🟢 useTurn: Realtime チャンネルを設定");

    const channel = supabase
      .channel(`game_tables`) // 一意のチャンネル名に変更
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_tables" }, (payload) => {
        console.log("✅ Realtime 更新検知:", payload);
        setCurrentTurn(payload.new.current_turn);
      })
      .subscribe();

    return () => {
      console.log("🛑 useTurn: Realtime チャンネルを解除");
      supabase.removeChannel(channel);
    };
  }, [currentTurn]);
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