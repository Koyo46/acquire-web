import { supabase } from "@/src/utils/supabaseClient";

export const tileKindToPosition = (tileKind: number) => {
  const col = Math.floor((tileKind - 1) / 9) + 1;
  const row = "ABCDEFGHI"[(tileKind - 1) % 9];
  return { col, row };
};

export const positionToTileKind = (col: number, row: string) => {
  const rowIndex = "ABCDEFGHI".indexOf(row);
  return (col - 1) * 9 + rowIndex + 1;
};

export const positionToTileId = async (col: number, row: string, gameId: string) => {
  const tileKind = positionToTileKind(col, row);
  const { data, error } = await supabase.from("tiles").select("id").eq("game_id", gameId).eq("tile_kind", tileKind).single();
  if (error) {
    console.error("タイルID取得エラー:", error);
    return null;
  }
  return data.id;
};

export const tileIdToPosition = async (tileID: string, gameId: string) => {
  const { data, error } = await supabase.from("tiles").select("tile_kind").eq("id", tileID).eq("game_id", gameId).single();
  if (error) {
    console.error("タイルID取得エラー:", error);
    return null;
  }
  const col = Math.floor((Number(data.tile_kind) - 1) / 9) + 1;
  const row = "ABCDEFGHI"[(Number(data.tile_kind) - 1) % 9];
  return { col, row };
};