CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES game_tables(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tile_ids INT[],
  hotel_name TEXT,
  hotel_home_tile_id INT REFERENCES tiles(id) ON DELETE CASCADE
);