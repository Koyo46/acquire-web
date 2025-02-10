"use client";
import React, { useState } from "react";

export default function Grid() {
  const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル

  // 配置されたタイルのリスト（タイルの位置情報を保持）
  const [placedTiles, setPlacedTiles] = useState<{ col: number; row: string }[]>([]);

  // タイルをクリックしたときの処理
  const handleTileClick = (col: number, row: string) => {
    setPlacedTiles((prev) => {
      const exists = prev.some((tile) => tile.col === col && tile.row === row);

      if (exists) {
        // すでに配置されているなら削除
        return prev.filter((tile) => !(tile.col === col && tile.row === row));
      } else {
        // 新しく配置
        return [...prev, { col, row }];
      }
    });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 border border-gray-300 w-full max-w-screen-md">
      <div className="grid grid-cols-[auto_repeat(12,minmax(2rem,1fr))] gap-1">
        {/* 上部のカラムラベル（空のセル + 1~12） */}
        <div className="w-10 h-10"></div>
        {colLabels.map((col) => (
          <div key={`col-${col}`} className="w-10 h-10 flex items-center justify-center font-bold">
            {col}
          </div>
        ))}
        {/* グリッド本体 */}
        {rowLabels.map((row) => (
          <React.Fragment key={`row-${row}`}>
            {/* 行ラベル */}
            <div className="flex items-center justify-center h-10 font-bold">
              {row}
            </div>

            {/* セル */}
            {colLabels.map((col) => {
              const isSelected = placedTiles.some((tile) => tile.col === col && tile.row === row);

              return (
                <div
                  key={`cell-${col}${row}`}
                  className={`w-10 h-10 flex items-center justify-center border border-gray-400 cursor-pointer ${isSelected ? "bg-blue-400 text-white" : "bg-white hover:bg-gray-200"
                    }`}
                  onClick={() => handleTileClick(col, row)}
                >
                  {col}{row}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
