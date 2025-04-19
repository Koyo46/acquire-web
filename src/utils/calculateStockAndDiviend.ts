import { supabase } from "@/src/utils/supabaseClient";
import { getStockPriceByHotelName } from "@/src/utils/hotelStockBoard";

export const sellStock = async (hotelName: string, playerId: string, gameId: string) => {
  try {
    // 現在の株価を取得
    const stockPrice = await getStockPriceByHotelName(hotelName);

    // ユーザーの所持株数を取得
    const { data: investorData, error: investorError } = await supabase
      .from("hotel_investors")
      .select("shares")
      .eq("hotel_name", hotelName)
      .eq("user_id", playerId)
      .eq("game_id", gameId)
      .single();

    if (investorError || !investorData) {
      console.error("株券取得エラー:", investorError);
      return;
    }

    const sharesToSell = investorData.shares;
    if (sharesToSell <= 0) {
      alert("売却可能な株券がありません。");
      return;
    }

    // 売却による収益を計算
    const revenue = sharesToSell * stockPrice;

    // ユーザーの所持金を更新
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", playerId)
      .single();

    if (userError || !userData) {
      console.error("所持金取得エラー:", userError);
      return;
    }

    const newBalance = userData.balance + revenue;

    const { error: balanceError } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("id", playerId);

    if (balanceError) {
      console.error("所持金更新エラー:", balanceError);
      return;
    }

    // 株券を削除
    const { error: deleteError } = await supabase
      .from("hotel_investors")
      .delete()
      .eq("hotel_name", hotelName)
      .eq("user_id", playerId)
      .eq("game_id", gameId);

    if (deleteError) {
      console.error("株券削除エラー:", deleteError);
      return;
    }

    alert(`株券を売却しました。収益: $${revenue}`);
  } catch (error) {
    console.error("株券売却エラー:", error);
  }
};