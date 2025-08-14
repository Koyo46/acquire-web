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
        <GamePageContent players={players} setGameId={setGameId} setPlayers={setPlayers} setPlayerId={setPlayerId} />
        {gameId && (
          <GameBoard gameId={gameId} playerId={playerId || ""} players={players} />
        )}
      </GameProvider>
    </Suspense>
  );
}

function GamePageContent({
  players,
  setGameId,
  setPlayers,
  setPlayerId,
}: {
  players: string[];
  setGameId: React.Dispatch<React.SetStateAction<string | null>>;
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get("gameId");
  const playerId = searchParams.get("playerId");
  // const isSpectator = searchParams.get("spectator") === "true";

  useEffect(() => {
    // ゲームIDが指定されていない場合、テーブル一覧に遷移
    if (!gameId) {
      router.push("/tables");
      return;
    }

    const fetchGameData = async () => {
      // 指定されたゲームIDのゲーム情報を取得
      const { data: gameData, error: gameError } = await supabase
        .from("game_tables")
        .select("id, status")
        .eq("id", gameId)
        .single();

      if (gameError || !gameData) {
        console.error("ゲームの取得エラー:", gameError);
        alert("指定されたゲームが見つかりません");
        router.push("/tables");
        return;
      }

      setGameId(gameData.id);

      // プレイヤー一覧を取得
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

    // game_playersテーブルの変更を監視
    const channel = supabase
      .channel(`game_players_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        async () => {
          console.log('game_players テーブル変更検知 - game/page.tsx');
          // プレイヤーリストを再取得
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

          const updatedPlayerIds = await fetchGamePlayers(gameId);
          console.log('プレイヤーリスト更新:', { 前: players || [], 後: updatedPlayerIds });
          setPlayers(updatedPlayerIds);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setGameId, setPlayers, router, gameId, players]);

  useEffect(() => {
    // プレイヤーIDが指定されている場合はそのIDを設定
    // 指定されていない場合は観戦者モード（playerId = null）
    setPlayerId(playerId);
  }, [playerId, setPlayerId]);

  return null;
}
