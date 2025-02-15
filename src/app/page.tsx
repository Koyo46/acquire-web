"use client";
import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import GameBoard from "@/src/app/components/GameBoard";
import { useSearchParams } from "next/navigation";

export default function Page() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent setGameId={setGameId} setPlayers={setPlayers} setPlayerId={setPlayerId} />
      {gameId && playerId && (
        <GameBoard gameId={gameId} playerId={playerId} players={players} />
      )}
    </Suspense>
  );
}

function PageContent({
  setGameId,
  setPlayers,
  setPlayerId,
}: {
  setGameId: React.Dispatch<React.SetStateAction<string | null>>;
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
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
  }, [setGameId, setPlayers]);

  useEffect(() => {
    setPlayerId(playerId);
  }, [playerId, setPlayerId]);

  return null;
}
