import React, { useEffect, useState } from "react";
import { supabase } from "@/src/utils/supabaseClient";
import { caluculateStockPrice } from "@/src/utils/hotelStockBoard";
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

const StockTable = ({ gameId }: { gameId: string }) => {
  const [hotels, setHotels] = useState<any[]>([]);
  const [hotelInvestors, setHotelInvestors] = useState<any[]>([]);

  const fetchHotels = async (gameId: string) => {
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .eq("game_id", gameId);
    if (error) console.error("ホテル取得エラー:", error);
    const hotels = data?.map(hotel => ({
      ...hotel,
      size: hotel.tileIds ? hotel.tileIds.length : 0,
      stockPrice: hotel.stock_price
    }));
    return hotels || [];
  };

  const fetchHotelInvestors = async (gameId: string) => {
    const { data, error } = await supabase
      .from("hotel_investors")
      .select(`
        *,
        users (
          username
        )
      `)
      .eq("game_id", gameId);
    if (error) console.error("ホテル投資家取得エラー:", error);
    console.log(data);
    const hotelInvestors = data?.map(investor => ({
      ...investor,
      user_name: investor.users.username
    }));
    return hotelInvestors || [];
  };

  useEffect(() => {
    const fetchData = async () => {
      const fetchedHotels = await fetchHotels(gameId);
      setHotels(fetchedHotels);
      const fetchedHotelInvestors = await fetchHotelInvestors(gameId);
      setHotelInvestors(fetchedHotelInvestors);
    };
    fetchData();

    const channel = supabase
      .channel("hotel_investors")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_investors" }, async () => {
        const fetchedHotelInvestors = await fetchHotelInvestors(gameId);
        setHotelInvestors(fetchedHotelInvestors);
        const fetchedHotels = await fetchHotels(gameId);
        setHotels(fetchedHotels);
      })
      .subscribe();


    const channel2 = supabase
      .channel("hotels")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels" }, async () => {
        const fetchedHotelInvestors = await fetchHotelInvestors(gameId);
        setHotelInvestors(fetchedHotelInvestors);
        const fetchedHotels = await fetchHotels(gameId);
        setHotels(fetchedHotels);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, [gameId]);

  return (
    <div className="p-4">
      <table className="w-full border-collapse border border-gray-300 text-left">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">ホテル名</th>
            <th className="border border-gray-300 p-2">規模</th>
            <th className="border border-gray-300 p-2">株価</th>
            <th className="border border-gray-300 p-2">筆頭株主</th>
            <th className="border border-gray-300 p-2">保有株数</th>
            <th className="border border-gray-300 p-2">第二株主</th>
            <th className="border border-gray-300 p-2">保有株数</th>
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel, index) => {
            const investors = hotelInvestors.filter(investor => investor.hotel_name === hotel.hotel_name);
            const sortedInvestors = investors.sort((a, b) => b.shares - a.shares);
            const topInvestor = sortedInvestors[0] || {};
            const secondInvestor = sortedInvestors[1] || {};
            return (
              <tr key={index} className={`border border-gray-300 ${hotelColors[hotel.hotel_name]}`}>
                <td className="border border-gray-300 p-2 flex items-center">
                  <img src={hotelImages[hotel.hotel_name]} alt={hotel.hotel_name} className="w-6 h-6 mr-2" />
                  {hotel.hotel_name}
                </td>
                <td className="border border-gray-300 p-2">{hotel.tile_ids ? hotel.tile_ids.length : 0}</td>
                <td className="border border-gray-300 p-2">${caluculateStockPrice(hotel.hotel_name, hotel.tile_ids ? hotel.tile_ids.length : 0)}</td>
                <td className="border border-gray-300 p-2">{topInvestor.user_name || "なし"}</td>
                <td className="border border-gray-300 p-2">{topInvestor.shares || 0}株</td>
                <td className="border border-gray-300 p-2">{secondInvestor.user_name || "なし"}</td>
                <td className="border border-gray-300 p-2">{secondInvestor.shares || 0}株</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockTable;
