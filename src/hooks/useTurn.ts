import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export const useTurn = (gameId: string) => {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const fetchTurn = async () => {
      const { data, error } = await supabase
        .from("game_tables")
        .select("current_turn")
        .eq("id", gameId)
        .single();

      if (error) console.error("ターン取得エラー:", error);
      else setCurrentTurn(data.current_turn);
    };

    fetchTurn();

    const channel = supabase
      .channel("game_tables")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_tables" }, (payload) => {
        setCurrentTurn(payload.new.current_turn);
        fetchTurn();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const endTurn = async (nextPlayerId: string) => {
    const { data, error } = await supabase
      .from("game_tables")
      .update({ current_turn: nextPlayerId })
      .eq("id", gameId);
    if (error) console.error("ターン更新エラー:", error);
  };

  return { currentTurn, endTurn };
};
