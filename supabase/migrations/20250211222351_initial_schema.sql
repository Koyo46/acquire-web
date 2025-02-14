-- ========================================
-- 初期スキーマ: `game_tables`, `users`, `tiles`, `hands`
-- ========================================
-- 1️⃣ `users` テーブル（プレイヤー情報）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  username TEXT NOT NULL, -- プレイヤー名
  email TEXT UNIQUE, -- メールアドレス（任意）
  avatar_url TEXT -- プレイヤーのアイコン（任意）
);

-- 2️⃣ `game_tables` テーブル（ゲームの基本情報）
CREATE TABLE game_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT CHECK (status IN ('waiting', 'ongoing','started', 'completed')) DEFAULT 'waiting',
  current_turn UUID REFERENCES users(id), -- 現在のターンのプレイヤー
  turn_order UUID[] NOT NULL DEFAULT '{}',-- ゲーム内のプレイヤーの順番
  winner UUID REFERENCES users(id) -- 勝者（ゲーム終了時）
);

-- 3️⃣ `game_players` テーブル（ゲームに参加しているプレイヤー）
CREATE TABLE game_players (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- 4️⃣ `tiles` テーブル（盤面のタイル管理）
CREATE TABLE tiles (
  id SERIAL PRIMARY KEY,
  tile_kind INT,
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id), -- そのタイルを持つプレイヤー
  placed BOOLEAN DEFAULT FALSE, -- 配置済みかどうか
  dealed BOOLEAN DEFAULT FALSE  -- 配られたかどうか
);

-- 5️⃣ `hands` テーブル（プレイヤーの手牌管理）
CREATE TABLE hands (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tile_id INT REFERENCES tiles(id) ON DELETE CASCADE -- タイルの ID
);

CREATE OR REPLACE FUNCTION check_max_hand_size()
RETURNS TRIGGER AS $$
BEGIN
  -- 指定した player_id の手牌の数をカウント
  IF (SELECT COUNT(*) FROM hands WHERE game_id = NEW.game_id AND player_id = NEW.player_id) >= 6 THEN
    RAISE EXCEPTION 'プレイヤーの手札は6枚までしか持てません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_hand_limit
BEFORE INSERT ON hands
FOR EACH ROW EXECUTE FUNCTION check_max_hand_size();
