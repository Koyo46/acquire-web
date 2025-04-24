"use client";
import React from "react";
import { tileKindToPosition } from "@/src/utils/tileUtils";
import Image from 'next/image';

interface PlayerHandProps {
  playerHand: number[];
  putTile: boolean;
  isMyTurn: boolean;
  freePlacementMode: boolean;
  handleTilePlacement: (col: number, row: string) => void;
  setFreePlacementMode: (mode: boolean) => void;
  onDrawAndEndTurn: () => void;
}

export default function PlayerHand({
  playerHand,
  putTile,
  isMyTurn,
  freePlacementMode,
  handleTilePlacement,
  setFreePlacementMode,
  onDrawAndEndTurn,
}: PlayerHandProps) {
  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      <div className="flex flex-row">
        <div className="w-3/4">
          <h3 className="text-lg font-bold">手牌</h3>
          <div className="flex gap-2">
            {playerHand.map((tileKind, index) => {
              const { col, row } = tileKindToPosition(tileKind);
              return (
                <button
                  key={index}
                  className="w-16 h-16 bg-gray-400"
                  onClick={() => handleTilePlacement(col, row)}
                  disabled={putTile || !isMyTurn}
                >
                  {col}{row}
                </button>
              );
            })}
          </div>
        </div>
        <button 
          className="w-1/4 text-center font-bold" 
          onClick={() => setFreePlacementMode(!freePlacementMode)}
        >
          {freePlacementMode ? "自由選択モード" : "固定選択モード"}
        </button>
        <div className="flex flex-row w-1/4 justify-end">
          <button
            onClick={onDrawAndEndTurn}
            className={`${playerHand.length >= 6 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            disabled={playerHand.length >= 6 || freePlacementMode}
          >
            <Image 
              src="/images/draw.webp" 
              alt="draw" 
              width={64}
              height={64}
            />
          </button>
        </div>
      </div>
    </div>
  );
} 