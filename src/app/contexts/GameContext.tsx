"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/src/utils/supabaseClient";

// タイプ定義を改善
interface Hotel {
  id: string;
  name: string;
  tileCount: number;
}

interface MergeState {
  merging_hotels?: Hotel[];
  pre_merge_hotel_data?: Hotel[];
  players_queue?: string[];
  current_player?: string | null;
  current_merging_hotel?: Hotel | null;
  is_merging?: boolean;
}

interface GameContextType {
  currentTurn: string | null;
  endTurn: (nextPlayerId: string) => Promise<void>;
  fetchGameStarted: (gameId: string) => Promise<boolean>;
  gameStarted: boolean;
  setGameStarted: (gameStarted: boolean) => void;
  currentMergingHotel: Hotel | null;
  setCurrentMergingHotel: React.Dispatch<React.SetStateAction<Hotel | null>>;
  preMergeHotelData: Hotel[];
  setPreMergeHotelData: React.Dispatch<React.SetStateAction<Hotel[]>>;
  mergingHotels: Hotel[];
  setMergingHotels: React.Dispatch<React.SetStateAction<Hotel[]>>;
  mergingPlayersQueue: string[];
  setMergingPlayersQueue: React.Dispatch<React.SetStateAction<string[]>>;
  currentMergingPlayer: string | null;
  setCurrentMergingPlayer: React.Dispatch<React.SetStateAction<string | null>>;
}

interface PostgresChangePayload {
  new: {
    current_turn?: string;
    status?: string;
    merge_state?: MergeState;
  };
  old: {
    current_turn?: string;
    status?: string;
    merge_state?: MergeState;
  };
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentMergingHotel, setCurrentMergingHotel] = useState<Hotel | null>(null);
  const [preMergeHotelData, setPreMergeHotelData] = useState<Hotel[]>([]);
  const [mergingHotels, setMergingHotels] = useState<Hotel[]>([]);
  const [mergingPlayersQueue, setMergingPlayersQueue] = useState<string[]>([]);
  const [currentMergingPlayer, setCurrentMergingPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchTurn = async () => {
      const { data, error } = await supabase
        .from("game_tables")
        .select("current_turn, status")
        .eq("id", gameId)
        .single();

      if (error) console.error("ターン取得エラー:", error);
      else {
        setCurrentTurn(data.current_turn);
        setGameStarted(data.status === "started");
      }
    };

    fetchTurn();

    const channel = supabase
      .channel(`game_tables_${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${gameId}` }, (payload: PostgresChangePayload) => {
        console.log("✅ Realtime 更新検知:", payload);
        console.log("Current Turn before:", currentTurn);
        if (payload.new) {
          // current_turnが存在する場合は更新（nullでも更新する）
          if (payload.new.hasOwnProperty('current_turn')) {
            console.log("Current Turn after:", payload.new.current_turn);
            setCurrentTurn(payload.new.current_turn || null);
          }
          // statusが存在する場合は更新
          if (payload.new.status) {
            console.log("Status updated:", payload.new.status);
            setGameStarted(payload.new.status === "started");
          }
        }
      })
      .subscribe((status) => {
        console.log("リアルタイムチャンネル接続状態:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const endTurn = async (nextPlayerId: string) => {
    if (!gameId) return;

    console.log("endTurn関数実行開始:", { gameId, nextPlayerId });
    
    try {
      // データベースを更新
      const { data, error } = await supabase
        .from("game_tables")
        .update({ current_turn: nextPlayerId })
        .eq("id", gameId)
        .select("current_turn");

      if (error) {
        console.error("ターン更新エラー:", error);
        throw error;
      }

      console.log("ターン更新成功:", { 
        更新前: currentTurn, 
        更新後: data?.[0]?.current_turn,
        期待値: nextPlayerId 
      });

      // 更新が成功した場合、ローカル状態も即座に更新
      if (data && data[0]?.current_turn === nextPlayerId) {
        console.log("ローカル状態を即座に更新:", nextPlayerId);
        setCurrentTurn(nextPlayerId);
      } else {
        console.warn("データベース更新とローカル状態の不一致:", {
          期待値: nextPlayerId,
          実際の値: data?.[0]?.current_turn
        });
      }

    } catch (error) {
      console.error("endTurn実行中にエラーが発生:", error);
      // エラーが発生した場合は手動で状態を更新
      console.log("エラー後のフォールバック処理: ローカル状態を手動更新");
      setCurrentTurn(nextPlayerId);
    }
  };

  const fetchGameStarted = async (gameId: string) => {
    const { data } = await supabase
      .from("game_tables")
      .select("status")
      .eq("id", gameId)
      .single();
    if (data?.status === "started") {
      return true;
    }
    return false;
  };

  return (
    <GameContext.Provider value={{ 
      currentTurn, 
      endTurn, 
      fetchGameStarted, 
      gameStarted, 
      setGameStarted, 
      currentMergingHotel, 
      setCurrentMergingHotel, 
      preMergeHotelData, 
      setPreMergeHotelData, 
      mergingHotels, 
      setMergingHotels, 
      mergingPlayersQueue, 
      setMergingPlayersQueue, 
      currentMergingPlayer, 
      setCurrentMergingPlayer
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
