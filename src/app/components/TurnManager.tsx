"use client";
import React, { useEffect, useState } from "react";
import { useGame } from "@/src/app/contexts/GameContext";
import { supabase } from "@/src/utils/supabaseClient";

type Player = {
  id: string;
  username: string;
};

export default function TurnManager({ gameId, playerId }: { gameId: string, playerId: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>("");
  const { currentTurn, gameStarted, setGameStarted } = useGame() || {};
  // プレイヤー情報を取得
  useEffect(() => {
    const fetchPlayers = async () => {
      // game_playersからプレイヤーIDを取得
      const { data: gamePlayersData, error: gamePlayersError } = await supabase
        .from("game_players")
        .select("player_id")
        .eq("game_id", gameId);

      if (gamePlayersError) {
        console.error("プレイヤー取得エラー:", gamePlayersError);
        return;
      }

      if (gamePlayersData && gamePlayersData.length > 0) {
        const playerIds = gamePlayersData.map(gp => gp.player_id);
        
        // usersテーブルからユーザー名を取得
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, username")
          .in("id", playerIds);

        if (usersError) {
          console.error("ユーザー情報取得エラー:", usersError);
        } else {
          setPlayers(usersData || []);
        }
      }
    };

    fetchPlayers();
  }, [gameId]);

  // 現在のターンプレイヤーの名前を更新
  useEffect(() => {
    if (currentTurn && players.length > 0) {
      const currentPlayer = players.find(player => player.id === currentTurn);
      setCurrentPlayerName(currentPlayer?.username || "不明なプレイヤー");
    }
  }, [currentTurn, players]);

  // ゲーム状態の監視
  useEffect(() => {
    const fetchGameStatus = async () => {
      const { data, error } = await supabase
        .from("game_tables")
        .select("status, current_turn")
        .eq("id", gameId)
        .single();

      if (error) {
        console.error("ゲーム状態取得エラー:", error);
      } else {
        if (setGameStarted) {
          setGameStarted(data.status === "started");
        }
      }
    };

    fetchGameStatus();

    const channel = supabase
      .channel(`game_tables_turn_manager_${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${gameId}` }, async () => {
        console.log("🔍 ゲーム状態変更検知");
        await fetchGameStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, setGameStarted]);

  const isMyTurn = currentTurn === playerId;

  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      {!gameStarted ? (
        <h3 className="text-lg font-bold">
          ゲーム開始中...
        </h3>
      ) : (
        <>
          <h3 className="text-lg font-bold">
            現在のターン: {currentPlayerName || "読み込み中..."}
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