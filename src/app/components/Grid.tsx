"use client";
import React, { useState } from "react";

export default function Grid() {
  const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル

  // タイルの状態を管理する useState
  const [selectedTiles, setSelectedTiles] = useState<{ [key: string]: boolean }>({});

  // タイルをクリックしたときの処理
  const handleTileClick = (tileKey: string) => {
    setSelectedTiles((prev) => ({
      ...prev,
      [tileKey]: !prev[tileKey], // クリックでON/OFFを切り替え
    }));
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
        {rowLabels.map((row, rowIndex) => (
          <React.Fragment key={`row-${row}`}>
            {/* 行ラベル */}
            <div className="flex items-center justify-center h-10 font-bold">
              {row}
            </div>

            {/* セル */}
            {colLabels.map((col) => {
              const tileKey = `${col}${row}`;
              const isSelected = selectedTiles[tileKey] || false;

              return (
                <div
                  key={tileKey}
                  className={`w-10 h-10 flex items-center justify-center border border-gray-400 cursor-pointer ${isSelected ? "bg-blue-400 text-white" : "bg-white hover:bg-gray-200"
                    }`}
                  onClick={() => handleTileClick(tileKey)}
                >
                  {tileKey}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
