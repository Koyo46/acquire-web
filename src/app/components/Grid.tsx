"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { tileIdToPosition, positionToTileId } from "@/src/utils/tileUtils";

export default function Grid() {
  const [gameId, setGameId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");

  useEffect(() => {
    const fetchIds = async () => {
      const { data: gameData } = await supabase
        .from("game_tables")
        .select("id")
        .eq("status", "ongoing")
        .single();

      const { data: playerData } = await supabase
        .from("users")
        .select("id")
        .eq("username", "test")
        .single();

      setGameId(gameData?.id);
      setPlayerId(playerData?.id);
    };

    fetchIds();
  }, []);

  const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル
  const [playerHand, setPlayerHand] = useState<{ col: number; row: string }[]>([]);
  const [pendingTile, setPendingTile] = useState<{ col: number; row: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchPlayerHand = async (gameId: string, playerId: string) => {
    const { data, error } = await supabase
      .from("hands")
      .select("tile_id")
      .eq("game_id", gameId)
      .eq("player_id", playerId);

    if (error) {
      console.error("手牌取得エラー:", error);
      return [];
    }

    return data.map(({ tile_id }) => tileIdToPosition(tile_id));
  };

  // 手牌を取得
  useEffect(() => {
    if (!gameId || !playerId) return;

    // 初回ロード時に手牌を取得
    const fetchHand = async () => {
      const hand = await fetchPlayerHand(gameId, playerId);
      setPlayerHand(hand);
    };

    fetchHand();

    const channel = supabase.channel("hands").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "hands"
    }, async (payload) => {
      if (gameId && playerId) { // gameId と playerId が null でないことを確認
        const hand = await fetchPlayerHand(gameId, playerId);
        setPlayerHand(hand);
      }
    }).subscribe();
    return () => {
      supabase.channel("hands").unsubscribe();
    };
  }, [gameId, playerId]);

  // 開発中は自由配置可能
  const [freePlacementMode, setFreePlacementMode] = useState(true);

  // 配置されたタイルのリスト
  const [placedTiles, setPlacedTiles] = useState<{ col: number; row: string }[]>([]);

  // ホテルのリスト
  const [hotels, setHotels] = useState<{
    key: number;
    name: string;
    tiles: { col: number; row: string }[];
    home: { col: number; row: string };
    // stockValue: number; // J-Stock の価格
    // tier: "low" | "medium" | "high";
  }[]>([]);

  const hotelImages: { [key: string]: string } = {
    "空": "/images/sky.jpg",
    "雲": "/images/cloud.png",
    "晴": "/images/sun.png",
    "霧": "/images/fog.png",
    "雷": "/images/thunder.png",
    "嵐": "/images/storm.png",
    "雨": "/images/rain.jpg"
  };

  const hotelColors: { [key: string]: string } = {
    "空": "bg-orange-400",
    "雲": "bg-purple-400",
    "晴": "bg-yellow-400",
    "霧": "bg-indigo-400",
    "雷": "bg-green-400",
    "嵐": "bg-red-400",
    "雨": "bg-blue-400"
  };

  const calculateJStockValue = (tileCount: number, tier: "low" | "medium" | "high") => {
    if (tileCount <= 3) return tier === "low" ? 200 : tier === "medium" ? 300 : 400;
    if (tileCount <= 5) return tier === "low" ? 300 : tier === "medium" ? 400 : 500;
    if (tileCount <= 10) return tier === "low" ? 400 : tier === "medium" ? 500 : 600;
    if (tileCount <= 20) return tier === "low" ? 500 : tier === "medium" ? 600 : 700;
    if (tileCount <= 30) return tier === "low" ? 600 : tier === "medium" ? 700 : 800;
    return tier === "low" ? 800 : tier === "medium" ? 1000 : 1200;
  };

  const dealTiles = async (playerId: string) => {
    // 空いているタイルを取得
    const { data: availableTiles, error } = await supabase
      .from("tiles")
      .select("id")
      .eq("game_id", gameId)
      .eq("placed", false);

    if (error) {
      console.error("タイル取得エラー:", error);
      return;
    }

    for (let i = 0; i < 6; i++) {
      // ランダムに1枚補充を試みる
      let newTile;
      do {
        newTile = availableTiles.sort(() => Math.random() - 0.5)[0];
      } while (!newTile);


      // 手牌に追加
      const { error: insertError } = await supabase
        .from("hands")
        .insert({ game_id: gameId, player_id: playerId, tile_id: newTile.id });

      if (insertError) {
        console.error("手牌追加エラー:", insertError);
      }
    }
  };

  const removeTileFromHand = async (gameId: string, playerId: string, col: number, row: string) => {
    const tileId = positionToTileId(col, row); // タイルの ID に変換

    // 1️⃣ フロントエンドの状態を更新（手牌から削除）
    setPlayerHand(prev => prev.filter(tile => !(tile.col === col && tile.row === row)));

    // 2️⃣ Supabase の `hands` テーブルから該当のタイルを削除
    const { error } = await supabase
      .from("hands")
      .delete()
      .eq("game_id", gameId)
      .eq("player_id", playerId)
      .eq("tile_id", tileId);

    if (error) {
      console.error("手牌削除エラー:", error);
    }
  };

  const drawTilesUntil6 = async (playerId: string) => {
    if (!gameId || !playerId) return;

    // 現在の手牌を取得
    const { data: currentHand, error: handError } = await supabase
      .from("hands")
      .select("tile_id")
      .eq("game_id", gameId)
      .eq("player_id", playerId);

    if (handError) {
      console.error("手牌取得エラー:", handError);
      return;
    }

    const currentCount = currentHand.length;
    const tilesToDraw = 6 - currentCount; // 6枚未満なら補充枚数を決定

    if (tilesToDraw <= 0) return; // すでに6枚持っていたら何もしない

    // 空いているタイルを取得
    const { data: availableTiles, error: tileError } = await supabase
      .from("tiles")
      .select("id")
      .eq("game_id", gameId)
      .eq("placed", false);

    if (tileError) {
      console.error("タイル取得エラー:", tileError);
      return;
    }

    if (!availableTiles || availableTiles.length === 0) {
      console.warn("補充可能なタイルがありません");
      return;
    }

    // ランダムに tilesToDraw 枚補充
    const newTiles = availableTiles.sort(() => Math.random() - 0.5).slice(0, tilesToDraw);

    // Supabase に追加
    const { error: insertError } = await supabase
      .from("hands")
      .insert(newTiles.map(tile => ({
        game_id: gameId,
        player_id: playerId,
        tile_id: tile.id
      })));

    if (insertError) {
      console.error("手牌追加エラー:", insertError);
    }
  };

  const handleTilePlacement = async (col: number, row: string) => {
    if (confirming) return; // 確定待ちのときは配置できない

    setPendingTile({ col, row }); // 配置予定のタイルを保存
    setConfirming(true); // 確定ボタンを表示
  };

  const confirmTilePlacement = async () => {
    if (!pendingTile) return;

    const tileId = positionToTileId(pendingTile.col, pendingTile.row);

    // タイルを盤面に確定
    const { error } = await supabase
      .from("tiles")
      .update({ placed: true })
      .eq("game_id", gameId)
      .eq("id", tileId);

    if (error) {
      console.error("タイル配置エラー:", error);
      return;
    }

    // 手牌を更新（配置したタイルを削除）
    await removeTileFromHand(gameId, playerId, pendingTile.col, pendingTile.row);
    await placeTileOnBoard(gameId, pendingTile.col, pendingTile.row);

    // 手牌を補充

    // 状態をリセット
    setPendingTile(null);
    setConfirming(false);
  };

  const cancelTilePlacement = () => {
    setPendingTile(null);
    setConfirming(false);
  };



  // ホテル選択モーダルの状態
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: string; adjacentTiles: { col: number; row: string }[] } | null>(null);
  const [availableHotels, setAvailableHotels] = useState(["空", "雲", "晴", "霧", "雷", "嵐", "雨"]);
  const [bornNewHotel, setBornNewHotel] = useState(false); // 新しいホテルが誕生したかどうかを保持

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
  const placeTileOnBoard = async (gameId: string, col: number, row: string) => {
    setPlacedTiles((prev) => {
      const exists = prev.some((tile) => tile.col === col && tile.row === row);
      if (exists) return prev;
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
          adjacentPlacedTiles.some((adjTile) => tile.col === adjTile.col && tile.row === adjTile.row)
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
        const hotelsWithMoreThan11Tiles = foundadjacentHotels.filter(hotel => hotel.tiles.length >= 11);
        if (hotelsWithMoreThan11Tiles.length >= 2) {
          // 2つ以上のホテルが11枚以上のタイルで構成されている場合は吸収されない
          // その場にタイルを置けないため、前の状態を返す
          return prev;
        }
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
          home: mergedTiles[0],
        };

        // 合併で消去されたホテルの名前を再度利用可能にする
        foundadjacentHotels.forEach(hotel => {
          if (hotel.name !== largestHotel.name) {
            setAvailableHotels(prev => Array.from(new Set([...prev, hotel.name])));
          }
        });
        // updatedHotelsからfoundadjacentHotelsに含まれるホテルを削除
        // これは、隣接する複数のホテルを合併する際に、合併対象のホテルを一時的に削除するため
        updatedHotels = updatedHotels.filter((hotel) => !foundadjacentHotels.includes(hotel));
        updatedHotels.push(mergedHotel);
      }
      else if (adjacentPlacedTiles.length >= 1) {  // ✅ 隣接タイルが1つでもあれば新しいホテルを作る
        // 2. 既存のホテルがない & 隣接タイルが1つ以上 → 新しいホテルを設立
        setBornNewHotel(true);
        setSelectedTile({ col: col, row: row, adjacentTiles: adjacentPlacedTiles });
      }

      setHotels(updatedHotels);
      return [...prev, newTile];
    });
  };

  // プレイヤーがホテルを選択したときの処理
  const handleHotelSelection = (index: number, hotelName: string) => {
    if (!selectedTile) return;
    const newHotelTiles = [selectedTile, ...selectedTile.adjacentTiles];

    setHotels((prevHotels) => [
      ...prevHotels,
      {
        key: index,
        name: hotelName,
        tiles: newHotelTiles,
        home: newHotelTiles[0],
      },
    ]);
    setBornNewHotel(false);
    setSelectedTile(null);
    setAvailableHotels(availableHotels.filter((hotel) => hotel !== hotelName));
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 border border-gray-300 w-full max-w-screen-md">
      {/* 手牌を配るボタン */}
      <button className="px-4 py-2 bg-blue-300 rounded" onClick={() => dealTiles(playerId)}>
        手牌を配る
      </button>
      {/* グリッド */}
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
            {/* セル */}
            {colLabels.map((col) => {
              const isSelected = placedTiles.some((tile) => tile.col === col && tile.row === row);
              const hotel = hotels.find(h => h.tiles.some(t => t.col === col && t.row === row));
              const home = hotels.find(h => h.home.col === col && h.home.row === row);
              return (
                <div
                  key={`cell-${col}${row}`}
                  className={`w-10 h-10 flex items-center justify-center border border-gray-400 ${bornNewHotel ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${hotel
                      ? hotelColors[hotel.name]
                      : isSelected
                        ? "bg-gray-400"
                        : pendingTile?.col === col && pendingTile?.row === row
                          ? "bg-gray-300 border-2 border-gray-500"
                          : "bg-white hover:bg-gray-200"
                    }`}
                >
                  {hotel && home ? (
                    <img src={hotelImages[hotel.name]} alt={hotel.name} className="w-8 h-8 object-contain" />
                  ) : (
                    `${col}${row}`
                  )}
                </div>
              );
            })}

          </React.Fragment>
        ))}
      </div>
      {/* 確定 & キャンセルボタン */}
      {confirming && pendingTile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">配置を確定しますか？</h3>
            <div className="flex gap-4 justify-end">
              <button
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                onClick={confirmTilePlacement}
              >
                確定する
              </button>
              <button
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={cancelTilePlacement}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 配置されたタイルのリスト */}
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <h3 className="text-lg font-bold">配置されたタイル</h3>
        <ul className="flex flex-wrap gap-2">
          {[...placedTiles]
            .sort((a, b) => a.col - b.col || a.row.localeCompare(b.row))
            .map((tile) => (
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
      {/* ホテル選択モーダル */}
      {bornNewHotel && (
        <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
          <h3 className="text-lg font-bold">ホテルを選択</h3>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {availableHotels.map((hotel, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded ${hotelColors[hotel]}`}
                onClick={() => handleHotelSelection(index, hotel)}
              >
                {hotel}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* 手牌 */}
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <h3 className="text-lg font-bold">手牌</h3>
        <div className="flex justify-between items-center">
          {/* 手牌一覧 */}
          <div className="flex gap-2">
            {playerHand.map((tile, index) => (
              <button key={index} className="w-16 h-16 bg-gray-400 "
                onClick={() => handleTilePlacement(tile.col, tile.row)}>
                {tile.col}{tile.row}
              </button>
            ))}
          </div>

          {/* 補充ボタン（手牌が6枚未満のときのみ表示） */}

          <button
            className="ml-4 px-4 py-2 text-white rounded shadow-md border-2 border-black"
            onClick={() => drawTilesUntil6(playerId)}
            disabled={playerHand.length >= 6}
          >
            <img src="/images/draw.webp" alt="draw" className="w-16 h-16" />
          </button>
        </div>
      </div>

    </div>
  );
}
