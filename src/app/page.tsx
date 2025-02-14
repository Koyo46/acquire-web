"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import GameBoard from "@/src/app/components/GameBoard";
import SelectPlayer from "./selectPlayer/page";
import { useSearchParams } from "next/navigation";
export default function Page() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const playerId = searchParams.get("playerId");
  useEffect(() => {
    const fetchGameData = async () => {
      // 進行中のゲームを取得
      const { data: gameData, error: gameError } = await supabase
        .from("game_tables")
        .select("id")
        .single();

      if (gameError || !gameData) {
        console.error("ゲームの取得エラー:", gameError);
        return;
      }

      setGameId(gameData.id);


      const fetchGamePlayers = async (gameId: string) => {
        const { data, error } = await supabase
          .from("game_players")
          .select("player_id")
          .eq("game_id", gameId);

        if (error) {
          console.error("プレイヤーリスト取得エラー:", error);
          return [];
        }

        return data.map(({ player_id }) => player_id);
      };

      const playerIds = await fetchGamePlayers(gameData.id);
      setPlayers(playerIds);
    };

    fetchGameData();
  }, []);

  return (
    <div>
      <GameBoard gameId={gameId} playerId={playerId} players={players} />
    </div >
  );
}
