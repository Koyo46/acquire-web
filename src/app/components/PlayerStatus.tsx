"use client";
import { supabase } from "@/src/utils/supabaseClient";
import { useEffect, useState } from "react";
const hotelColors: { [key: string]: string } = {
  "空": "bg-orange-400",
  "雲": "bg-purple-400",
  "晴": "bg-yellow-400",
  "霧": "bg-indigo-400",
  "雷": "bg-green-400",
  "嵐": "bg-red-400",
  "雨": "bg-blue-400"
};
export default function PlayerStatus({ gameId, players }: { gameId: string, players: string[] }) {
  type PlayerStatus = {
    id: string;
    username: string;
    balance: number;
    stocks: { [key: string]: number };
  };

  const [playerStatuses, setPlayerStatuses] = useState<PlayerStatus[]>([]);

  useEffect(() => {
    const fetchPlayerStatuses = async () => {
      // 各プレイヤーの残高を取得
      const { data: balances, error: balanceError } = await supabase
        .from("users")
        .select("id, username, balance")
        .in("id", players);

      if (balanceError) {
        console.error("残高取得エラー:", balanceError);
        return;
      }

      // 各プレイヤーの株券を取得
      const { data: stocks, error: stockError } = await supabase
        .from("hotel_investors")
        .select("user_id, hotel_name, shares")
        .eq("game_id", gameId)
        .in("user_id", players);

      if (stockError) {
        console.error("株券取得エラー:", stockError);
        return;
      }

      // データを整形
      const statuses = balances.map(balance => {
        const playerStocks = stocks
          .filter(stock => stock.user_id === balance.id)
          .reduce((acc, stock) => {
            acc[stock.hotel_name] = stock.shares;
            return acc;
          }, {} as { [key: string]: number });

        return {
          id: balance.id,
          username: balance.username,
          balance: balance.balance,
          stocks: playerStocks
        };
      });

      setPlayerStatuses(statuses);
    };

    fetchPlayerStatuses();

    // リアルタイム更新のサブスクリプション
    const channel = supabase
      .channel("player-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchPlayerStatuses)
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_investors" }, fetchPlayerStatuses)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, players]);

  const allHotels = ["空", "雲", "晴", "霧", "雷", "嵐", "雨"];

  return (
    <div className="p-4">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">プレイヤー名</th>
            <th className="border border-gray-300 px-4 py-2 bg-gradient-to-r from-amber-300 to-lime-300">残高</th>
            {allHotels.map(hotel => (
              <th key={hotel} className={`border border-gray-300 px-4 py-2 ${hotelColors[hotel]}`}>{hotel}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {playerStatuses.map(player => (
            <tr key={player.id}>
              <td className="border border-gray-300 px-4 py-2">{player.username}</td>
              <td className="border border-gray-300 px-4 py-2  bg-gradient-to-r from-amber-300 to-lime-300">${player.balance}</td>
              {allHotels.map(hotel => (
                <td key={hotel} className={`border border-gray-300 px-4 py-2 ${hotelColors[hotel]}`}>
                  {player.stocks[hotel] || 0}株
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
