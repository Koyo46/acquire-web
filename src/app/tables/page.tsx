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
      // 既存カラムのみを使用
      const { data: tablesData, error } = await supabase
        .from("game_tables")
        .select("id, status, current_turn")
        .order("id", { ascending: false });

      if (error) {
        console.error("テーブル取得エラー:", error);
        return;
      }

      // 各テーブルのプレイヤー情報を取得
      const tablesWithPlayerInfo = await Promise.all(
        (tablesData || []).map(async (table: any) => {
          const { data: gamePlayersData, error: gamePlayersError } = await supabase
            .from("game_players")
            .select("player_id")
            .eq("game_id", table.id);

          if (gamePlayersError) {
            console.error("プレイヤー数取得エラー:", gamePlayersError);
          }

          // プレイヤーの詳細情報を取得
          const players = [];
          if (gamePlayersData && gamePlayersData.length > 0) {
            const playerIds = gamePlayersData.map(gp => gp.player_id);
            const { data: usersData, error: usersError } = await supabase
              .from("users")
              .select("id, username")
              .in("id", playerIds);

            if (usersError) {
              console.error("ユーザー情報取得エラー:", usersError);
            } else {
              players.push(...(usersData || []));
            }
          }

          return {
            ...table,
            table_name: `テーブル ${table.id.slice(0, 8)}`, // IDの最初の8文字をテーブル名として使用
            max_players: 6, // デフォルト値
            created_at: new Date().toISOString(), // 仮の作成日時
            current_players: players.length,
            players: players
          };
        })
      );

      setTables(tablesWithPlayerInfo);
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

      // ゲームページに自動入室
      router.push(`/game?gameId=${tableId}&playerId=${newUser.id}`);
    } catch (error) {
      console.error("参加処理エラー:", error);
      alert("参加処理に失敗しました");
    }
  };

  const handleJoinAsSpectator = async (tableId: string) => {
    // 観戦者として参加（playerId無しでゲーム画面に遷移）
    router.push(`/game?gameId=${tableId}&spectator=true`);
  };

  const handleJoinAsExistingUser = async (tableId: string, userId: string) => {
    // 既存ユーザーとしてゲーム画面に遷移
    router.push(`/game?gameId=${tableId}&playerId=${userId}`);
  };

  const handleDeleteTable = async (tableId: string) => {
    const confirmDelete = confirm("このテーブルを削除しますか？関連するデータも全て削除されます。");
    if (!confirmDelete) return;

    try {
      // 関連データを削除（順番が重要：外部キー制約により）
      // 1. game_logs
      const { error: logsError } = await supabase
        .from("game_logs")
        .delete()
        .eq("game_id", tableId);

      if (logsError) {
        console.error("ゲームログ削除エラー:", logsError);
      }

      // 2. hotel_investors
      const { error: investorsError } = await supabase
        .from("hotel_investors")
        .delete()
        .eq("game_id", tableId);

      if (investorsError) {
        console.error("投資家データ削除エラー:", investorsError);
      }

      // 3. hotels
      const { error: hotelsError } = await supabase
        .from("hotels")
        .delete()
        .eq("game_id", tableId);

      if (hotelsError) {
        console.error("ホテルデータ削除エラー:", hotelsError);
      }

      // 4. hands
      const { error: handsError } = await supabase
        .from("hands")
        .delete()
        .eq("game_id", tableId);

      if (handsError) {
        console.error("手牌データ削除エラー:", handsError);
      }

      // 5. tiles
      const { error: tilesError } = await supabase
        .from("tiles")
        .delete()
        .eq("game_id", tableId);

      if (tilesError) {
        console.error("タイルデータ削除エラー:", tilesError);
      }

      // 6. game_players
      const { error: gamePlayersError } = await supabase
        .from("game_players")
        .delete()
        .eq("game_id", tableId);

      if (gamePlayersError) {
        console.error("ゲームプレイヤーデータ削除エラー:", gamePlayersError);
      }

      // 7. usersテーブルからこのゲームのプレイヤーを削除
      const { error: usersError } = await supabase
        .from("users")
        .delete()
        .eq("game_id", tableId);

      if (usersError) {
        console.error("ユーザーデータ削除エラー:", usersError);
      }

      // 8. 最後にgame_tablesを削除
      const { error: tableError } = await supabase
        .from("game_tables")
        .delete()
        .eq("id", tableId);

      if (tableError) {
        console.error("テーブル削除エラー:", tableError);
        alert("テーブル削除に失敗しました");
        return;
      }

      fetchTables(); // テーブル一覧を更新
      alert("テーブルを削除しました");
    } catch (error) {
      console.error("削除処理エラー:", error);
      alert("削除処理に失敗しました");
    }
  };

  const handleCreateTable = async (tableName: string, _maxPlayers: number) => {
    try {
      // UUIDを生成
      const gameId = crypto.randomUUID();

      // 既存のスキーマに合わせてテーブルを作成
      const { data, error } = await supabase
        .from("game_tables")
        .insert({
          id: gameId,
          status: "ongoing"
          // 現在のスキーマではtable_nameとmax_playersカラムがないため、statusのみ設定
          // "ongoing": ゲーム進行中, "started": ゲーム開始済み
        })
        .select("id")
        .single();

      if (error) {
        console.error("テーブル作成エラー:", error);
        alert("テーブル作成に失敗しました");
        return;
      }

      // 108枚のタイルを作成
      const tiles = Array.from({ length: 108 }, (_, index) => ({
        game_id: data.id,
        tile_kind: index + 1,
        placed: false,
        dealed: false
      }));

      const { error: tilesError } = await supabase
        .from("tiles")
        .insert(tiles);

      if (tilesError) {
        console.error("タイル作成エラー:", tilesError);
        alert("タイル作成に失敗しました");
        return;
      }

      setShowCreateModal(false);
      fetchTables(); // テーブル一覧を更新
      alert(`テーブル「${tableName}」を作成しました（ID: ${data.id.slice(0, 8)}）`);
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
                onJoinAsExistingUser={handleJoinAsExistingUser}
                onDeleteTable={handleDeleteTable}
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