"use client";
import React, { useMemo } from "react";
import Image from 'next/image';
import { useStockStore } from "@/src/store/stockStore";

export default function StockPriceTable() {
  // useStockStoreからホテルデータを取得
  const hotels = useStockStore((state) => state.hotels);

  // ホテルの種類ごとのグループ
  const hotelGroups = {
    luxury: ["雷", "嵐"],
    mid: ["晴", "雨", "霧"],
    economy: ["空", "雲"]
  };

  // グループごとの代表色
  const groupColors = {
    luxury: "relative bg-gradient-to-br from-green-400 to-red-400",  // 雷（緑）と嵐（赤）の斜め区切り
    mid: "relative bg-gradient-to-br from-yellow-400 to-blue-400",   // 晴（黄）と雨（青）の斜め区切り
    economy: "relative bg-gradient-to-br from-orange-400 to-purple-400"  // 空（オレンジ）と雲（紫）の斜め区切り
  };

  // ホテルの画像パス
  const hotelImages: Record<string, string> = {
    "空": "/images/sky.jpg",
    "雲": "/images/cloud.png",
    "晴": "/images/sun.png",
    "霧": "/images/fog.png",
    "雷": "/images/thunder.png",
    "嵐": "/images/storm.png",
    "雨": "/images/rain.jpg"
  };

  // 行データの定義
  const rows = [
    { economy: "2", mid: "-", luxury: "-", price: 200, dividend1: 2000, dividend2: 1000 },
    { economy: "3", mid: "2", luxury: "-", price: 300, dividend1: 3000, dividend2: 1500 },
    { economy: "4", mid: "3", luxury: "2", price: 400, dividend1: 4000, dividend2: 2000 },
    { economy: "5", mid: "4", luxury: "3", price: 500, dividend1: 5000, dividend2: 2500 },
    { economy: "6-10", mid: "5", luxury: "4", price: 600, dividend1: 6000, dividend2: 3000 },
    { economy: "11-20", mid: "6-10", luxury: "5", price: 700, dividend1: 7000, dividend2: 3500 },
    { economy: "21-30", mid: "11-20", luxury: "6-10", price: 800, dividend1: 8000, dividend2: 4000 },
    { economy: "31-40", mid: "21-30", luxury: "11-20", price: 900, dividend1: 9000, dividend2: 4500 },
    { economy: "41以上", mid: "31-40", luxury: "21-30", price: 1000, dividend1: 10000, dividend2: 5000 },
    { economy: "-", mid: "41以上", luxury: "31-40", price: 1100, dividend1: 11000, dividend2: 5500 },
    { economy: "-", mid: "-", luxury: "41以上", price: 1200, dividend1: 12000, dividend2: 6000 }
  ];

  // ホテルのサイズが行のどの範囲に該当するかを判定する関数
  const getSizeRangeMatch = (size: number, rangeText: string): boolean => {
    if (rangeText === "-") return false;
    
    if (rangeText.includes("-")) {
      const [min, max] = rangeText.split("-").map(n => parseInt(n, 10));
      return size >= min && (max ? size <= max : true);
    } else if (rangeText.includes("以上")) {
      const min = parseInt(rangeText.replace("以上", ""), 10);
      return size >= min;
    } else {
      return size === parseInt(rangeText, 10);
    }
  };

  // ホテルがどのグループに属するかを判定
  const getHotelGroup = (hotelName: string): 'luxury' | 'mid' | 'economy' | null => {
    if (hotelGroups.luxury.includes(hotelName)) return 'luxury';
    if (hotelGroups.mid.includes(hotelName)) return 'mid';
    if (hotelGroups.economy.includes(hotelName)) return 'economy';
    return null;
  };

  // 各行のセルごとにホテルを表示するためのマップを作成
  const hotelPositionsMap = useMemo(() => {
    const map = rows.map(() => ({
      economy: [] as string[],
      mid: [] as string[],
      luxury: [] as string[]
    }));

    hotels.forEach(hotel => {
      const group = getHotelGroup(hotel.name);
      if (!group) return;

      rows.forEach((row, rowIndex) => {
        if (getSizeRangeMatch(hotel.size, row[group])) {
          map[rowIndex][group].push(hotel.name);
        }
      });
    });

    return map;
  }, [hotels]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">株価・配当表（クラシックモード）</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border p-2 text-center" colSpan={3}>ホテル</th>
              <th className="border p-2 text-center" rowSpan={2}>株価<br/>（購入/売却額）</th>
              <th className="border p-2 text-center" colSpan={2}>株主配当額</th>
            </tr>
            <tr className="bg-blue-800 text-white">
              <th className={`border p-2 text-center ${groupColors.economy}`}>
                <div className="font-bold">低級</div>
                <div className="text-xs flex items-center justify-center gap-2">
                  {hotelGroups.economy.map(hotel => (
                    <div key={hotel} className="flex flex-col items-center" title={hotel}>
                      <Image 
                        src={hotelImages[hotel]} 
                        alt={hotel} 
                        width={24} 
                        height={24} 
                        className="object-cover rounded-sm border border-white"
                      />
                      <span className="text-xs">{hotel}</span>
                    </div>
                  ))}
                </div>
              </th>
              <th className={`border p-2 text-center ${groupColors.mid}`}>
                <div className="font-bold">中級</div>
                <div className="text-xs flex items-center justify-center gap-2">
                  {hotelGroups.mid.map(hotel => (
                    <div key={hotel} className="flex flex-col items-center" title={hotel}>
                      <Image 
                        src={hotelImages[hotel]} 
                        alt={hotel} 
                        width={24} 
                        height={24} 
                        className="object-cover rounded-sm border border-white"
                      />
                      <span className="text-xs">{hotel}</span>
                    </div>
                  ))}
                </div>
              </th>
              <th className={`border p-2 text-center ${groupColors.luxury}`}>
                <div className="font-bold">高級</div>
                <div className="text-xs flex items-center justify-center gap-2">
                  {hotelGroups.luxury.map(hotel => (
                    <div key={hotel} className="flex flex-col items-center" title={hotel}>
                      <Image 
                        src={hotelImages[hotel]} 
                        alt={hotel} 
                        width={24} 
                        height={24} 
                        className="object-cover rounded-sm border border-white"
                      />
                      <span className="text-xs">{hotel}</span>
                    </div>
                  ))}
                </div>
              </th>
              <th className="border p-2 text-center">筆頭株主</th>
              <th className="border p-2 text-center">第2株主</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr 
                key={index} 
                className={`
                  ${index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'} 
                  hover:bg-blue-100
                `}
              >
                <td className={`border p-2 text-center ${row.economy === "-" ? "text-gray-400" : ""} ${row.economy !== "-" ? "bg-opacity-10 bg-gradient-to-br from-orange-300 to-purple-300" : ""}`}>
                  <div className="flex flex-col">
                    <span className="mb-1">{row.economy}</span>
                    <div className="flex items-center justify-center gap-1">
                      {hotelPositionsMap[index].economy.map(hotelName => {
                        const hotelSize = hotels.find(h => h.name === hotelName)?.size || 0;
                        return (
                          <div key={hotelName} className="flex flex-col items-center" title={`${hotelName} (${hotelSize}タイル)`}>
                            <Image 
                              src={hotelImages[hotelName]} 
                              alt={hotelName} 
                              width={20} 
                              height={20} 
                              className="object-cover rounded-sm border border-gray-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </td>
                <td className={`border p-2 text-center ${row.mid === "-" ? "text-gray-400" : ""} ${row.mid !== "-" ? "bg-opacity-10 bg-gradient-to-br from-yellow-300 to-blue-300" : ""}`}>
                  <div className="flex flex-col">
                    <span className="mb-1">{row.mid}</span>
                    <div className="flex items-center justify-center gap-1">
                      {hotelPositionsMap[index].mid.map(hotelName => {
                        const hotelSize = hotels.find(h => h.name === hotelName)?.size || 0;
                        return (
                          <div key={hotelName} className="flex flex-col items-center" title={`${hotelName} (${hotelSize}タイル)`}>
                            <Image 
                              src={hotelImages[hotelName]} 
                              alt={hotelName} 
                              width={20} 
                              height={20} 
                              className="object-cover rounded-sm border border-gray-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </td>
                <td className={`border p-2 text-center ${row.luxury === "-" ? "text-gray-400" : ""} ${row.luxury !== "-" ? "bg-opacity-10 bg-gradient-to-br from-green-300 to-red-300" : ""}`}>
                  <div className="flex flex-col">
                    <span className="mb-1">{row.luxury}</span>
                    <div className="flex items-center justify-center gap-1">
                      {hotelPositionsMap[index].luxury.map(hotelName => {
                        const hotelSize = hotels.find(h => h.name === hotelName)?.size || 0;
                        return (
                          <div key={hotelName} className="flex flex-col items-center" title={`${hotelName} (${hotelSize}タイル)`}>
                            <Image 
                              src={hotelImages[hotelName]} 
                              alt={hotelName} 
                              width={20} 
                              height={20} 
                              className="object-cover rounded-sm border border-gray-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </td>
                <td className="border p-2 text-center font-semibold text-green-800">
                  ${row.price}
                </td>
                <td className="border p-2 text-center font-semibold text-blue-800">
                  ${row.dividend1}
                </td>
                <td className="border p-2 text-center font-semibold text-blue-700">
                  ${row.dividend2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}