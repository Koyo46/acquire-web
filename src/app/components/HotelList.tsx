// "use client";
// import React from "react";

// export default function HotelList({ hotels }: { hotels: { name: string; tiles: number }[] }) {
//   const hotelImages: { [key: string]: string } = {
//     "空": "/images/sky.jpg",
//     "雲": "/images/cloud.png",
//     "晴": "/images/sun.png",
//     "霧": "/images/fog.png",
//     "雷": "/images/thunder.png",
//     "嵐": "/images/storm.png",
//     "雨": "/images/rain.jpg"
//   };

//   const hotelColors: { [key: string]: string } = {
//     "空": "bg-orange-400",
//     "雲": "bg-purple-400",
//     "晴": "bg-yellow-400",
//     "霧": "bg-indigo-400",
//     "雷": "bg-green-400",
//     "嵐": "bg-red-400",
//     "雨": "bg-blue-400"
//   };

//   return (
//     <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
//       <h3 className="text-lg font-bold">ホテル一覧</h3>
//       <div className="grid grid-cols-3 gap-2 md:grid-cols-2 sm:grid-cols-1">
//         {hotels.map((hotel, index) => (
//           <div key={`hotel-${index}`} className={`p-2 ${hotelColors[hotel.name]} rounded flex items-center`}>
//             <img src={hotelImages[hotel.name]} alt={hotel.name} className="w-8 h-8 object-contain mr-2" />
//             <span>{hotel.name}</span>
//             <span className="font-bold text-white ml-auto">{hotel.tiles} マス</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
