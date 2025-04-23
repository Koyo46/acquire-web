import { useGame } from "@/src/app/contexts/GameContext";
import { calculateStockPrice } from "@/src/utils/hotelStockBoard";
import { supabase } from "@/src/utils/supabaseClient";
import { useState, useEffect } from "react";

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
    setCurrentMergingPlayer
  } = useGame() || {};

  const [isShareholder, setIsShareholder] = useState(false);
  const [shares, setShares] = useState(0);
  const isCurrentPlayer = currentMergingPlayer === playerId;

  useEffect(() => {
    const checkShareholder = async () => {
      if (!currentMergingHotel) return;
      
      const { data: shareholderData } = await supabase
        .from("hotel_investors")
        .select("shares")
        .eq("hotel_name", currentMergingHotel.name)
        .eq("user_id", playerId)
        .eq("game_id", gameId)
        .single();

      setIsShareholder(!!shareholderData);
      setShares(shareholderData?.shares || 0);
    };

    checkShareholder();

    // マージ状態の変更を監視
    const channel = supabase
      .channel("merging_state")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${gameId}` }, 
        async () => {
          // マージ状態が変更されたら株主情報を再取得
          await checkShareholder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMergingHotel, gameId, playerId]);

  // マージ中のホテルがなければ表示しない
  if (!mergingHotels || mergingHotels.length === 0) return null;

  // 株主でない場合は表示しない
  if (!isShareholder) return null;

  const handleMergeComplete = async () => {
    if (!mergingPlayersQueue || !currentMergingPlayer || !setMergingPlayersQueue || !setCurrentMergingPlayer) return;

    // 現在のプレイヤーを処理済みとしてキューから削除
    const newQueue = mergingPlayersQueue.filter(id => id !== currentMergingPlayer);
    setMergingPlayersQueue(newQueue);

    if (newQueue.length > 0) {
      // 次のプレイヤーに移行
      setCurrentMergingPlayer(newQueue[0]);
    } else if (mergingHotels && mergingHotels.length > 0) {
      // 次の買収対象ホテルに移行
      const remainingHotels = mergingHotels.slice(1);
      if (setMergingHotels) {
        setMergingHotels(remainingHotels);
      }
      if (setCurrentMergingHotel) {
        setCurrentMergingHotel(remainingHotels[0] || null);
      }
      
      // 新しいホテルの株主を取得して処理キューを更新
      if (remainingHotels.length > 0) {
        const { data: shareholders } = await supabase
          .from("hotel_investors")
          .select("user_id, shares")
          .eq("hotel_name", remainingHotels[0].name)
          .eq("game_id", gameId);

        const uniqueShareholders = [...new Set(shareholders?.map(s => s.user_id) || [])];
        const orderedShareholders = players.filter(playerId => 
          uniqueShareholders.includes(playerId)
        );

        setMergingPlayersQueue(orderedShareholders);
        setCurrentMergingPlayer(orderedShareholders[0] || null);
      }
    }
  };

  const sellShares = (hotel: Hotel) => {
    console.log(hotel);
    handleMergeComplete();
  }

  const keepShares = (hotel: Hotel) => {
    console.log(hotel);
    handleMergeComplete();
  }

  const exchangeShares = (hotel: Hotel) => {
    console.log(hotel);
    handleMergeComplete();
  }

  return (
    currentMergingHotel && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">買収される{currentMergingHotel.name}の株をどうしますか？</h3>
          <p>保有株数: {shares}株</p>
          <p>マージ前のタイル数: {preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount}</p>
          <p>現在の株価：{calculateStockPrice(currentMergingHotel.name, preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount)}</p>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              {isCurrentPlayer ? "あなたの番です" : `${currentMergingPlayer}の番です`}
            </p>
          </div>
          <div className="flex gap-4 justify-end">
            <button 
              className={`px-6 py-2 rounded transition-colors ${
                isCurrentPlayer 
                  ? "bg-green-500 text-white hover:bg-green-600" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`} 
              onClick={() => sellShares(currentMergingHotel)}
              disabled={!isCurrentPlayer}
            >
              売却する
            </button>
            <button 
              className={`px-6 py-2 rounded transition-colors ${
                isCurrentPlayer 
                  ? "bg-blue-500 text-white hover:bg-blue-600" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={() => keepShares(currentMergingHotel)}
              disabled={!isCurrentPlayer}
            >
              保持する
            </button>
            <button 
              className={`px-6 py-2 rounded transition-colors ${
                isCurrentPlayer 
                  ? "bg-purple-500 text-white hover:bg-purple-600" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={() => exchangeShares(currentMergingHotel)}
              disabled={!isCurrentPlayer}
            >
              2:1で交換
            </button>
          </div>
        </div>
      </div>
    )
  );
}
