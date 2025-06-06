"use client";
import { useEffect, useState } from "react";
import Grid from "./Grid";
import StockTable from "./StockTable";
import TurnManager from "./TurnManager";
import PlayerStatus from "./PlayerStatus";
import StockHandler from "./StockHandler";
import { useGame } from "@/src/app/contexts/GameContext";
import { useStockStore } from "@/src/store/stockStore";
import StockPriceTable from "@/src/app/components/StockPriceTable";
import GameLog, { LogEntry } from "@/src/app/components/GameLog";
import { supabase } from "@/src/utils/supabaseClient";

type Player = {
  id: string;
  username: string;
};

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const { mergingHotels } = useGame() || {};
  const updateAll = useStockStore((state) => state.updateAll);
  const isInitialized = useStockStore((state) => state.isInitialized);
  const subscribeToChanges = useStockStore((state) => state.subscribeToChanges);
  
  // ゲームログの状態
  const [gameLogs, setGameLogs] = useState<LogEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    console.log("mergingHotels", mergingHotels);
  }, [mergingHotels]);

  useEffect(() => {
    const initializeData = async () => {
      if (!isInitialized && players.length > 0) {
        const playerObjects: Player[] = players.map(id => ({
          id,
          username: `プレイヤー${id}`
        }));
        await updateAll(gameId, playerObjects);
      }
    };
    initializeData();
  }, [gameId, players, isInitialized, updateAll]);

  useEffect(() => {
    const playerObjects: Player[] = players.map(id => ({
      id,
      username: `プレイヤー${id}`
    }));
    const unsubscribe = subscribeToChanges(gameId, playerObjects);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [gameId, players, subscribeToChanges]);
  
  // ゲームログを取得する関数をより頻繁に呼び出し、デバッグ情報を追加
  const fetchGameLogs = async () => {
    try {
      console.log("ゲームログの取得を試行 - gameId:", gameId);
      const { data, error } = await supabase
        .from('game_logs')
        .select('*')
        .eq('game_id', gameId)
        .order('timestamp', { ascending: false })
        .limit(100);
        
      if (error) {
        console.error('ログ取得エラー:', error);
        return;
      }
      
      if (data) {
        console.log(`ゲームログ ${data.length}件 取得成功:`, data.slice(0, 3)); // 最新3件のみ表示
        const formattedLogs = data.map(log => ({
          id: log.id,
          type: log.log_type,
          message: log.message,
          timestamp: new Date(log.timestamp).getTime(),
          data: log.data
        }));
        
        setGameLogs(formattedLogs);
      }
    } catch (err) {
      console.error('ログ取得中に例外が発生:', err);
    }
  };
  
  // ゲーム開始時にログを取得する部分も修正
  useEffect(() => {
    if (gameId) {
      console.log("GameBoardコンポーネント: ゲームログ監視を開始 - gameId:", gameId);
      // 初回ロード時に取得
      fetchGameLogs();
      
      // 定期的に更新（3秒ごと）
      const interval = setInterval(() => {
        fetchGameLogs();
      }, 3000);
      
      // ゲームログの変更を監視するチャンネルを設定
      const channel = supabase
        .channel('game_logs_changes')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `game_id=eq.${gameId}` }, 
          async (payload) => {
            console.log('新しいログが追加されました:', payload);
            await fetchGameLogs();
          }
        )
        .subscribe();
        
      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [gameId]);

  return (
    <div className="flex flex-row">
      <div className="sticky top-0 h-screen w-[400px]">
        <TurnManager gameId={gameId} playerId={playerId} />
        <StockTable />
        <GameLog 
          gameLogs={gameLogs}
          setShowLogModal={setShowLogModal}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <StockHandler
          gameId={gameId}
          playerId={playerId}
          players={players}
        />
        <Grid 
          gameId={gameId} 
          playerId={playerId} 
          players={players} 
        />
      </div>
      <div className="top-0 h-screen w-[600px]">
        <PlayerStatus />
        <StockPriceTable />
      </div>
      
      {/* ログモーダル */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">ゲームログ履歴</h3>
              <button
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setShowLogModal(false)}
              >
                閉じる
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2 my-4">
              {gameLogs.map(log => {
                // ログタイプに応じた背景色のクラス
                let bgColorClass = "bg-gray-100";
                switch (log.type) {
                  case 'tile_placement':
                    bgColorClass = "bg-blue-100";
                    break;
                  case 'dividend_payment':
                    bgColorClass = "bg-green-100";
                    break;
                  case 'hotel_merge':
                    bgColorClass = "bg-yellow-100";
                    break;
                  case 'stock_purchase':
                    bgColorClass = "bg-purple-100";
                    break;
                  case 'stock_sell':
                    bgColorClass = "bg-red-100";
                    break;
                  case 'hotel_establish':
                    bgColorClass = "bg-indigo-100";
                    break;
                }
                
                return (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded ${bgColorClass}`}
                  >
                    <p className="text-sm font-medium">
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                );
              })}
              
              {gameLogs.length === 0 && (
                <p className="text-center text-gray-500 py-10">ログはまだありません</p>
              )}
            </div>
            
            <button
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              onClick={() => setShowLogModal(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
