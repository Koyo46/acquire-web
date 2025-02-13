"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import GameBoard from "@/src/app/components/GameBoard";

export default function Page() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    const fetchGameData = async () => {
      // 進行中のゲームを取得
      const { data: gameData, error: gameError } = await supabase
        .from("game_tables")
        .select("id")
        .eq("status", "ongoing")
        .single();

      if (gameError || !gameData) {
        console.error("ゲームの取得エラー:", gameError);
        return;
      }

      setGameId(gameData.id);

      // ユーザーを仮で取得（将来的にはログイン機能と連携）
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("username", "test") // 仮のユーザー
        .single();

      if (userError || !userData) {
        console.error("ユーザーの取得エラー:", userError);
        return;
      }

      setPlayerId(userData.id);

      // ゲームに参加しているプレイヤー一覧を取得
      const { data: playerData, error: playerError } = await supabase
        .from("hands")
        .select("player_id")
        .eq("game_id", gameData.id);

      if (playerError) {
        console.error("プレイヤーリスト取得エラー:", playerError);
        return;
      }

      const playerIds = [...new Set(playerData.map(p => p.player_id))];
      setPlayers(playerIds);
    };

    fetchGameData();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      {gameId && playerId ? (
        <GameBoard gameId={gameId} playerId={playerId} players={players} />
      ) : (
        <p className="text-gray-500">ゲームデータを読み込んでいます...</p>
      )}
    </div>
  );
}
