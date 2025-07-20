"use client";
import { useState } from "react";

interface CreateTableModalProps {
  onClose: () => void;
  onCreateTable: (tableName: string, maxPlayers: number) => void;
}

export default function CreateTableModal({
  onClose,
  onCreateTable
}: CreateTableModalProps) {
  const [tableName, setTableName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableName.trim()) {
      alert("テーブル名を入力してください");
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 6) {
      alert("最大プレイヤー数は2-6人の間で設定してください");
      return;
    }

    onCreateTable(tableName.trim(), maxPlayers);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">新規テーブル作成</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tableName" className="block text-sm font-medium text-gray-700 mb-2">
              テーブル名
            </label>
            <input
              type="text"
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="テーブル名を入力"
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
              最大プレイヤー数
            </label>
            <select
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2}>2人</option>
              <option value={3}>3人</option>
              <option value={4}>4人</option>
              <option value={5}>5人</option>
              <option value={6}>6人</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}