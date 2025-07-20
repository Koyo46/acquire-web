// Environment utility and tile distribution patterns

export const isDevelopment = (): boolean => {
  const env = process.env.NEXT_PUBLIC_ENV;
  const nodeEnv = process.env.NODE_ENV;
  console.log('Environment check:', { env, nodeEnv, allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')) });
  const result = env === 'development' || (!env && nodeEnv === 'development');
  console.log('isDevelopment result:', result);
  return result;
};

export const isProduction = (): boolean => {
  const env = process.env.NEXT_PUBLIC_ENV;
  const nodeEnv = process.env.NODE_ENV;
  return env === 'production' || (!env && nodeEnv === 'production');
};

export const isDebugTiles = (): boolean => {
  return process.env.NEXT_PUBLIC_DEBUG_TILES === 'true';
};

// Tile distribution patterns for development environment
export const getDevTilePattern = (playerIndex: number, tileIndex: number): string => {
  // プレイヤーごとの初期6枚の配布パターン
  if (tileIndex < 6) {
    const row = String.fromCharCode(65 + playerIndex); // A, B, C, D, ...
    const col = tileIndex + 1; // 1, 2, 3, 4, 5, 6
    return `${col}${row}`;
  }
  
  // 7番目以降のタイル配布パターン（7, 8, 9, ...）
  const remainingTileNumber = tileIndex - 5; // 7から始まる
  const totalCols = 12;
  const col = ((remainingTileNumber - 1) % totalCols) + 1;
  const row = String.fromCharCode(65 + Math.floor((remainingTileNumber - 1) / totalCols));
  
  return `${col}${row}`;
};

// 開発環境用のタイル配布順序を生成
export const generateDevTileOrder = (totalPlayers: number): string[] => {
  const tiles: string[] = [];
  
  // 各プレイヤーの初期6枚を配布
  // プレイヤー1: 1A, 2A, 3A, 4A, 5A, 6A
  // プレイヤー2: 1B, 2B, 3B, 4B, 5B, 6B
  // プレイヤー3: 1C, 2C, 3C, 4C, 5C, 6C
  // プレイヤー4: 1D, 2D, 3D, 4D, 5D, 6D
  for (let playerIndex = 0; playerIndex < totalPlayers; playerIndex++) {
    for (let tileIndex = 0; tileIndex < 6; tileIndex++) {
      const row = String.fromCharCode(65 + playerIndex); // A, B, C, D, ...
      const col = tileIndex + 1; // 1, 2, 3, 4, 5, 6
      tiles.push(`${col}${row}`);
    }
  }
  
  console.log('Generated dev tile order:', tiles);
  return tiles;
};

// 本番環境用のランダムタイル配布
export const generateRandomTileOrder = (totalTiles: number): number[] => {
  const indices = Array.from({ length: totalTiles }, (_, i) => i);
  return indices.sort(() => Math.random() - 0.5);
};