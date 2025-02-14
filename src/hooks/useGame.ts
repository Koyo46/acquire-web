import { supabase } from "@/src/utils/supabaseClient";

export const fetchGameStarted = async (gameId: string) => {
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
