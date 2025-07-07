"use client";
import { useState } from "react";
import { TablePanelData } from "@/src/types/database";

interface TablePanelProps {
  table: TablePanelData;
  onJoinAsPlayer: (tableId: string, playerName: string) => void;
  onJoinAsSpectator: (tableId: string) => void;
}

export default function TablePanel({
  table,
  onJoinAsPlayer,
  onJoinAsSpectator
}: TablePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playerName, setPlayerName] = useState("");

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "待機中";
      case "started":
        return "進行中";
      case "completed":
        return "終了";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-green-100 text-green-800";
      case "started":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleJoinAsPlayer = () => {
    if (!playerName.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    onJoinAsPlayer(table.id, playerName);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {table.table_name || `テーブル ${table.id.slice(0, 8)}`}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
            {getStatusText(table.status)}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            プレイヤー: {table.current_players || 0}/{table.max_players || 6}
          </span>
          <span className="text-xs">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div>
              <strong>作成日時:</strong> {formatDate(table.created_at)}
            </div>
            {table.created_by && (
              <div>
                <strong>作成者:</strong> {table.created_by}
              </div>
            )}
            <div>
              <strong>最大プレイヤー数:</strong> {table.max_players || 6}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {table.status === "waiting" && (
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    placeholder="プレイヤー名を入力"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleJoinAsPlayer}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    プレイヤーとして参加
                  </button>
                </div>
              </div>
            )}
            
            <button
              onClick={() => onJoinAsSpectator(table.id)}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              観戦者として参加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}