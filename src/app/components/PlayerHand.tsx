// "use client";
// import React from "react";

// export default function PlayerHand({ playerHand, drawTilesUntil6, handleTilePlacement }: {
//   playerHand: { col: number; row: string }[];
//   drawTilesUntil6: () => void;
//   handleTilePlacement: (col: number, row: string) => void;
// }) {
//   return (
//     <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
//       <h3 className="text-lg font-bold">手牌</h3>
//       <div className="flex justify-between items-center">
//         {/* 手牌一覧 */}
//         <div className="flex gap-2">
//           {playerHand.map((tile, index) => (
//             <button key={index} className="w-16 h-16 bg-gray-400 rounded"
//               onClick={() => handleTilePlacement(tile.col, tile.row)}>
//               {tile.col}{tile.row}
//             </button>
//           ))}
//         </div>

//         {/* 補充ボタン */}
//         <button
//           // className="ml-4 px-4 py-2 text-white rounded shadow-md border-2 border-black"
//           onClick={drawTilesUntil6}
//           disabled={playerHand.length >= 6}
//         >
//           <img src="/images/draw.webp" alt="draw" className="w-16 h-16" />
//         </button>
//       </div>
//     </div>
//   );
// }
