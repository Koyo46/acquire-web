INSERT INTO users (id, created_at, username, email, avatar_url)
VALUES (
  gen_random_uuid(),
  NOW(),
  'test',
  'test@example.com',
  'https://example.com/avatar.jpg'
),
(
  gen_random_uuid(),
  NOW(),
  'test2',
  'test2@example.com',
  'https://example.com/avatar.jpg'
);

INSERT INTO game_tables (id, created_at, status, current_turn)
VALUES (
  gen_random_uuid(),
  NOW(),
  'ongoing',
  (SELECT id FROM users WHERE username = 'test')
);

INSERT INTO game_players (game_id, player_id)
VALUES (
  (SELECT id FROM game_tables WHERE status = 'ongoing'),
  (SELECT id FROM users WHERE username = 'test')
),
(
  (SELECT id FROM game_tables WHERE status = 'ongoing'),
  (SELECT id FROM users WHERE username = 'test2')
);

INSERT INTO tiles (game_id, tile_kind)
SELECT 
  g.id, 
  t.tile_kind
FROM 
  game_tables g, 
  LATERAL (
    SELECT generate_series(1, 108) AS tile_kind
  ) AS t
WHERE g.status = 'ongoing';
  