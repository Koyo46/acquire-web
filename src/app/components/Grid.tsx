"use client";
import React, { useState } from "react";

export default function Grid() {
  const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル

  // 配置されたタイルのリスト
  const [placedTiles, setPlacedTiles] = useState<{ col: number; row: string }[]>([]);

  // ホテルのリスト
  const [hotels, setHotels] = useState<{ key: number; name: string; tiles: { col: number; row: string }[] }[]>([]);

  // 隣接するタイルを取得
  const getAdjacentTiles = (col: number, row: string) => {
    const rowIndex = rowLabels.indexOf(row);
    return [
      { col: col - 1, row }, // 左
      { col: col + 1, row }, // 右
      { col, row: rowLabels[rowIndex - 1] }, // 上
      { col, row: rowLabels[rowIndex + 1] }, // 下
    ].filter(tile => tile.row && tile.col >= 1 && tile.col <= 12); // 無効な座標を除外
  };

  // タイルをクリックしたときの処理
  const handleTileClick = (col: number, row: string) => {
    setPlacedTiles((prev) => {
      const exists = prev.some((tile) => tile.col === col && tile.row === row);

      if (exists) {
        // すでに配置されている → 削除
        return prev.filter((tile) => !(tile.col === col && tile.row === row));
      } else {
        // 新しく配置 → 隣接タイルをチェック
        const newTile = { col, row };
        const adjacentTiles = getAdjacentTiles(col, row);
        const adjacentPlacedTiles = adjacentTiles.filter((tile) =>
          prev.some((t) => t.col === tile.col && t.row === tile.row)
        );

        let updatedHotels = [...hotels];

        // 既存のホテルを検索（新しく配置するタイル + 隣接タイルもチェック）
        const foundadjacentHotels = updatedHotels.filter((hotel) =>
          hotel.tiles.some((tile) =>
            [...adjacentPlacedTiles, newTile].some((adjTile) => tile.col === adjTile.col && tile.row === adjTile.row)
          )
        );

        if (foundadjacentHotels.length === 1) {
          // 既存のホテルが1つ → そのホテルにタイルを追加（重複チェック）
          foundadjacentHotels[0].tiles = Array.from(
            new Set([...foundadjacentHotels[0].tiles, newTile, ...adjacentPlacedTiles].map(tile => `${tile.col}${tile.row}`))
          ).map(tileStr => {
            const [col, row] = [parseInt(tileStr.slice(0, -1)), tileStr.slice(-1)];
            return { col, row };
          });
        } else if (foundadjacentHotels.length > 1) {
          // 2つ以上のホテルが隣接 → 合併処理（重複チェック）
          const mergedTiles = Array.from(
            new Set([newTile, ...adjacentPlacedTiles, ...foundadjacentHotels.flatMap(hotel => hotel.tiles)].map(tile => `${tile.col}${tile.row}`))
          ).map(tileStr => {
            const [col, row] = [parseInt(tileStr.slice(0, -1)), tileStr.slice(-1)];
            return { col, row };
          });

          // 最も大きいホテルの名前を使用
          const largestHotel = foundadjacentHotels.reduce((prev, current) =>
            prev.tiles.length > current.tiles.length ? prev : current
          );
          const mergedHotel = {
            key: largestHotel.key,
            name: largestHotel.name,
            tiles: mergedTiles,
          };

          updatedHotels = updatedHotels.filter((hotel) => !foundadjacentHotels.includes(hotel));
          updatedHotels.push(mergedHotel);
        }
        else if (adjacentPlacedTiles.length >= 1) {  // ✅ 隣接タイルが1つでもあれば新しいホテルを作る
          // 2. 既存のホテルがない & 隣接タイルが1つ以上 → 新しいホテルを設立
          const newHotel = {
            key: Math.max(...updatedHotels.map(h => h.key), 0) + 1,
            name: `Hotel ${Math.max(...updatedHotels.map(h => h.key), 0) + 1}`,
            tiles: [newTile, ...adjacentPlacedTiles],
          };
          updatedHotels.push(newHotel);
        }

        setHotels(updatedHotels);
        return [...prev, newTile];
      }
    });
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 border border-gray-300 w-full max-w-screen-md">
      <div className="grid grid-cols-[auto_repeat(12,minmax(2rem,1fr))] gap-1">
        {/* 上部のカラムラベル */}
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

      {/* 配置されたタイルのリスト */}
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <h3 className="text-lg font-bold">配置されたタイル</h3>
        <ul className="flex flex-wrap gap-2">
          {placedTiles.map((tile) => (
            <li key={`placed-${tile.col}${tile.row}`} className="px-2 py-1 bg-blue-200 rounded">
              {tile.col}{tile.row}
            </li>
          ))}
        </ul>
      </div>

      {/* ホテルのリスト */}
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <h3 className="text-lg font-bold">ホテル一覧</h3>
        <ul>
          {hotels.map((hotel, index) => (
            <li key={`hotel-${index}`} className="mt-2 p-2 bg-yellow-200 rounded">
              {hotel.name}: {hotel.tiles.map(tile => `${tile.col}${tile.row}`).join(", ")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
