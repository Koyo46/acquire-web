import { supabase } from "@/src/utils/supabaseClient";

export const getStockPriceByHotelName=async(hotelName:string)=>{
  const {data,error}=await supabase.from("hotels").select("tile_ids").eq("hotel_name", hotelName).single();
  if(error){
    console.error("ホテルデータ取得エラー:", error);
    return 0;
  }
  return calculateStockPrice(hotelName, data.tile_ids.length);
}

export const calculateStockPrice = (hotelName: string, tileCount: number) => {
  let stockPrice: number=0;
  if (hotelName === "空"||hotelName === "雲") { 
    if (tileCount === 2) {
      stockPrice = 200;
    } else if (tileCount === 3) {
      stockPrice = 300;
    } else if (tileCount === 4) {
      stockPrice = 400;
    } else if (tileCount === 5) {
      stockPrice = 500;
    } else if (tileCount >= 6&&tileCount <= 10) {
      stockPrice = 600;
    } else if (tileCount >= 11&&tileCount <= 20) {
      stockPrice = 700;
    } else if (tileCount >= 21&&tileCount <= 30) {
      stockPrice = 800;
    } else if (tileCount >= 31&&tileCount <= 40) {
      stockPrice = 900;
    } else if (tileCount >= 41) {
      stockPrice = 1000;
    }
  } else if (hotelName === "晴"||hotelName === "雨"||hotelName === "霧") {
    if (tileCount === 2) {
      stockPrice = 300;
    } else if (tileCount === 3) {
      stockPrice = 400;
    } else if (tileCount === 4) {
      stockPrice = 500;
    } else if (tileCount === 5) {
      stockPrice = 600;
    } else if (tileCount >= 6&&tileCount <= 10) {
      stockPrice = 700;
    } else if (tileCount >= 11&&tileCount <= 20) {
      stockPrice = 800;
    } else if (tileCount >= 21&&tileCount <= 30) {
      stockPrice = 900;
    } else if (tileCount >= 31&&tileCount <= 40) {
      stockPrice = 1000;
    } else if (tileCount >= 41) {
      stockPrice = 1100;
    }
  }else if (hotelName === "雷"||hotelName === "嵐") {
    if (tileCount === 2) {
      stockPrice = 400;
    } else if (tileCount === 3) {
      stockPrice = 500;
    } else if (tileCount === 4) {
      stockPrice = 600;
    } else if (tileCount === 5) {
      stockPrice = 700;
    } else if (tileCount >= 6&&tileCount <= 10) {
      stockPrice = 800;
    } else if (tileCount >= 11&&tileCount <= 20) {
      stockPrice = 900;
    } else if (tileCount >= 21&&tileCount <= 30) {
      stockPrice = 1000;
    } else if (tileCount >= 31&&tileCount <= 40) {
      stockPrice = 1100;
    } else if (tileCount >= 41) {
      stockPrice = 1200;
    }
  }
  return stockPrice;
};

export const getDividendByHotelName=async(hotelName:string)=>{
  const dividend=await getStockPriceByHotelName(hotelName)*10;
  return dividend;
}