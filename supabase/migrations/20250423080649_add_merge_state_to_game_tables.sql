-- ========================================
-- マージ状態（併合処理）を保存するためのカラムをgame_tablesテーブルに追加
-- ========================================

-- game_tablesテーブルにmerge_state列を追加
ALTER TABLE game_tables ADD COLUMN merge_state JSONB DEFAULT NULL;

-- merge_stateの説明を追加
COMMENT ON COLUMN game_tables.merge_state IS 'ホテルマージ処理中の状態を保存するためのJSONフィールド。マージ中のホテル情報、プレイヤーキュー、現在のプレイヤーなどを含む';

-- インデックスの追加（オプション）
CREATE INDEX idx_game_tables_merge_state ON game_tables USING GIN (merge_state);