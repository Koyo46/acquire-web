"use client";
import { useStockStore } from "@/src/store/stockStore";

const hotelColors: { [key: string]: string } = {
  "空": "bg-orange-400",
  "雲": "bg-purple-400",
  "晴": "bg-yellow-400",
  "霧": "bg-indigo-400",
  "雷": "bg-green-400",
  "嵐": "bg-red-400",
  "雨": "bg-blue-400"
};

export default function PlayerStatus() {
  const playerStatuses = useStockStore((state) => state.playerStatuses);
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
