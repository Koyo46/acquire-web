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
  status TEXT CHECK (status IN ('waiting', 'ongoing', 'completed')) DEFAULT 'waiting',
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
  placed BOOLEAN DEFAULT FALSE -- 配置済みかどうか
);

-- 5️⃣ `hands` テーブル（プレイヤーの手牌管理）
CREATE TABLE hands (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tile_id INT REFERENCES tiles(id) ON DELETE CASCADE -- タイルの ID
);
