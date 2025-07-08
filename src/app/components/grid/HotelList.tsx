"use client";
import React from "react";
import { hotelColors, hotelImages } from "@/src/utils/constants";
import Image from 'next/image';

interface HotelListProps {
  completeHotelList: { name: string; tiles: number }[];
  putTile: boolean;
  isMyTurn: boolean;
  bornNewHotel: boolean;
  handleBuyStock: (hotelName: string) => void;
  handleHotelSelection: (index: number, hotelName: string) => void;
  canPurchaseStock: boolean;
}

export default function HotelList({
  completeHotelList,
  putTile,
  isMyTurn,
  bornNewHotel,
  handleBuyStock,
  handleHotelSelection,
  canPurchaseStock,
}: HotelListProps) {
  return (
    <div className="mt-4 p-4 bg-white shadow rounded w-full max-w-screen-md">
      <div className="grid grid-cols-3 gap-3">
        {completeHotelList.map((hotel, index) => (
          <div key={`hotel-${index}`} className={`p-2 ${hotelColors[hotel.name]} rounded flex items-center`}>
            <Image 
              src={hotelImages[hotel.name]} 
              alt={hotel.name} 
              width={32}
              height={32}
              className="object-contain mr-2"
            />
            <span>{hotel.name}</span>
            {(putTile && isMyTurn && hotel.tiles > 0 && !bornNewHotel && canPurchaseStock) && (
              <button 
                className="ml-2 px-2 py-1 bg-white rounded text-sm"
                onClick={() => handleBuyStock(hotel.name)}
              >
                株券を買う
              </button>
            )}
            {bornNewHotel && hotel.tiles === 0 && (
              <button 
                className="ml-2 px-2 py-1 bg-white rounded text-sm"
                onClick={() => handleHotelSelection(index, hotel.name)}
              >
                建設する
              </button>
            )}
            <span className="font-bold text-white ml-auto">{hotel.tiles} マス</span>
          </div>
        ))}
      </div>
    </div>
  );
} 