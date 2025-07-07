"use client";
import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import GameBoard from "@/src/app/components/GameBoard";
import { useSearchParams, useRouter } from "next/navigation";
import { GameProvider } from "@/src/app/contexts/GameContext";

export default function Page() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameProvider gameId={gameId!}>
        <PageContent setGameId={setGameId} setPlayers={setPlayers} setPlayerId={setPlayerId} />
        {gameId && playerId && (
          <GameBoard gameId={gameId} playerId={playerId} players={players} />
        )}
      </GameProvider>
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
  const router = useRouter();
  const playerId = searchParams.get("playerId");
  const gameId = searchParams.get("gameId");
  const isSpectator = searchParams.get("spectator") === "true";

  useEffect(() => {
    // プレイヤーIDまたはゲームIDが指定されていない場合、テーブル一覧に遷移
    if (!playerId && !gameId) {
      router.push("/tables");
      return;
    }

    const fetchGameData = async () => {
      let targetGameId = gameId;
      
      if (!targetGameId) {
        // 進行中のゲームを取得
        const { data: gameData, error: gameError } = await supabase
          .from("game_tables")
          .select("id")
          .single();

        if (gameError || !gameData) {
          console.error("ゲームの取得エラー:", gameError);
          router.push("/tables");
          return;
        }
        targetGameId = gameData.id;
      }

      setGameId(targetGameId);

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

      const playerIds = await fetchGamePlayers(targetGameId);
      setPlayers(playerIds);
    };

    fetchGameData();
  }, [setGameId, setPlayers, router, playerId, gameId]);

  useEffect(() => {
    setPlayerId(playerId);
  }, [playerId, setPlayerId]);

  return null;
}
