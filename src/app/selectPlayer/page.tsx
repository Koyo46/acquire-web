"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/utils/supabaseClient";
export default function SelectPlayer() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const router = useRouter();

  const handlePlayerSelect = async (player: string) => {
    setSelectedPlayer(player);
    const { data, error } = await supabase.from("users").select("id").eq("username", player).single();
    if (error) {
      console.error("ユーザー取得エラー:", error);
      return;
    }
    router.push(`/?playerId=${data.id}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="flex flex-col items-center gap-4 p-4">
        <h2 className="text-xl font-bold">プレイヤーを選択</h2>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded ${selectedPlayer === "player1" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            onClick={() => handlePlayerSelect("test")}
          >
            プレイヤー1
          </button>
          <button
            className={`px-4 py-2 rounded ${selectedPlayer === "test2" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            onClick={() => handlePlayerSelect("test2")}
          >
            プレイヤー2
          </button>
        </div>
      </div>
    </div>
  );
}
