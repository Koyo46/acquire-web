import { useGame } from "@/src/app/contexts/GameContext";
import { calculateStockPrice } from "@/src/utils/hotelStockBoard";
import { supabase } from "@/src/utils/supabaseClient";
import { useState, useEffect, useCallback } from "react";

interface Hotel {
  id: string;
  name: string;
  tileCount: number;
}

export default function StockHandler({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const {
    preMergeHotelData,
    mergingHotels,
    setMergingHotels,
    currentMergingHotel,
    setCurrentMergingHotel,
    mergingPlayersQueue,
    setMergingPlayersQueue,
    currentMergingPlayer,
    setCurrentMergingPlayer,
    setPreMergeHotelData
  } = useGame() || {};

  const [shares, setShares] = useState(0);
  const isCurrentPlayer = currentMergingPlayer === playerId;

  // マージ状態をDBから更新する関数
  const updateMergeStateFromDB = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("game_tables")
        .select("merge_state")
        .eq("id", gameId)
        .single();

      if (error) {
        console.error("マージ状態取得エラー:", error.message);
        return;
      }

      if (!data) {
        console.log("マージ状態データが存在しません");
        return;
      }

      if (data && data.merge_state) {
        const mergeState = data.merge_state;
        
        if (setMergingHotels && mergeState.merging_hotels) {
          setMergingHotels(mergeState.merging_hotels);
        }
        
        if (setPreMergeHotelData && mergeState.pre_merge_hotel_data) {
          setPreMergeHotelData(mergeState.pre_merge_hotel_data);
        }
        
        if (setMergingPlayersQueue && mergeState.players_queue) {
          setMergingPlayersQueue(mergeState.players_queue);
        }
        
        if (setCurrentMergingPlayer) {
          setCurrentMergingPlayer(mergeState.current_player);
        }
        
        if (setCurrentMergingHotel) {
          setCurrentMergingHotel(mergeState.current_merging_hotel);
        }
      }
    } catch (err) {
      console.error("マージ状態更新中に予期せぬエラーが発生:", err);
    }
  }, [gameId, setMergingHotels, setPreMergeHotelData, setMergingPlayersQueue, setCurrentMergingPlayer, setCurrentMergingHotel]);

  useEffect(() => {
    const checkShares = async () => {
      if (!currentMergingHotel) return;
      
      try {
        const { data: shareholderData } = await supabase
          .from("hotel_investors")
          .select("shares")
          .eq("hotel_name", currentMergingHotel.name)
          .eq("user_id", playerId)
          .eq("game_id", gameId)
          .single();

        setShares(shareholderData?.shares || 0);
      } catch (error) {
        console.log("株主データ取得エラー", error);
        setShares(0);
      }
    };

    checkShares();
    
    // 初回ロード時にDBからマージ状態を取得
    updateMergeStateFromDB();

    // マージ状態の変更を監視
    const channel = supabase
      .channel("game_tables_merge_state")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${gameId}` }, 
        async (payload) => {
          console.log("マージ状態変更検知:", payload);
          // マージ状態が変更されたらDBから最新の状態を取得
          await updateMergeStateFromDB();
          // 株主情報も再取得
          await checkShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMergingHotel, gameId, playerId, setMergingHotels, setCurrentMergingHotel, setMergingPlayersQueue, setCurrentMergingPlayer, setPreMergeHotelData, updateMergeStateFromDB]);

  // マージ中のホテルがなければ表示しない
  if (!mergingHotels || mergingHotels.length === 0) return null;

  const handleMergeComplete = async () => {
    if (!mergingPlayersQueue || !currentMergingPlayer || !currentMergingHotel) return;

    // 現在のプレイヤーを処理済みとしてキューから削除
    const newQueue = mergingPlayersQueue.filter(id => id !== currentMergingPlayer);

    // 次の状態を計算
    let nextState;
    
    if (newQueue.length > 0) {
      // 次のプレイヤーに移行
      nextState = {
        merging_hotels: mergingHotels,
        pre_merge_hotel_data: preMergeHotelData,
        players_queue: newQueue,
        current_player: newQueue[0],
        current_merging_hotel: currentMergingHotel,
        is_merging: true
      };
    } else if (mergingHotels && mergingHotels.length > 1) {
      // 次の買収対象ホテルに移行
      const remainingHotels = mergingHotels.slice(1);
      
      // 新しいホテルの株主を取得して処理キューを更新
      const { data: shareholders } = await supabase
        .from("hotel_investors")
        .select("user_id, shares")
        .eq("hotel_name", remainingHotels[0].name)
        .eq("game_id", gameId);

      // 現在のターンのプレイヤーを取得
      const { data: gameData } = await supabase
        .from("game_tables")
        .select("current_turn")
        .eq("id", gameId)
        .single();
        
      const currentTurn = gameData?.current_turn;

      const uniqueShareholders = [...new Set(shareholders?.map(s => s.user_id) || [])];
      
      // プレイヤーの配列を現在のターンから開始するように並び替え
      let reorderedPlayers = [...players];
      if (currentTurn && players.includes(currentTurn)) {
        const currentTurnIndex = players.indexOf(currentTurn);
        reorderedPlayers = [
          ...players.slice(currentTurnIndex),
          ...players.slice(0, currentTurnIndex)
        ];
      }
      
      const orderedShareholders = uniqueShareholders.length > 0
        ? reorderedPlayers.filter(pid => uniqueShareholders.includes(pid))
        : reorderedPlayers; // 株主がいない場合は全プレイヤーを対象とする

      nextState = {
        merging_hotels: remainingHotels,
        pre_merge_hotel_data: preMergeHotelData,
        players_queue: orderedShareholders,
        current_player: orderedShareholders[0] || null,
        current_merging_hotel: remainingHotels[0],
        is_merging: true
      };
    } else {
      // すべてのホテルの処理が完了
      nextState = {
        merging_hotels: [],
        pre_merge_hotel_data: [],
        players_queue: [],
        current_player: null,
        current_merging_hotel: null,
        is_merging: false
      };
    }
    
    // マージ状態をDBに保存
    const { error } = await supabase
      .from("game_tables")
      .update({ merge_state: nextState })
      .eq("id", gameId);
      
    if (error) {
      console.error("マージ状態更新エラー:", error);
    }
  };

  const sellShares = async (hotel: Hotel) => {
    if (!isCurrentPlayer) return;
    
    // 株式を売却する処理
    if (shares > 0) {
      // 株価を取得
      const stockPrice = calculateStockPrice(
        hotel.name, 
        preMergeHotelData?.find(h => h.id === hotel.id)?.tileCount || 0
      );
      
      // プレイヤーの所持金を更新
      const { data: userData } = await supabase
        .from("users")
        .select("balance")
        .eq("id", playerId)
        .single();
        
      if (userData) {
        const newBalance = userData.balance + (stockPrice * shares);
        await supabase
          .from("users")
          .update({ balance: newBalance })
          .eq("id", playerId);
      }
      
      // 株式を削除
      await supabase
        .from("hotel_investors")
        .delete()
        .eq("game_id", gameId)
        .eq("user_id", playerId)
        .eq("hotel_name", hotel.name);
    }
    
    // マージ処理を次に進める
    await handleMergeComplete();
  };

  const keepShares = async () => {
    if (!isCurrentPlayer) return;
    // マージ処理を次に進める
    await handleMergeComplete();
  };

  const exchangeShares = async (hotel: Hotel) => {
    if (!isCurrentPlayer) return;
    
    // 株式を2枚を1枚と交換する処理
    if (shares > 1 && mergingHotels && mergingHotels.length > 0) {
      // 大きいホテルを見つける
      const { data: largestHotel } = await supabase
        .from("hotels")
        .select("hotel_name")
        .eq("game_id", gameId)
        .not("hotel_name", "eq", hotel.name)
        .order("tile_ids", { ascending: false })
        .limit(1)
        .single();
        
      if (largestHotel) {
        // 既存の株を確認
        const { data: existingShares } = await supabase
          .from("hotel_investors")
          .select("shares")
          .eq("game_id", gameId)
          .eq("user_id", playerId)
          .eq("hotel_name", largestHotel.hotel_name)
          .maybeSingle();
          
        if (existingShares) {
          // 既存の株に追加
          await supabase
            .from("hotel_investors")
            .update({ shares: existingShares.shares + 1 })
            .eq("game_id", gameId)
            .eq("user_id", playerId)
            .eq("hotel_name", largestHotel.hotel_name);
        } else {
          // 新しく株を追加
          await supabase
            .from("hotel_investors")
            .insert({
              game_id: gameId,
              user_id: playerId,
              hotel_name: largestHotel.hotel_name,
              shares: 1
            });
        }
        
        // 古い株を削除
        await supabase
          .from("hotel_investors")
          .update({ shares: shares - 2 })
          .eq("game_id", gameId)
          .eq("user_id", playerId)
          .eq("hotel_name", hotel.name);
      }
    }
  };

  // 自分のターンでない場合と、自分が株主でない場合の表示を変更
  return (
    currentMergingHotel && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">買収される{currentMergingHotel.name}の株をどうしますか？</h3>
          <p>保有株数: {shares}株</p>
          <p>マージ前のタイル数: {preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount || 0}</p>
          <p>現在の株価：{calculateStockPrice(currentMergingHotel.name, preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount || 0)}</p>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              {isCurrentPlayer ? "あなたの番です" : `${currentMergingPlayer}の番です`}
            </p>
            {shares > 0 ? (
              <p className="text-sm text-green-600">あなたはこのホテルの株主です</p>
            ) : (
              <p className="text-sm text-gray-500">あなたはこのホテルの株主ではありません</p>
            )}
          </div>
          {(isCurrentPlayer) ? (
            <div className="flex gap-4 justify-end mt-4">
              <button 
                className={`px-6 py-2 rounded transition-colors ${
                  shares > 0 
                    ? "bg-green-500 text-white hover:bg-green-600" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`} 
                onClick={() => sellShares(currentMergingHotel)}
                disabled={shares === 0}
              >
                売却する
              </button>
              <button 
                className={`px-6 py-2 rounded transition-colors ${
                  shares > 0 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                onClick={() => keepShares()}
                disabled={shares === 0}
              >
                保持する
              </button>
              <button 
                className={`px-6 py-2 rounded transition-colors ${
                  shares > 0 
                    ? "bg-purple-500 text-white hover:bg-purple-600" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                onClick={() => exchangeShares(currentMergingHotel)}
                disabled={shares === 0 || shares === 1}
              >
                2:1で交換
              </button>
            </div>
          ) : (
            <div className="flex justify-center mt-4">
              <p className="text-gray-600">他のプレイヤーが選択するのを待っています...</p>
            </div>
          )}
          {/* 自分が株主ではなく、自分のターンの場合は、スキップボタンを表示 */}
          {isCurrentPlayer && shares === 0 && (
            <div className="flex justify-center mt-4">
              <button 
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                onClick={() => handleMergeComplete()}
              >
                スキップ
              </button>
            </div>
          )}
        </div>
      </div>
    )
  );
}
