-- ========================================
-- タイムゾーン対応: TIMESTAMPをTIMESTAMPTZに変更
-- ========================================

-- game_logsテーブルのタイムスタンプをタイムゾーン付きに変更
ALTER TABLE game_logs 
ALTER COLUMN timestamp TYPE TIMESTAMPTZ USING timestamp AT TIME ZONE 'UTC';

ALTER TABLE game_logs 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- game_tablesテーブルのタイムスタンプもタイムゾーン付きに変更
ALTER TABLE game_tables 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- usersテーブルのタイムスタンプもタイムゾーン付きに変更
ALTER TABLE users 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- デフォルト値を更新（NOW()はUTC時間を返すので適切）
ALTER TABLE game_logs 
ALTER COLUMN timestamp SET DEFAULT NOW();

ALTER TABLE game_logs 
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE game_tables 
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE users 
ALTER COLUMN created_at SET DEFAULT NOW(); 