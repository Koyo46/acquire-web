import React, { useMemo } from 'react';

// LogEntryインターフェースを追加・エクスポート
export interface LogEntry {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface GameLogProps {
  gameLogs: LogEntry[];
  setShowLogModal: (show: boolean) => void;
}

// defaultエクスポートに変更
const GameLog: React.FC<GameLogProps> = ({ gameLogs, setShowLogModal }) => {
  
  // 最新の20件のみ表示
  const displayLogs = useMemo(() => {
    return gameLogs.slice(0, 20);
  }, [gameLogs]);

  if (!displayLogs || displayLogs.length === 0) {
    return (
      <div className="game-log bg-gray-800 p-4 rounded-lg mt-4 text-white h-64 overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">ゲームログ</h3>
        <p className="text-gray-400 italic">まだログはありません</p>
        <button 
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
          onClick={() => setShowLogModal(true)}
        >
          全履歴を表示
        </button>
      </div>
    );
  }

  return (
    <div className="game-log bg-gray-800 p-4 rounded-lg mt-4 text-white h-64 overflow-y-auto">
      <h3 className="text-xl font-bold mb-2">ゲームログ</h3>
      <button 
        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
        onClick={() => setShowLogModal(true)}
      >
        全履歴を表示
      </button>
      <ul className="space-y-2">
        {displayLogs.map((log) => {
          // 日本時間でフォーマット（標準的な方法）
          const timeStr = new Date(log.timestamp).toLocaleTimeString('ja-JP', {
            hour12: false
          });
          
          // ログタイプに応じた色を指定
          let logColorClass = "text-white";
          switch (log.type) {
            case 'tile_placement':
              logColorClass = "text-yellow-300";
              break;
            case 'stock_purchase':
              logColorClass = "text-green-400";
              break;
            case 'hotel_establish':
              logColorClass = "text-blue-400";
              break;
            case 'hotel_merge':
              logColorClass = "text-purple-400";
              break;
            case 'dividend_payment':
              logColorClass = "text-pink-400";
              break;
            case 'stock_sell':
              logColorClass = "text-orange-400";
              break;
            default:
              logColorClass = "text-gray-300";
          }
          
          return (
            <li key={log.id} className={`${logColorClass} text-sm`}>
              <span className="text-gray-400 mr-2">[{timeStr}]</span>
              {log.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GameLog; 