"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/utils/supabaseClient";
import TablePanel from "@/src/app/components/TablePanel";
import CreateTableModal from "@/src/app/components/CreateTableModal";
import { TablePanelData } from "@/src/types/database";

export default function TablesPage() {
  const [tables, setTables] = useState<TablePanelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from("game_tables")
        .select(`
          id,
          status,
          table_name,
          max_players,
          created_at,
          created_by,
          game_players(count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("テーブル取得エラー:", error);
        return;
      }

      const tablesWithPlayerCount = data?.map((table: any) => ({
        ...table,
        current_players: table.game_players?.length || 0
      })) || [];

      setTables(tablesWithPlayerCount);
    } catch (error) {
      console.error("テーブル取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAsPlayer = async (tableId: string, playerName: string) => {
    try {
      // ユーザーを作成
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ username: playerName })
        .select("id")
        .single();

      if (insertError) {
        console.error("ユーザー作成エラー:", insertError);
        alert("ユーザー作成に失敗しました");
        return;
      }

      // game_playersテーブルに追加
      const { error: joinError } = await supabase
        .from("game_players")
        .insert({
          game_id: tableId,
          player_id: newUser.id
        });

      if (joinError) {
        console.error("テーブル参加エラー:", joinError);
        alert("テーブル参加に失敗しました");
        return;
      }

      // ゲームページに遷移
      router.push(`/?playerId=${newUser.id}`);
    } catch (error) {
      console.error("参加処理エラー:", error);
      alert("参加処理に失敗しました");
    }
  };

  const handleJoinAsSpectator = async (tableId: string) => {
    // 観戦者として参加（playerId無しでゲーム画面に遷移）
    router.push(`/?gameId=${tableId}&spectator=true`);
  };

  const handleCreateTable = async (tableName: string, maxPlayers: number) => {
    try {
      const { data, error } = await supabase
        .from("game_tables")
        .insert({
          table_name: tableName,
          max_players: maxPlayers,
          status: "waiting"
        })
        .select("id")
        .single();

      if (error) {
        console.error("テーブル作成エラー:", error);
        alert("テーブル作成に失敗しました");
        return;
      }

      setShowCreateModal(false);
      fetchTables(); // テーブル一覧を更新
    } catch (error) {
      console.error("テーブル作成エラー:", error);
      alert("テーブル作成に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">テーブル一覧</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            新規テーブル作成
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">現在利用可能なテーブルはありません</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              最初のテーブルを作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <TablePanel
                key={table.id}
                table={table}
                onJoinAsPlayer={handleJoinAsPlayer}
                onJoinAsSpectator={handleJoinAsSpectator}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTableModal
          onClose={() => setShowCreateModal(false)}
          onCreateTable={handleCreateTable}
        />
      )}
    </div>
  );
}