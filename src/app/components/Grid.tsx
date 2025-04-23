"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import { tileKindToPosition, positionToTileKind, tileIdToPosition, positionToTileId } from "@/src/utils/tileUtils";
import { useGame } from "@/src/app/contexts/GameContext";
import { getDividendByHotelName, getStockPriceByHotelName } from "@/src/utils/hotelStockBoard";
import { calculateTopInvestors } from "@/src/utils/calculateTopInvestors";
import GameBoard from "./grid/GameBoard";
import PlayerHand from "./grid/PlayerHand";
import HotelList from "./grid/HotelList";

export default function Grid({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {

  // const rows = 9; // A～I
  const cols = 12; // 1～12
  const rowLabels = "ABCDEFGHI".split(""); // A～I のラベル
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1); // 1～12 のラベル
  const [playerHand, setPlayerHand] = useState<number[]>([]);
  const [pendingTile, setPendingTile] = useState<{ col: number; row: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const gameContext = useGame();
  const { currentTurn, endTurn, fetchGameStarted } = gameContext || {};
  const { setMergingHotels, setPreMergeHotelData, setCurrentMergingHotel, setMergingPlayersQueue, setCurrentMergingPlayer } = gameContext || {};
  const [gameStarted, setGameStarted] = useState(false);
  const nextPlayerId = players[(players.indexOf(currentTurn || "") + 1) % players.length];
  const [putTile, setPutTile] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  // 配置されたタイルのリスト
  const [placedTiles, setPlacedTiles] = useState<{ col: number; row: string }[]>([]);
  // 開発中は自由配置可能
  const [freePlacementMode, setFreePlacementMode] = useState(false);
  const [stocksBoughtThisTurn, setStocksBoughtThisTurn] = useState(0);
  // const [occurringMerge, setOccurringMerge] = useState(false);

  // fetchTilesStatusを先に宣言
  const fetchTilesStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("tiles")
      .select("id, placed, dealed")
      .eq("game_id", gameId);

    if (error) {
      console.error("タイルステータス取得エラー:", error);
      return [];
    }
    return data;
  }, [gameId]);

  // 配置されたタイルのリストを取得
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
  }, [gameId, fetchTilesStatus]);

  // ゲームが開始されたかどうかを取得
  useEffect(() => {
    if (!fetchGameStarted || !gameId) return;
    
    const fetchData = async () => {
      const isGameStarted = await fetchGameStarted(gameId);
      setGameStarted(isGameStarted);
    };
    fetchData();

    const channel = supabase
      .channel("game_tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, async () => {
        const isGameStarted = await fetchGameStarted(gameId);
        setGameStarted(isGameStarted);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, fetchGameStarted]);

  const fetchTileKindById = useCallback(async (gameId: string, tileId: number) => {
    const { data, error } = await supabase
      .from("tiles")
      .select("tile_kind")
      .eq("game_id", gameId)
      .eq("id", tileId)
      .single();

    if (error || !data) {
      console.error("tile_kind 取得エラー:", error);
      return null;
    }

    return data.tile_kind;
  }, []);  // supabaseはstableなので依存配列は空でOK

  const fetchPlayerHand = useCallback(async (gameId: string, playerId: string) => {
    const { data, error } = await supabase
      .from("hands")
      .select("tile_id")
      .eq("game_id", gameId)
      .eq("player_id", playerId);

    if (error) {
      console.error("手牌取得エラー:", error);
      return [];
    }

    const handKind = await Promise.all(data.map(tile => fetchTileKindById(gameId, tile.tile_id)));
    return handKind;
  }, [fetchTileKindById]);

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
  }, [gameId, playerId, fetchPlayerHand]);

  useEffect(() => {
    if (!gameId) return;
    // currentTurnが自分のIDと一致するかチェック
    setIsMyTurn(currentTurn === playerId);
  }, [currentTurn, gameId, playerId]);

  // ホテルのリスト
  const [establishedHotels, setEstablishedHotels] = useState<{
    id: number;
    name: string;
    tiles: { col: number; row: string }[];
    home: { col: number; row: string };
    // stockValue: number; // J-Stock の価格
    // tier: "low" | "medium" | "high";
  }[]>([]);

  const completeHotelList = useMemo(() => {
    const allHotels = ["空", "雲", "晴", "霧", "雷", "嵐", "雨"]; // すべてのホテル名
    const existingHotels = establishedHotels.reduce((acc, hotel) => {
      acc[hotel.name] = hotel.tiles.length;
      return acc;
    }, {} as { [key: string]: number });

    return allHotels.map(name => ({
      name,
      tiles: existingHotels[name] || 0,
    }));
  }, [establishedHotels]);

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



  const cancelTilePlacement = () => {
    setPendingTile(null);
    setConfirming(false);
  };

  // ホテル選択モーダルの状態
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: string; adjacentTiles: { col: number; row: string }[] } | null>(null);
  const [bornNewHotel, setBornNewHotel] = useState(false); // 新しいホテルが誕生したかどうかを保持
  const [smallHotels, setSmallHotels] = useState<{ id: number; name: string; tiles: { col: number; row: string }[] }[]>([]);
  const handleMerge = useCallback(async (hotelsToMerge: { id: number; name: string; tiles: { col: number; row: string }[] }[]) => {
    if (hotelsToMerge.length === 0) return;
    
    console.log("Merging hotels:", hotelsToMerge);
    
    // 買収されるホテルの株主を取得
    const mergedHotelNames = hotelsToMerge.map(hotel => hotel.name);
    const { data: shareholders, error } = await supabase
      .from("hotel_investors")
      .select("user_id, shares")
      .in("hotel_name", mergedHotelNames)
      .eq("game_id", gameId);

    if (error) {
      console.error("株主取得エラー:", error);
      return;
    }

    // 重複を除去して株主のリストを作成
    const uniqueShareholders = [...new Set(shareholders?.map(s => s.user_id) || [])];
    
    // プレイヤーの順番に並び替え
    // 株主がいなくても全プレイヤーをキューに追加
    let orderedShareholders = uniqueShareholders.length > 0 
      ? players.filter(playerId => uniqueShareholders.includes(playerId))
      : [...players]; // 株主がいない場合は全プレイヤーを対象とする
    
    // 現在の手番プレイヤーから処理するように配列を並び替える
    if (currentTurn && players.includes(currentTurn)) {
      const currentTurnIndex = players.indexOf(currentTurn);
      // 現在の手番プレイヤーから始まる順序に並び替え
      const reorderedPlayers = [
        ...players.slice(currentTurnIndex),
        ...players.slice(0, currentTurnIndex)
      ];
      
      // 順序付けされたプレイヤーの配列を使用して株主の順序を更新
      orderedShareholders = uniqueShareholders.length > 0
        ? reorderedPlayers.filter(playerId => uniqueShareholders.includes(playerId))
        : reorderedPlayers;
    }

    // ホテルマージデータの準備
    const preMergeHotelDataValue = hotelsToMerge.map(hotel => ({
      id: String(hotel.id), // idをstringに変換
      name: hotel.name,
      tileCount: hotel.tiles.length
    }));

    // マージされるホテルをContextのHotelタイプに合わせる
    const formattedHotels = hotelsToMerge.map(hotel => ({
      id: String(hotel.id), // idをstringに変換
      name: hotel.name,
      tileCount: hotel.tiles.length
    }));

    // ローカル状態を更新
    if (setMergingPlayersQueue) {
      setMergingPlayersQueue(orderedShareholders);
    }
    if (setCurrentMergingPlayer) {
      setCurrentMergingPlayer(orderedShareholders[0] || null);
    }
    if (setPreMergeHotelData) {
      setPreMergeHotelData(preMergeHotelDataValue);
    }
    if (setMergingHotels) {
      setMergingHotels(formattedHotels);
    }
    if (setCurrentMergingHotel) {
      setCurrentMergingHotel(formattedHotels[0] || null);
    }

    // マージ状態をgame_tablesのmerge_stateカラムに保存
    const mergeStateData = {
      merging_hotels: formattedHotels,
      pre_merge_hotel_data: preMergeHotelDataValue,
      players_queue: orderedShareholders,
      current_player: orderedShareholders[0] || null,
      current_merging_hotel: formattedHotels[0] || null,
      is_merging: true
    };

    const { error: mergeStateError } = await supabase
      .from("game_tables")
      .update({ merge_state: mergeStateData })
      .eq("id", gameId);

    if (mergeStateError) {
      console.error("マージ状態保存エラー:", mergeStateError);
    }
  }, [setPreMergeHotelData, setMergingHotels, setCurrentMergingHotel, gameId, players, setMergingPlayersQueue, setCurrentMergingPlayer, currentTurn]);

  //hotel_investorsのデータを取得
  const [hotelInvestors, setHotelInvestors] = useState<{ hotel_name: string; user_id: string; shares: number }[]>([]);

  const fetchHotelInvestors = async (gameId: string) => {
    const { data, error } = await supabase
      .from("hotel_investors")
      .select("*")
      .eq("game_id", gameId);
    if (error) console.error("ホテル投資家取得エラー:", error);
    return data || [];
  };

  useEffect(() => {
    const fetchData = async () => {
      const fetchedHotelInvestors = await fetchHotelInvestors(gameId);
      setHotelInvestors(fetchedHotelInvestors);
    };
    fetchData();
    const channel = supabase
      .channel("hotel_investors")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_investors" }, async () => {
        const fetchedHotelInvestors = await fetchHotelInvestors(gameId);
        setHotelInvestors(fetchedHotelInvestors);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  //smallHotelsのデータが更新されたら検知するuseEffectを修正
  useEffect(() => {
    // smallHotelsが空の場合は何もしない
    if (smallHotels.length === 0) return;
    
    // 直接handleMergeを呼び出す
    handleMerge(smallHotels);
  }, [smallHotels, handleMerge]);
  // 配当を分配
  const dealDividend = async (userId: string, dividend: number) => {
    const { data: users, error: fetchError } = await supabase
      .from("users")
      .select("id, balance")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("ユーザー取得エラー:", fetchError);
      return;
    }

    const newBalance = users.balance + dividend;

    const { error } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (error) {
      console.error("所持金更新エラー:", error);
      return;
    }
  }

  // 隣接するタイルを取得
  const getAdjacentTiles = (col: number, row: string) => {
    const rowIndex = rowLabels.indexOf(row);
    const adjacentTiles = [];

    // 左のタイル
    if (col > 1) {
      adjacentTiles.push({ col: col - 1, row });
    }

    // 右のタイル
    if (col < 12) {
      adjacentTiles.push({ col: col + 1, row });
    }

    // 上のタイル
    if (rowIndex > 0) {
      adjacentTiles.push({ col, row: rowLabels[rowIndex - 1] });
    }

    // 下のタイル
    if (rowIndex < rowLabels.length - 1) {
      adjacentTiles.push({ col, row: rowLabels[rowIndex + 1] });
    }

    return adjacentTiles;
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

      // ホテルのタイル情報を更新
      const updatedHotel = {
        ...hotel,
        tiles: [...hotel.tiles, newTile]
      };
      updatedHotels = updatedHotels.map(h =>
        h.id === hotel.id ? updatedHotel : h
      );
      setEstablishedHotels(updatedHotels);
    } else if (foundAdjacentHotels.length > 1) {
      const hotelsWithMoreThan11Tiles = foundAdjacentHotels.filter(hotel => hotel.tiles.length >= 11);
      if (hotelsWithMoreThan11Tiles.length >= 2) {
        return;
      }

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
      console.log(largestHotel);
      console.log("foundAdjacentHotels", foundAdjacentHotels);
      setSmallHotels(foundAdjacentHotels.filter(hotel => hotel.name !== largestHotel.name));
      console.log("smallHotels", smallHotels);
      for (const hotel of smallHotels) {
        const { topInvestor, secondInvestor } = calculateTopInvestors(hotelInvestors, hotel.name);
        const dividend = await getDividendByHotelName(hotel.name);
        await dealDividend(topInvestor.user_id, dividend);
        await dealDividend(secondInvestor.user_id, dividend * 0.5);
      }
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

      // 合併後のホテル情報を更新
      const updatedLargestHotel = {
        ...largestHotel,
        tiles: [...largestHotel.tiles, newTile, ...adjacentPlacedTiles]
      };
      updatedHotels = updatedHotels.map(h =>
        h.id === largestHotel.id ? updatedLargestHotel : h
      ).filter(h => !smallHotels.some(sh => sh.id === h.id));
      setEstablishedHotels(updatedHotels);

      handleMerge(foundAdjacentHotels.filter(hotel => hotel.name !== largestHotel.name));
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
      setSmallHotels([]);
    } else if (adjacentPlacedTiles.length >= 1) {
      // 新しいホテルを設立
      setBornNewHotel(true);
      setSelectedTile({ col, row, adjacentTiles: adjacentPlacedTiles });
      return;
    }
    // 最後に setState を実行
    setEstablishedHotels(updatedHotels);
    setPlacedTiles(prev => [...new Set([...prev, newTile])]);
  };

  // smallHotelsの変更を監視
  useEffect(() => {
    console.log("Updated smallHotels:", smallHotels);
  }, [smallHotels]);

  const confirmTilePlacement = async () => {
    if (!pendingTile) return;

    const tileId = positionToTileKind(pendingTile.col, pendingTile.row);
    // 既存のホテルを検索
    const adjacentTiles = getAdjacentTiles(pendingTile.col, pendingTile.row);
    const adjacentPlacedTiles = adjacentTiles.filter((tile) =>
      placedTiles.some((t) => t.col === tile.col && t.row === tile.row)
    );
    const updatedHotels = [...establishedHotels];
    const foundAdjacentHotels = updatedHotels.filter((hotel) =>
      hotel.tiles.some((tile) =>
        adjacentPlacedTiles.some((adjTile) => tile.col === adjTile.col && tile.row === adjTile.row)
      )
    );
    const hotelsWithMoreThan11Tiles = foundAdjacentHotels.filter(hotel => hotel.tiles.length >= 11);
    if (hotelsWithMoreThan11Tiles.length >= 2) {
      alert("タイルを配置できません");
      return;
    }
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

  // プレイヤーがホテルを選択したときの処理
  const handleHotelSelection = async (index: number, hotelName: string) => {
    if (!selectedTile) return;

    const newHotelTiles = [selectedTile, ...selectedTile.adjacentTiles];
    const tileIds = await Promise.all(newHotelTiles.map(tile => positionToTileId(tile.col, tile.row, gameId))); // タイルの ID に変換
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

  const handleDrawAndEndTurn = async (currentPlayerId: string, nextPlayerId: string) => {
    try {
      await drawTilesUntil6(currentPlayerId); // タイル補充
      if (endTurn) {
        await endTurn(nextPlayerId); // ターンエンド
        // ターン終了後に自分のターンではなくなる
        if (currentPlayerId === playerId) {
          setIsMyTurn(false);
        }
      }
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

    // プレイヤーの所持金を取得
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", playerId)
      .single();

    if (userError || !userData) {
      console.error("所持金取得エラー:", userError);
      return;
    }

    const stockPrice = await getStockPriceByHotelName(hotelName);
    if (userData.balance < stockPrice) {
      alert("所持金が不足しています。");
      return;
    }

    const { data, error } = await supabase.from("hotel_investors").select("shares").eq("hotel_name", hotelName).eq("user_id", playerId);
    console.log(data);
    if (error) {
      console.error("ホテル取得エラー:", error);
      return;
    } else if (data.length === 0) {
      const totalShares = hotelInvestors
        .filter(investor => investor.hotel_name === hotelName)
        .reduce((acc, investor) => acc + investor.shares, 0);

      if (totalShares >= 25) {
        console.log(`${hotelName} の株券はこれ以上購入できません`);
        return;
      }

      console.log(`${hotelName} の株券を買います`);

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
      const totalShares = hotelInvestors
        .filter(investor => investor.hotel_name === hotelName)
        .reduce((acc, investor) => acc + investor.shares, 0);
      if (totalShares >= 25) {
        alert(`${hotelName} の株券はこれ以上購入できません`);
        return;
      }

      const newBalance = userData.balance - stockPrice;
      if (newBalance < 0) {
        alert("所持金が不足しています。");
        return;
      }

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

  // 重複しているuseEffectを統合し、リアルタイム更新を改善
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

      const formattedHotels = await Promise.all(data.map(async hotel => {
        const tiles = await Promise.all(hotel.tile_ids.map((tileId: string) => tileIdToPosition(tileId, gameId)));
        const home = (await tileIdToPosition(hotel.hotel_home_tile_id, gameId)) || { col: 0, row: "" };
        
        return {
          id: hotel.id,
          name: hotel.hotel_name,
          tiles: tiles.filter(tile => tile !== null) as { col: number; row: string }[],
          home
        };
      }));

      setEstablishedHotels(formattedHotels);
    };

    // 初回データ取得
    fetchHotels();

    // リアルタイム購読の設定
    const channel = supabase
      .channel("hotels_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "hotels", filter: `game_id=eq.${gameId}` }, 
        async (payload) => {
          console.log("ホテル情報が更新されました:", payload);
          await fetchHotels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // タイルの配置を監視
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

      const formattedHotels = await Promise.all(data.map(async hotel => {
        const tiles = await Promise.all(hotel.tile_ids.map((tileId: string) => tileIdToPosition(tileId, gameId)));
        const home = (await tileIdToPosition(hotel.hotel_home_tile_id, gameId)) || { col: 0, row: "" };
        
        return {
          id: hotel.id,
          name: hotel.hotel_name,
          tiles: tiles.filter(tile => tile !== null) as { col: number; row: string }[],
          home
        };
      }));

      setEstablishedHotels(formattedHotels);
    };

    const channel = supabase
      .channel("tiles_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "tiles", filter: `game_id=eq.${gameId}` }, 
        async (payload) => {
          console.log("タイル情報が更新されました:", payload);
          await fetchHotels();
        }
      )
      .subscribe();

    // マージ状態の変更を監視
    const mergeStateChannel = supabase
      .channel("game_tables_merge_state")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${gameId}` }, 
        async (payload) => {
          console.log("マージ状態が更新されました:", payload);
          // @ts-expect-error payloadの型定義がないためエラーになるが、実行時には存在する
          if (payload.new && payload.new.merge_state && payload.new.merge_state.is_merging) {
            // マージ状態の更新
            if (setMergingHotels) {
              // @ts-expect-error merge_stateのプロパティにアクセスするため
              setMergingHotels(payload.new.merge_state.merging_hotels || []);
            }
            if (setPreMergeHotelData) {
              // @ts-expect-error merge_stateのプロパティにアクセスするため
              setPreMergeHotelData(payload.new.merge_state.pre_merge_hotel_data || []);
            }
            if (setMergingPlayersQueue) {
              // @ts-expect-error merge_stateのプロパティにアクセスするため
              setMergingPlayersQueue(payload.new.merge_state.players_queue || []);
            }
            if (setCurrentMergingPlayer) {
              // @ts-expect-error merge_stateのプロパティにアクセスするため
              setCurrentMergingPlayer(payload.new.merge_state.current_player);
            }
            if (setCurrentMergingHotel) {
              // @ts-expect-error merge_stateのプロパティにアクセスするため
              setCurrentMergingHotel(payload.new.merge_state.current_merging_hotel);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(mergeStateChannel);
    };
  }, [gameId, setMergingHotels, setPreMergeHotelData, setMergingPlayersQueue, setCurrentMergingPlayer, setCurrentMergingHotel]);

  // MergePopupコンポーネントを追加
  const MergePopup = () => {
    const { mergingHotels } = gameContext || {};
    
    if (!mergingHotels || mergingHotels.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">ホテルの合併が発生しました</h3>
          <p>以下のホテルが合併されます:</p>
          <ul className="mt-2 mb-4">
            {mergingHotels.map((hotel: { id: string; name: string; tileCount: number }) => (
              <li key={hotel.id} className="mb-1">
                {hotel.name} ホテル (タイル数: {hotel.tileCount})
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600">
            各プレイヤーが株券の扱いを決定するまでお待ちください
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 border border-gray-300 w-full max-w-screen-md">
      {!gameStarted && (
        <button 
          className="px-4 py-2 bg-blue-300 rounded" 
          onClick={dealTiles}
        >
          START
        </button>
      )}

      <GameBoard
        rowLabels={rowLabels}
        colLabels={colLabels}
        placedTiles={placedTiles}
        playerHand={playerHand}
        pendingTile={pendingTile}
        establishedHotels={establishedHotels}
        bornNewHotel={bornNewHotel}
        putTile={putTile}
        isMyTurn={isMyTurn}
        freePlacementMode={freePlacementMode}
        handleTilePlacement={handleTilePlacement}
        tileKindToPosition={tileKindToPosition}
      />

      {confirming && pendingTile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80 z-50">
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

      {/* マージが発生した場合に表示されるポップアップ */}
      {gameContext?.mergingHotels && gameContext.mergingHotels.length > 0 && gameContext.currentMergingPlayer !== playerId && <MergePopup />}

      <PlayerHand
        playerHand={playerHand}
        putTile={putTile}
        isMyTurn={isMyTurn}
        freePlacementMode={freePlacementMode}
        handleTilePlacement={handleTilePlacement}
        setFreePlacementMode={setFreePlacementMode}
        onDrawAndEndTurn={() => handleDrawAndEndTurn(playerId, nextPlayerId)}
      />

      <HotelList
        completeHotelList={completeHotelList}
        putTile={putTile}
        isMyTurn={isMyTurn}
        bornNewHotel={bornNewHotel}
        handleBuyStock={handleBuyStock}
        handleHotelSelection={handleHotelSelection}
      />

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
    </div>
  );
}
