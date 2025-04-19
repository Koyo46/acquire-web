"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/src/utils/supabaseClient";

interface GameContextType {
  currentTurn: string | null;
  endTurn: (nextPlayerId: string) => Promise<void>;
  fetchGameStarted: (gameId: string) => Promise<boolean>;
  gameStarted: boolean;
  setGameStarted: (gameStarted: boolean) => void;
  currentMergingHotel: any | null;
  setCurrentMergingHotel: React.Dispatch<React.SetStateAction<any | null>>;
  preMergeHotelData: any[];
  setPreMergeHotelData: React.Dispatch<React.SetStateAction<any[]>>;
  mergingHotels: any[];
  setMergingHotels: React.Dispatch<React.SetStateAction<any[]>>;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentMergingHotel, setCurrentMergingHotel] = useState<any | null>(null);
  const [preMergeHotelData, setPreMergeHotelData] = useState<any[]>([]);
  const [mergingHotels, setMergingHotels] = useState<any[]>([]);

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_tables" }, (payload) => {
        console.log("✅ Realtime 更新検知:", payload);
        setCurrentTurn(payload.new.current_turn);
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
    <GameContext.Provider value={{ currentTurn, endTurn, fetchGameStarted, gameStarted, setGameStarted, currentMergingHotel, setCurrentMergingHotel, preMergeHotelData, setPreMergeHotelData, mergingHotels, setMergingHotels }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
