"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/src/utils/supabaseClient";

// タイプ定義を改善
interface Hotel {
  id: string;
  name: string;
  tileCount: number;
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
      .on("postgres_changes", { event: "*", schema: "public", table: "game_tables" }, (payload: any) => {
        console.log("✅ Realtime 更新検知:", payload);
        if (payload.new && payload.new.current_turn) {
          setCurrentTurn(payload.new.current_turn);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const endTurn = async (nextPlayerId: string) => {
    if (!gameId) return;

    const { error } = await supabase
      .from("game_tables")
      .update({ current_turn: nextPlayerId })
      .eq("id", gameId);

    if (error) console.error("ターン更新エラー:", error);
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
