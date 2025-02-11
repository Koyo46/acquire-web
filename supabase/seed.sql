INSERT INTO users (id, created_at, username, email, avatar_url)
VALUES (
  gen_random_uuid(),
  NOW(),
  'test',
  'test@example.com',
  'https://example.com/avatar.jpg'
);

INSERT INTO game_tables (id, created_at, status, current_turn)
VALUES (
  gen_random_uuid(),
  NOW(),
  'ongoing',
  (SELECT id FROM users WHERE username = 'test')
);

INSERT INTO tiles (game_id, tile_id)
SELECT 
  g.id, 
  t.tile_id
FROM 
  game_tables g, 
  LATERAL (
    SELECT generate_series(1, 108) AS tile_id
  ) AS t
WHERE g.status = 'ongoing';
  