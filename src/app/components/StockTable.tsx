import React from "react";
import { calculateTopInvestors } from "@/src/utils/calculateTopInvestors";
import { useStockStore } from "@/src/store/stockStore";

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

export default function StockTable() {
  const hotels = useStockStore((state) => state.hotels);
  const hotelInvestors = useStockStore((state) => state.hotelInvestors);

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
            const { topInvestor, secondInvestor } = calculateTopInvestors(hotelInvestors, hotel.name);
            return (
              <tr key={index} className={`border border-gray-300 ${hotelColors[hotel.name]}`}>
                <td className="border border-gray-300 p-2 flex items-center">
                  <img src={hotelImages[hotel.name]} alt={hotel.name} className="w-6 h-6 mr-2" />
                  {hotel.name}
                </td>
                <td className="border border-gray-300 p-2">{hotel.size}</td>
                <td className="border border-gray-300 p-2">${hotel.stockPrice}</td>
                <td className="border border-gray-300 p-2">{topInvestor.users?.username || "なし"}</td>
                <td className="border border-gray-300 p-2">{topInvestor.shares || 0}株</td>
                <td className="border border-gray-300 p-2">{secondInvestor.users?.username || "なし"}</td>
                <td className="border border-gray-300 p-2">{secondInvestor.shares || 0}株</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
