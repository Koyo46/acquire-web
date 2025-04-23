import { create } from 'zustand';
import { supabase } from '@/src/utils/supabaseClient';

type Hotel = {
  id: number;
  name: string;
  size: number;
  stockPrice: number;
};

type HotelInvestor = {
  user_id: string;
  hotel_name: string;
  shares: number;
  user_name: string;
};

type PlayerStatus = {
  id: string;
  username: string;
  balance: number;
  stocks: { [key: string]: number };
};

interface StockState {
  hotels: Hotel[];
  hotelInvestors: HotelInvestor[];
  playerStatuses: PlayerStatus[];
  isInitialized: boolean;
  // actions
  fetchHotels: (gameId: string) => Promise<void>;
  fetchHotelInvestors: (gameId: string) => Promise<void>;
  fetchPlayerStatuses: (gameId: string, players: string[]) => Promise<void>;
  updateAll: (gameId: string, players: string[]) => Promise<void>;
  subscribeToChanges: (gameId: string, players: string[]) => () => void;
}

type SetState = (fn: (state: StockState) => Partial<StockState>) => void;
type GetState = () => StockState;

export const useStockStore = create<StockState>((set: SetState, get: GetState) => ({
  hotels: [],
  hotelInvestors: [],
  playerStatuses: [],
  isInitialized: false,

  fetchHotels: async (gameId: string) => {
    console.log("ホテル情報を取得します");
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .eq("game_id", gameId);
    if (error) {
      console.error("ホテル取得エラー:", error);
      return;
    }
    const hotels = data?.map(hotel => ({
      id: hotel.id,
      name: hotel.hotel_name,
      size: hotel.tile_ids ? hotel.tile_ids.length : 0,
      stockPrice: hotel.stock_price
    }));
    set((state) => ({ hotels: hotels || [] }));
  },

  fetchHotelInvestors: async (gameId: string) => {
    console.log("株券情報を取得します");
    const { data, error } = await supabase
      .from("hotel_investors")
      .select(`
        *,
        users (
          username
        )
      `)
      .eq("game_id", gameId);
    if (error) {
      console.error("ホテル投資家取得エラー:", error);
      return;
    }
    const hotelInvestors = data?.map(investor => ({
      user_id: investor.user_id,
      hotel_name: investor.hotel_name,
      shares: investor.shares,
      user_name: investor.users.username
    }));
    set((state) => ({ hotelInvestors: hotelInvestors || [] }));
  },

  fetchPlayerStatuses: async (gameId: string, players: string[]) => {
    console.log("プレイヤー情報を取得します");
    const { data: balances, error: balanceError } = await supabase
      .from("users")
      .select("id, username, balance")
      .in("id", players);

    if (balanceError) {
      console.error("残高取得エラー:", balanceError);
      return;
    }

    const { data: stocks, error: stockError } = await supabase
      .from("hotel_investors")
      .select("user_id, hotel_name, shares")
      .eq("game_id", gameId)
      .in("user_id", players);

    if (stockError) {
      console.error("株券取得エラー:", stockError);
      return;
    }

    const statuses = balances.map(balance => {
      const playerStocks = stocks
        .filter(stock => stock.user_id === balance.id)
        .reduce((acc, stock) => {
          acc[stock.hotel_name] = stock.shares;
          return acc;
        }, {} as { [key: string]: number });

      return {
        id: balance.id,
        username: balance.username,
        balance: balance.balance,
        stocks: playerStocks
      };
    });

    set((state) => ({ playerStatuses: statuses }));
  },

  updateAll: async (gameId: string, players: string[]) => {
    console.log("データ更新を開始します");
    try {
      await Promise.all([
        get().fetchHotels(gameId),
        get().fetchHotelInvestors(gameId),
        get().fetchPlayerStatuses(gameId, players)
      ]);
      console.log("データ更新が完了しました");
      set(() => ({ isInitialized: true }));
    } catch (error) {
      console.error("データ更新エラー:", error);
      // エラーが発生しても初期化フラグは立てる
      set(() => ({ isInitialized: true }));
    }
  },

  subscribeToChanges: (gameId: string, players: string[]) => {
    // ホテル情報の変更を購読
    const hotelsChannel = supabase
      .channel("hotels_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotels", filter: `game_id=eq.${gameId}` }, () => {
        get().fetchHotels(gameId);
      })
      .subscribe();

    // 株券情報の変更を購読
    const investorsChannel = supabase
      .channel("investors_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_investors", filter: `game_id=eq.${gameId}` }, () => {
        get().fetchHotelInvestors(gameId);
        get().fetchPlayerStatuses(gameId, players);
      })
      .subscribe();

    // ユーザー情報の変更を購読
    const usersChannel = supabase
      .channel("users_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `id=in.(${players.join(",")})` }, () => {
        get().fetchPlayerStatuses(gameId, players);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(hotelsChannel);
      supabase.removeChannel(investorsChannel);
      supabase.removeChannel(usersChannel);
    };
  }
})); 