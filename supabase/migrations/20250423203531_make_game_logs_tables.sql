-- ========================================
-- ゲームログテーブル作成: `game_logs`
-- ========================================
CREATE TABLE game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  log_type TEXT CHECK (log_type IN ('tile_placement', 'dividend_payment', 'hotel_merge', 'stock_purchase', 'stock_sell', 'hotel_establish')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  data JSONB DEFAULT NULL
);

-- インデックスの追加
CREATE INDEX game_logs_game_id_idx ON game_logs(game_id);
CREATE INDEX game_logs_timestamp_idx ON game_logs(timestamp);
