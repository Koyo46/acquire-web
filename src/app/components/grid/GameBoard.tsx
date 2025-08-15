"use client";
import React from "react";
import { hotelColors, hotelImages } from "@/src/utils/constants";
import Image from 'next/image';

interface GameBoardProps {
  rowLabels: string[];
  colLabels: number[];
  placedTiles: { col: number; row: string }[];
  playerHand: number[];
  pendingTile: { col: number; row: string } | null;
  establishedHotels: {
    id: number;
    name: string;
    tiles: { col: number; row: string }[];
    home: { col: number; row: string };
  }[];
  bornNewHotel: boolean;
  putTile: boolean;
  isMyTurn: boolean;
  freePlacementMode: boolean;
  handleTilePlacement: (col: number, row: string) => void;
  tileKindToPosition: (tileKind: number) => { col: number; row: string };
}

export default function GameBoard({
  rowLabels,
  colLabels,
  placedTiles,
  playerHand,
  pendingTile,
  establishedHotels,
  bornNewHotel,
  isMyTurn,
  freePlacementMode,
  handleTilePlacement,
  tileKindToPosition,
}: GameBoardProps) {
  return (
    <div className="grid grid-cols-[auto_repeat(12,minmax(2rem,1fr))] gap-1">
      <div className="w-10 h-10"></div>
      {colLabels.map((col) => (
        <div key={`col-${col}`} className="w-10 h-10 flex items-center justify-center font-bold">
          {col}
        </div>
      ))}

      {rowLabels.map((row) => (
        <React.Fragment key={`row-${row}`}>
          <div className="flex items-center justify-center h-10 font-bold">
            {row}
          </div>

          {colLabels.map((col) => {
            const isSelected = placedTiles.some((tile) => tile.col === col && tile.row === row);
            const hotel = establishedHotels.find(h => h.tiles.some(t => t.col === col && t.row === row));
            const home = establishedHotels.find(h => h.home.col === col && h.home.row === row);
            const isInPlayerHand = playerHand.some((tileKind) => {
              const { col: tileCol, row: tileRow } = tileKindToPosition(tileKind);
              return tileCol === col && tileRow === row;
            });

            return (
              <div
                key={`cell-${col}${row}`}
                className={`w-10 h-10 flex items-center justify-center border 
                  ${isInPlayerHand ? 'border-red-500 border-2' : 'border-gray-400'} 
                  ${bornNewHotel ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  ${hotel
                    ? hotelColors[hotel.name]
                    : isSelected
                      ? "bg-gray-400"
                      : pendingTile?.col === col && pendingTile?.row === row
                        ? "bg-gray-300 border-2 border-gray-500"
                        : "bg-white hover:bg-gray-200"
                  }`}
                onClick={() => (isInPlayerHand && isMyTurn) || freePlacementMode ? handleTilePlacement(col, row) : null}
              >
                {hotel && home ? (
                  <Image 
                    src={hotelImages[hotel.name]} 
                    alt={hotel.name} 
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                ) : (
                  `${col}${row}`
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
} 