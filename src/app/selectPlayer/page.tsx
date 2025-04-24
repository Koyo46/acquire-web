"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/utils/supabaseClient";
export default function SelectPlayer() {
  const [player1Name, setPlayer1Name] = useState<string>("");
  const [player2Name, setPlayer2Name] = useState<string>("");
  const router = useRouter();

  const handlePlayer1Select = async () => {
    if (!player1Name.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ username: player1Name })
      .select("id")
      .single();
      
    if (insertError) {
      console.error("ユーザー作成エラー:", insertError);
      return;
    }
    
    const userId = newUser.id;
    
    // game_playersテーブルのID 1のレコードを更新
    const { error: updateError } = await supabase
      .from("game_players")
      .update({ player_id: userId })
      .eq("id", 1);
      
    if (updateError) {
      console.error("プレイヤー更新エラー:", updateError);
      return;
    }
    
    router.push(`/?playerId=${userId}`);
  };

  const handlePlayer2Select = async () => {
    if (!player2Name.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ username: player2Name })
      .select("id")
      .single();
      
    if (insertError) {
      console.error("ユーザー作成エラー:", insertError);
      return;
    }
    
    const userId = newUser.id;
    
    // game_playersテーブルのID 1のレコードを更新
    const { error: updateError } = await supabase
      .from("game_players")
      .update({ player_id: userId })
      .eq("id", 2);
      
    if (updateError) {
      console.error("プレイヤー更新エラー:", updateError);
      return;
    }
    router.push(`/?playerId=${userId}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="flex flex-col items-center gap-4 p-4">
        <h2 className="text-xl font-bold">プレイヤーを選択</h2>
        <div className="flex gap-4">
          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="プレイヤー1" 
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded bg-blue-500 text-white"
              onClick={handlePlayer1Select}
            >
              参加する
            </button>
          </div>
          <div className="flex gap-4 flex-col">
            <input 
              type="text" 
              placeholder="プレイヤー2"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded bg-blue-500 text-white"
              onClick={handlePlayer2Select}
            >
            参加する
          </button>
          </div>  
        </div>
      </div>
    </div>
  );
}
