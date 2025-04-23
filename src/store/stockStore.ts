import { create } from 'zustand';
import { supabase } from '@/src/utils/supabaseClient';
import { calculateStockPrice } from '@/src/utils/hotelStockBoard';
type Player = {
  id: string;
  username: string;
};

type Hotel = {
  id: string;
  name: string;
  size: number;
  stockPrice: number;
  game_id: string;
};

type HotelInvestor = {
  id: string;
  user_id: string;
  user_name: string;
  hotel_name: string;
  shares: number;
  game_id: string;
};

type PlayerStatus = {
  id: string;
  username: string;
  balance: number;
  stocks: { [key: string]: number };
};

type StockState = {
  hotels: Hotel[];
  hotelInvestors: HotelInvestor[];
  playerStatuses: PlayerStatus[];
  isInitialized: boolean;
  error: Error | null;
  // actions
  fetchHotels: (gameId: string) => Promise<void>;
  fetchHotelInvestors: (gameId: string) => Promise<void>;
  fetchPlayerStatuses: (gameId: string, players: Player[]) => Promise<void>;
  updateAll: (gameId: string, players: Player[]) => Promise<void>;
  subscribeToChanges: (gameId: string, players: Player[]) => () => void;
};


export const useStockStore = create<StockState>((set, get) => ({
  hotels: [],
  hotelInvestors: [],
  playerStatuses: [],
  isInitialized: false,
  error: null,

  fetchHotels: async (gameId: string) => {
    try {
      const { data: hotels, error } = await supabase
        .from('hotels')
        .select('id, hotel_name, tile_ids, game_id')
        .eq('game_id', gameId);

      if (error) throw error;

      const formattedHotels = (hotels || []).map(hotel => ({
        id: hotel.id,
        name: hotel.hotel_name,
        size: hotel.tile_ids ? hotel.tile_ids.length : 0,
        stockPrice: calculateStockPrice(hotel.hotel_name, hotel.tile_ids ? hotel.tile_ids.length : 0),
        game_id: hotel.game_id
      }));

      set({ hotels: formattedHotels, error: null });
    } catch (error) {
      console.error('Error fetching hotels:', error);
      set({ error: error as Error });
    }
  },

  fetchHotelInvestors: async (gameId: string) => {
    try {
      const { data: investors, error } = await supabase
        .from('hotel_investors')
        .select('*, users(username)')
        .eq('game_id', gameId);

      if (error) throw error;
      set({ hotelInvestors: investors || [], error: null });
    } catch (error) {
      console.error('Error fetching hotel investors:', error);
      set({ error: error as Error });
    }
  },

  fetchPlayerStatuses: async (gameId: string, players: Player[]) => {
    try {
      if (!players || players.length === 0) {
        throw new Error('プレイヤー情報がありません');
      }

      const validPlayers = players.filter(p => p.id && typeof p.id === 'string');
      if (validPlayers.length === 0) {
        throw new Error('有効なプレイヤーIDが見つかりません');
      }

      const { data: balances, error: balanceError } = await supabase
        .from('users')
        .select('id, balance, username')
        .in('id', validPlayers.map(p => p.id));

      if (balanceError) {
        console.error('プレイヤーの残高取得エラー:', balanceError.message);
        throw new Error(`プレイヤーの残高取得エラー: ${balanceError.message}`);
      }

      if (!balances || balances.length === 0) {
        throw new Error('プレイヤーの残高が見つかりません');
      }

      const { data: stocks, error: stockError } = await supabase
        .from('hotel_investors')
        .select('user_id, hotel_name, shares')
        .in('user_id', validPlayers.map(p => p.id));

      if (stockError) {
        console.error('株券情報取得エラー:', stockError.message);
        throw new Error(`株券情報取得エラー: ${stockError.message}`);
      }

      const playerStatuses: PlayerStatus[] = balances.map((balance: { id: string; balance: number; username: string }) => {
        const player = validPlayers.find(p => p.id === balance.id);
        if (!player) {
          console.warn(`プレイヤーが見つかりません: ${balance.id}`);
          return {
            id: balance.id,
            username: balance.username || '不明なプレイヤー',
            balance: balance.balance,
            stocks: {}
          };
        }

        const playerStocks = stocks.filter((s: { user_id: string }) => s.user_id === balance.id);
        const stocksMap = playerStocks.reduce((acc: { [key: string]: number }, curr: { hotel_name: string; shares: number }) => {
          acc[curr.hotel_name] = curr.shares;
          return acc;
        }, {});

        return {
          id: balance.id,
          username: balance.username || player.username,
          balance: balance.balance,
          stocks: stocksMap
        };
      });

      set({ playerStatuses, error: null });
    } catch (error) {
      console.error('プレイヤーステータス取得エラー:', error instanceof Error ? error.message : '不明なエラー');
      set({ error: error instanceof Error ? error : new Error('不明なエラー'), playerStatuses: [] });
    }
  },

  updateAll: async (gameId: string, players: Player[]) => {
    try {
      if (!players || players.length === 0) {
        console.warn('プレイヤー情報がありません');
        return;
      }

      set({ isInitialized: false, error: null });
      await Promise.all([
        get().fetchHotels(gameId),
        get().fetchHotelInvestors(gameId),
        get().fetchPlayerStatuses(gameId, players)
      ]);
      set({ isInitialized: true });
    } catch (error) {
      console.error('データ更新エラー:', error);
      set({ error: error as Error });
    }
  },

  subscribeToChanges: (gameId: string, players: Player[]) => {
    const hotelChannel = supabase
      .channel('hotel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotels' }, () => {
        get().fetchHotels(gameId);
      })
      .subscribe();

    const investorChannel = supabase
      .channel('investor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_investors' }, () => {
        get().fetchHotelInvestors(gameId);
        get().fetchPlayerStatuses(gameId, players);
      })
      .subscribe();

    return () => {
      hotelChannel.unsubscribe();
      investorChannel.unsubscribe();
    };
  }
})); 