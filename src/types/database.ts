// Database types for the Acquire web application

export interface GameTable {
  id: string;
  status: GameStatus;
  table_name?: string;
  max_players?: number;
  created_at: string;
  created_by?: string;
  current_turn?: string;
  turn_order?: string[];
  winner?: string;
  merge_state?: MergeState;
}

export type GameStatus = "waiting" | "started" | "ongoing" | "completed";

export interface Hotel {
  id: string;
  name: string;
  tileCount: number;
}

export interface MergeState {
  merging_hotels?: Hotel[];
  pre_merge_hotel_data?: Hotel[];
  players_queue?: string[];
  current_player?: string | null;
  current_merging_hotel?: Hotel | null;
  is_merging?: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  balance: number;
  game_id?: string;
  created_at?: string;
}

export interface GamePlayer {
  id: number;
  game_id: string;
  player_id: string;
  joined_at?: string;
}

export interface Tile {
  id: number;
  game_id: string;
  tile_kind: number;
  placed: boolean;
  dealed: boolean;
  owner_id?: string;
}

export interface Hand {
  game_id: string;
  player_id: string;
  tile_id: number;
}

export interface HotelData {
  id: number;
  game_id: string;
  player_id: string;
  hotel_name: string;
  tile_ids: number[];
  hotel_home_tile_id: number;
}

export interface HotelInvestor {
  id: string;
  game_id: string;
  user_id: string;
  hotel_name: string;
  shares: number;
}

export interface GameLog {
  id: string;
  game_id: string;
  log_type: string;
  message: string;
  timestamp: string;
  data?: any;
}

// UI specific types
export interface TablePanelData extends GameTable {
  current_players?: number;
}

export interface CreateTableData {
  table_name: string;
  max_players: number;
}

// Hotel names enum
export enum HotelNames {
  SORA = "空",
  KUMO = "雲", 
  HARE = "晴",
  KIRI = "霧",
  KAMINARI = "雷",
  ARASHI = "嵐",
  AME = "雨"
}

// Log types enum
export enum LogTypes {
  TILE_PLACEMENT = "tile_placement",
  HOTEL_ESTABLISH = "hotel_establish",
  STOCK_PURCHASE = "stock_purchase",
  STOCK_SELL = "stock_sell",
  DIVIDEND_PAYMENT = "dividend_payment",
  HOTEL_MERGE = "hotel_merge"
}