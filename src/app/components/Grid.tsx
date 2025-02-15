"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import { tileKindToPosition, positionToTileKind, tileIdToPosition, positionToTileId } from "@/src/utils/tileUtils";
import { useGame } from "@/src/app/contexts/GameContext";
import { getStockPriceByHotelName } from "@/src/utils/hotelStockBoard";
export default function Grid({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {

  // const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル
  const [playerHand, setPlayerHand] = useState<number[]>([]);
  const [pendingTile, setPendingTile] = useState<{ col: number; row: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { currentTurn, endTurn, fetchGameStarted } = useGame() || {};
  const [gameStarted, setGameStarted] = useState(false);
  const nextPlayerId = players[(players.indexOf(currentTurn || "") + 1) % players.length];
  const [putTile, setPutTile] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(currentTurn === playerId);
  // 配置されたタイルのリスト
  const [placedTiles, setPlacedTiles] = useState<{ col: number; row: string }[]>([]);
  // 開発中は自由配置可能
  const [freePlacementMode, setFreePlacementMode] = useState(false);
  const [stocksBoughtThisTurn, setStocksBoughtThisTurn] = useState(0);
  useEffect(() => {
    const fetchData = async () => {
      if (fetchGameStarted) {
        const isGameStarted = await fetchGameStarted(gameId);
        setGameStarted(isGameStarted);
      }
    };
    fetchData();

    const channel = supabase
      .channel("game_tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, async () => {
        if (fetchGameStarted) {
          const isGameStarted = await fetchGameStarted(gameId);
          console.log("🔍 ゲームスタートチェック:", isGameStarted);
          setGameStarted(isGameStarted);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);
  const fetchTileKindById = async (gameId: string, tileId: number) => {
    const { data, error } = await supabase
      .from("tiles")
      .select("tile_kind")
      .eq("game_id", gameId)
      .eq("id", tileId)
      .single(); // `tile_id` は一意なので `.single()` を使用

    if (error || !data) {
      console.error("tile_kind 取得エラー:", error);
      return null;
    }

    return data.tile_kind; // `tile_kind` を返す
  };

  //placedTilesを更新
  useEffect(() => {
    const fetchData = async () => {
      const tiles = await fetchTilesStatus();
      const placedTiles = tiles.filter(tile => tile.placed === true);
      const positions = await Promise.all(placedTiles.map(async tile => {
        const position = await tileIdToPosition(tile.id, gameId);
        if (position) {
          const { col, row } = position;
          return { col, row };
        }
        return null; // 位置が取得できない場合は null を返す
      }));
      // null を除外
      const validPositions = positions.filter(position => position !== null);
      setPlacedTiles(validPositions);
    };
    fetchData();

    const channel = supabase
      .channel("tiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "tiles" }, async () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const fetchPlayerHand = async (gameId: string, playerId: string) => {
    const { data, error } = await supabase
      .from("hands")
      .select("tile_id") // `tiles` テーブルから `tile_kind` を取得
      .eq("game_id", gameId)
      .eq("player_id", playerId);

    if (error) {
      console.error("手牌取得エラー:", error);
      return [];
    }

    //idからKindを取得
    const handKind = await Promise.all(data.map(tile => fetchTileKindById(gameId, tile.tile_id)));

    return handKind;
  };

  // 手牌を取得
  useEffect(() => {
    if (!gameId || !playerId) return;

    const fetchData = async () => {
      const hand = await fetchPlayerHand(gameId, playerId);
      setPlayerHand(hand);
    };

    fetchData(); // 初回ロード

    const channel = supabase
      .channel("hands")
      .on("postgres_changes", { event: "*", schema: "public", table: "hands" }, async () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerId]);

  const fetchTilesStatus = async () => {
    const { data, error } = await supabase
      .from("tiles")
      .select("id, placed, dealed")
      .eq("game_id", gameId);

    if (error) {
      console.error("タイルステータス取得エラー:", error);
      return [];
    }
    return data;
  }

  useEffect(() => {
    if (!gameId) return;
    if (currentTurn === playerId) {
      setIsMyTurn(true);
    }
  }, [currentTurn]);

  useEffect(() => {
    if (!gameId) return;
    const fetchData = async () => {
      const { data, error } = await supabase.from("hotels").select("id, hotel_name, tile_ids, hotel_home_tile_id").eq("game_id", gameId);
      if (error) {
        console.error("ホテル情報取得エラー:", error);
        return;
      }
      const formattedHotels = await Promise.all(data.map(async hotel => ({
        id: hotel.id,
        name: hotel.hotel_name,
        tiles: await Promise.all(hotel.tile_ids.map((tileId: string) => tileIdToPosition(tileId, gameId))),
        home: (await tileIdToPosition(hotel.hotel_home_tile_id, gameId)) || { col: 0, row: "" } // null の場合のデフォルト値
      })));

      setEstablishedHotels(formattedHotels);
    };
    fetchData();

    const channel = supabase
      .channel("hotels")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, async () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTurn]);

  useEffect(() => {
    if (!gameId) return;

    const fetchHotels = async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, hotel_name, tile_ids, hotel_home_tile_id")
        .eq("game_id", gameId);

      if (error) {
        console.error("ホテル情報取得エラー:", error);
        return;
      }

      const formattedHotels = await Promise.all(data.map(async hotel => ({
        id: hotel.id,
        name: hotel.hotel_name,
        tiles: await Promise.all(hotel.tile_ids.map((tileId: string) => tileIdToPosition(tileId, gameId))),
        home: (await tileIdToPosition(hotel.hotel_home_tile_id, gameId)) || { col: 0, row: "" } // null の場合のデフォルト値
      })));

      setEstablishedHotels(formattedHotels);
    };

    fetchHotels();
  }, [gameId]);

  // ホテルのリスト
  const [establishedHotels, setEstablishedHotels] = useState<{
    id: number;
    name: string;
    tiles: { col: number; row: string }[];
    home: { col: number; row: string };
    // stockValue: number; // J-Stock の価格
    // tier: "low" | "medium" | "high";
  }[]>([]);

  const allHotels = ["空", "雲", "晴", "霧", "雷", "嵐", "雨"]; // すべてのホテル名

  const completeHotelList = useMemo(() => {
    const existingHotels = establishedHotels.reduce((acc, hotel) => {
      acc[hotel.name] = hotel.tiles.length;
      return acc;
    }, {} as { [key: string]: number });

    return allHotels.map(name => ({
      name,
      tiles: existingHotels[name] || 0,
    }));
  }, [establishedHotels]);


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

  // const calculateJStockValue = (tileCount: number, tier: "low" | "medium" | "high") => {
  //   if (tileCount <= 3) return tier === "low" ? 200 : tier === "medium" ? 300 : 400;
  //   if (tileCount <= 5) return tier === "low" ? 300 : tier === "medium" ? 400 : 500;
  //   if (tileCount <= 10) return tier === "low" ? 400 : tier === "medium" ? 500 : 600;
  //   if (tileCount <= 20) return tier === "low" ? 500 : tier === "medium" ? 600 : 700;
  //   if (tileCount <= 30) return tier === "low" ? 600 : tier === "medium" ? 700 : 800;
  //   return tier === "low" ? 800 : tier === "medium" ? 1000 : 1200;
  // };

  const dealTiles = async () => {
    // 空いているタイルを取得
    const { data: availableTiles, error } = await supabase
      .from("tiles")
      .select("id")
      .eq("game_id", gameId)
      .eq("placed", false)
      .eq("dealed", false);

    if (error) {
      console.error("タイル取得エラー:", error);
      return;
    }

    for (let i = 0; i < players.length; i++) {
      for (let j = 0; j < 6; j++) {
        // ランダムに1枚補充を試みる
        let newTile;
        do {
          newTile = availableTiles.sort(() => Math.random() - 0.5)[0];
          if (newTile) {
            availableTiles.splice(availableTiles.indexOf(newTile), 1);
          }
        } while (!newTile);


        // 手牌に追加
        const { error: insertError } = await supabase
          .from("hands")
          .insert({ game_id: gameId, player_id: players[i], tile_id: newTile.id });

        if (insertError) {
          console.error("手牌追加エラー:", insertError);
        }

        // タイルを配付済みにする
        const { error: updateError } = await supabase
          .from("tiles")
          .update({ dealed: true })
          .eq("game_id", gameId)
          .eq("id", newTile.id);

        if (updateError) {
          console.error("タイル配付エラー:", updateError);
        }
      }
    }
    if (endTurn) {
      await endTurn(nextPlayerId);
    }
    await supabase.from("game_tables").update({ status: "started" }).eq("id", gameId);
    await supabase.from("users").update({ balance: 6000 }).eq("game_id", gameId);
  };

  const removeTileFromHand = async (gameId: string, playerId: string, col: number, row: string) => {
    const tileKind = positionToTileKind(col, row); // タイルの種類を取得

    // 1️⃣ `tiles` テーブルから `tile_id` を取得
    const { data, error: fetchError } = await supabase
      .from("tiles")
      .select("id")
      .eq("game_id", gameId)
      .eq("tile_kind", tileKind)
      .single();

    if (fetchError || !data) {
      console.error("タイルID取得エラー:", fetchError);
      return;
    }

    const tileId = data.id; // `tile_id` を取得

    // 2️⃣ フロントエンドの状態を更新（手牌から削除）
    setPlayerHand(prev => prev.filter(tile => !(tile === tileKind)));

    // 3️⃣ Supabase の `hands` テーブルから該当のタイルを削除
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
      .eq("placed", false)
      .eq("dealed", false);

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

    // タイルを配付済みにする
    const { error: updateError } = await supabase
      .from("tiles")
      .update({ dealed: true })
      .eq("game_id", gameId)
      .in("id", newTiles.map(tile => tile.id));
    if (updateError) {
      console.error("タイル配付エラー:", updateError);
    }
    // Supabase に追加
    const { error: insertError } = await supabase
      .from("hands")
      .insert(newTiles.map(tile => ({
        game_id: gameId,
        player_id: playerId,
        tile_id: tile.id
      })));

    //idからKindを取得
    const newTilesKind = await Promise.all(newTiles.map(tile => fetchTileKindById(gameId, tile.id)));
    // 手牌を更新
    setPlayerHand(prev => [...prev, ...newTilesKind]);
    setPutTile(false);

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

    const tileId = positionToTileKind(pendingTile.col, pendingTile.row);

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

    setPutTile(true);
  };

  const cancelTilePlacement = () => {
    setPendingTile(null);
    setConfirming(false);
  };

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`hotels`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hotels" }, async () => {
        const { data, error } = await supabase
          .from("hotels")
          .select("id, hotel_name, tile_ids, hotel_home_tile_id")
          .eq("game_id", gameId);

        if (error) {
          console.error("ホテル情報リアルタイム更新エラー:", error);
          return;
        }

        const formattedHotels = await Promise.all(data.map(async hotel => ({
          id: hotel.id,
          name: hotel.hotel_name,
          tiles: await Promise.all(hotel.tile_ids.map((tileId: string) => tileIdToPosition(tileId, gameId))),
          home: (await tileIdToPosition(hotel.hotel_home_tile_id, gameId)) || { col: 0, row: "" } // null の場合のデフォルト値
        })));

        setEstablishedHotels(formattedHotels);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // ホテル選択モーダルの状態
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: string; adjacentTiles: { col: number; row: string }[] } | null>(null);
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
    if (!gameId) return;

    const newTile = { col, row };
    const adjacentTiles = getAdjacentTiles(col, row);
    const adjacentPlacedTiles = adjacentTiles.filter((tile) =>
      placedTiles.some((t) => t.col === tile.col && t.row === tile.row)
    );

    let updatedHotels = [...establishedHotels];

    // 既存のホテルを検索
    const foundAdjacentHotels = updatedHotels.filter((hotel) =>
      hotel.tiles.some((tile) =>
        adjacentPlacedTiles.some((adjTile) => tile.col === adjTile.col && tile.row === adjTile.row)
      )
    );

    if (foundAdjacentHotels.length === 1) {
      // 既存のホテルにタイルを追加
      const hotel = foundAdjacentHotels[0];
      const tileIdPromises = hotel.tiles.map(t => positionToTileId(t.col, t.row, gameId));
      const resolvedTileIds = await Promise.all(tileIdPromises);
      const resolvedNewTileId = await positionToTileId(newTile.col, newTile.row, gameId);
      const adjacentTileIds = await Promise.all(adjacentPlacedTiles.map(tile => positionToTileId(tile.col, tile.row, gameId)));
      const updatedTileIds = [...new Set(resolvedTileIds.concat(resolvedNewTileId, adjacentTileIds))];
      console.log(updatedTileIds);
      // Supabase の `hotels` テーブルを更新
      const { error } = await supabase
        .from("hotels")
        .update({ tile_ids: updatedTileIds })
        .eq("game_id", gameId)
        .eq("id", hotel.id);

      if (error) {
        console.error("ホテルタイル追加エラー:", error);
        return;
      }

      updatedHotels = updatedHotels.map(h =>
        h.id === hotel.id ? { ...h, tiles: [...h.tiles, newTile] } : h
      );

    } else if (foundAdjacentHotels.length > 1) {
      const hotelsWithMoreThan11Tiles = foundAdjacentHotels.filter(hotel => hotel.tiles.length >= 11);
      if (hotelsWithMoreThan11Tiles.length >= 2) return; // 吸収不可

      // ホテル合併処理
      const mergedTiles = await Promise.all([
        positionToTileId(newTile.col, newTile.row, gameId),
        ...adjacentPlacedTiles.map(tile => positionToTileId(tile.col, tile.row, gameId)),
        ...foundAdjacentHotels.flatMap(hotel => hotel.tiles.map(tile => positionToTileId(tile.col, tile.row, gameId)))
      ]);
      const uniqueMergedTiles = Array.from(new Set(mergedTiles));

      const largestHotel = foundAdjacentHotels.reduce((prev, current) =>
        prev.tiles.length > current.tiles.length ? prev : current
      );

      const { error } = await supabase
        .from("hotels")
        .update({
          tile_ids: uniqueMergedTiles,
          hotel_home_tile_id: uniqueMergedTiles[0]
        })
        .eq("game_id", gameId)
        .eq("id", largestHotel.id);

      if (error) {
        console.error("ホテル合併エラー:", error);
        return;
      }

      const homePosition = await tileIdToPosition(uniqueMergedTiles[0], gameId);

      updatedHotels = [
        ...updatedHotels.filter(h => !foundAdjacentHotels.includes(h)),
        {
          id: largestHotel.id,
          name: largestHotel.name,
          tiles: (await Promise.all(mergedTiles.map(id => tileIdToPosition(id, gameId))))
            .filter((position): position is { col: number; row: string } => position !== null), // null を除外
          home: homePosition || { col: 0, row: "" } // null の場合のデフォルト値
        }
      ];

      supabase.from("hotels").update({
        hotel_home_tile_id: uniqueMergedTiles[0]
      }).eq("game_id", gameId).eq("id", largestHotel.id);

      // 吸収されたホテルを削除
      const absorbedHotels = foundAdjacentHotels.filter(h => h.id !== largestHotel.id);
      for (const hotel of absorbedHotels) {
        const { error } = await supabase
          .from("hotels")
          .delete()
          .eq("game_id", gameId)
          .eq("id", hotel.id);

        if (error) {
          console.error("ホテル削除エラー:", error);
        }
      }

    } else if (adjacentPlacedTiles.length >= 1) {
      // 新しいホテルを設立
      setBornNewHotel(true);
      setSelectedTile({ col, row, adjacentTiles: adjacentPlacedTiles });
      return;
    }

    // **最後に setState を実行**
    setEstablishedHotels(updatedHotels);
    setPlacedTiles(prev => [...new Set([...prev, newTile])]);
  };


  // プレイヤーがホテルを選択したときの処理
  const handleHotelSelection = async (index: number, hotelName: string) => {
    if (!selectedTile) return;

    const newHotelTiles = [selectedTile, ...selectedTile.adjacentTiles];
    console.log(newHotelTiles);
    const tileIds = await Promise.all(newHotelTiles.map(tile => positionToTileId(tile.col, tile.row, gameId))); // タイルの ID に変換
    console.log(tileIds);
    const homeTileId = tileIds[0]; // 最初のタイルを本拠地にする

    // 1️⃣ Supabase にホテルを追加
    const { data, error } = await supabase
      .from("hotels")
      .insert({
        game_id: gameId,
        player_id: playerId, // ホテルを設立したプレイヤー
        tile_ids: tileIds,
        hotel_name: hotelName,
        hotel_home_tile_id: homeTileId
      })
      .select()
      .single(); // 挿入後のデータを取得

    if (error) {
      console.error("❌ ホテル作成エラー:", error);
      return;
    }

    // 2️⃣ フロントエンドの状態を更新
    setEstablishedHotels(prevHotels => [
      ...prevHotels,
      {
        id: data.id, // Supabase から取得した `id`
        name: data.hotel_name,
        tiles: newHotelTiles,
        home: newHotelTiles[0],
      }
    ]);

    // 3️⃣ ホテル投資家を追加
    const { data: investorData, error: investorError } = await supabase
      .from("hotel_investors")
      .select("shares")
      .eq("hotel_name", hotelName)
      .eq("user_id", playerId)
      .eq("game_id", gameId);

    if (investorError) {
      console.error("ホテル投資家取得エラー:", investorError);
      return;
    }

    if (investorData.length === 0) {
      const { error: hotelInvestorError } = await supabase
        .from("hotel_investors")
        .insert({
          hotel_name: hotelName,
          user_id: playerId,
          game_id: gameId,
          shares: 1
        });
      if (hotelInvestorError) {
        console.error("ホテル投資家更新エラー:", hotelInvestorError);
        return;
      }
    } else {
      const currentShares = investorData[0].shares;

      const { error: hotelInvestorError } = await supabase
        .from("hotel_investors")
        .update({
          shares: currentShares + 1
        })
        .eq("hotel_name", hotelName)
        .eq("user_id", playerId)
        .eq("game_id", gameId);

      if (hotelInvestorError) {
        console.error("ホテル投資家更新エラー:", hotelInvestorError);
        return;
      }
    }

    setBornNewHotel(false);
    setSelectedTile(null);
  };

  const handleDrawAndEndTurn = async (playerId: string, nextPlayerId: string) => {
    try {
      await drawTilesUntil6(playerId); // タイル補充
      if (endTurn) {
        await endTurn(nextPlayerId); // ターンエンド
      }
      setIsMyTurn(false);
      setStocksBoughtThisTurn(0);
    } catch (error) {
      console.error("タイル補充 & ターンエンドエラー:", error);
    }
  };

  const handleBuyStock = async (hotelName: string) => {
    if (stocksBoughtThisTurn >= 3) {
      alert("1ターンで購入できる株券は3枚までです。");
      return;
    }
    const { data, error } = await supabase.from("hotel_investors").select("shares").eq("hotel_name", hotelName).eq("user_id", playerId);
    console.log(data);
    if (error) {
      console.error("ホテル取得エラー:", error);
      return;
    } else if (data.length === 0) {
      console.log(`${hotelName} の株券を買います`);



      const stockPrice = await getStockPriceByHotelName(hotelName);

      // プレイヤーの所持金を更新
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", playerId)
        .single();

      if (userError || !userData) {
        console.error("所持金取得エラー:", userError);
        return;
      }

      const newBalance = userData.balance - stockPrice;
      console.log(newBalance);
      const { error: balanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", playerId);

      if (balanceError) {
        console.error("所持金更新エラー:", balanceError);
        return;
      }

      const { error } = await supabase.from("hotel_investors").insert({
        hotel_name: hotelName,
        user_id: playerId,
        game_id: gameId,
        shares: 1
      });
      if (error) {
        console.error("株券取得エラー:", error);
        return;
      }
      setStocksBoughtThisTurn(prev => prev + 1);
    } else {
      const stockPrice = await getStockPriceByHotelName(hotelName);

      // プレイヤーの所持金を更新
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", playerId)
        .single();

      if (userError || !userData) {
        console.error("所持金取得エラー:", userError);
        return;
      }

      const newBalance = userData.balance - stockPrice;
      console.log(newBalance);
      const { error: balanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", playerId);

      if (balanceError) {
        console.error("所持金更新エラー:", balanceError);
        return;
      }
      const { error } = await supabase.from("hotel_investors")
        .update({
          shares: data[0].shares + 1
        })
        .eq("hotel_name", hotelName)
        .eq("user_id", playerId)
        .eq("game_id", gameId);
      if (error) {
        console.error("株券取得エラー:", error);
        return;
      }
      setStocksBoughtThisTurn(prev => prev + 1);
    }
  };

  const handleReset = async () => {
    await supabase.from("hands").delete().eq("game_id", gameId);
    await supabase.from("hotels").delete().eq("game_id", gameId);
    await supabase.from("tiles").update({ placed: false, dealed: false }).eq("game_id", gameId);
    await supabase.from("game_tables").update({ current_turn: null, status: "ongoing" }).eq("id", gameId);
    await supabase.from("hotel_investors").delete().eq("game_id", gameId);
    await supabase.from("users").update({ balance: 6000 }).in("id", players);
    setEstablishedHotels([]);
    setPlacedTiles([]);
    setPlayerHand([]);
    setPutTile(false);
    if (setGameStarted) {
      setGameStarted(false);
    }
  };

  const renderedHotelList = useMemo(() => (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      <div className="grid grid-cols-3 gap-3">
        {completeHotelList.map((hotel, index) => (
          <div key={`hotel-${index}`} className={`p-2 ${hotelColors[hotel.name]} rounded flex items-center`}>
            <img src={hotelImages[hotel.name]} alt={hotel.name} className="w-8 h-8 object-contain mr-2" />
            <span>{hotel.name}</span>
            {(putTile && isMyTurn && hotel.tiles > 0 && !bornNewHotel) && (
              <button className="ml-2 px-2 py-1 bg-white rounded text-sm"
                onClick={() => handleBuyStock(hotel.name)}
                disabled={stocksBoughtThisTurn >= 3}
              >株券を買う</button>)}
            {bornNewHotel && hotel.tiles === 0 && (
              <button className="ml-2 px-2 py-1 bg-white rounded text-sm"
                onClick={() => handleHotelSelection(index, hotel.name)}
              >建設する</button>
            )}
            <span className="font-bold text-white ml-auto">{hotel.tiles} マス</span>
          </div>
        ))}
      </div>
    </div>
  ), [completeHotelList, bornNewHotel, stocksBoughtThisTurn]);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 border border-gray-300 w-full max-w-screen-md">
      {/* 手牌を配るボタン */}
      {!gameStarted && <button className="px-4 py-2 bg-blue-300 rounded" onClick={async () => {
        await dealTiles();
      }}
      >
        START
      </button>
      }
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
            {colLabels.map((col) => {
              const isSelected = placedTiles.some((tile) => tile.col === col && tile.row === row);
              const hotel = establishedHotels.find(h => h.tiles.some(t => t.col === col && t.row === row));
              const home = establishedHotels.find(h => h.home.col === col && h.home.row === row);
              const isInPlayerHand = playerHand.some((tileKind) => {
                const { col: tileCol, row: tileRow } = tileKindToPosition(tileKind);
                return tileCol === col && tileRow === row;
              });
              return (
                <div
                  key={`cell-${col}${row}`}
                  className={`w-10 h-10 flex items-center justify-center border ${isInPlayerHand && !putTile ? 'border-red-500 border-2' : 'border-gray-400'} ${bornNewHotel ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${hotel
                      ? hotelColors[hotel.name]
                      : isSelected
                        ? "bg-gray-400"
                        : pendingTile?.col === col && pendingTile?.row === row
                          ? "bg-gray-300 border-2 border-gray-500"
                          : "bg-white hover:bg-gray-200"
                    }`}
                  onClick={() => (isInPlayerHand && isMyTurn) || freePlacementMode ? handleTilePlacement(col, row) : null}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80">
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
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <div className="flex flex-row">
          <div className="w-3/4">
            {/* 手牌一覧 */}
            <h3 className="text-lg font-bold">手牌</h3>
            <div className="flex gap-2">
              {playerHand.map((tileKind, index) => {
                const { col, row } = tileKindToPosition(tileKind);
                return (
                  <button
                    key={index}
                    className="w-16 h-16 bg-gray-400"
                    onClick={() => handleTilePlacement(col, row)}
                    disabled={putTile || !isMyTurn}
                  >
                    {col}{row}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="w-1/4 text-center font-bold" onClick={() => setFreePlacementMode(!freePlacementMode)}>
            {freePlacementMode ? "自由選択モード" : "固定選択モード"}
          </button>
          <div className="flex flex-row w-1/4 justify-end">
            {/* 補充ボタン（手牌が6枚未満のときのみ有効） */}
            <button
              onClick={() => handleDrawAndEndTurn(playerId, nextPlayerId)}
              className={`${playerHand.length >= 6 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${bornNewHotel ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              disabled={playerHand.length >= 6 || freePlacementMode || bornNewHotel}
            >
              <img src="/images/draw.webp" alt="draw" className="w-16 h-16" />
            </button>
          </div>
        </div>
      </div>

      {/* ホテルのリスト */}
      {renderedHotelList}

      {/* 手牌 */}
      <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
        <div className="flex flex-col justify-between">
          <h3 className="text-lg font-bold">配置されたタイル</h3>

          <ul className="flex flex-wrap gap-2 justify-start">
            {[...placedTiles]
              .sort((a, b) => a.col - b.col || a.row.localeCompare(b.row))
              .map((tile, index) => (
                <li key={`placed-${tile.col}${tile.row}-${index}`} className="px-2 py-1 bg-blue-200 rounded">
                  {tile.col}{tile.row}
                </li>
              ))}
          </ul>
        </div>
        <br />
        <button className="w-full text-center font-bold bg-red-500 text-white" onClick={() => handleReset()}>
          リセット
        </button>
      </div>
    </div >
  );
}
