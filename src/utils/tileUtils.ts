export const tileIdToPosition = (tileId: number) => {
  const col = Math.floor((tileId - 1) / 9) + 1;
  const row = "ABCDEFGHI"[(tileId - 1) % 9];
  return { col, row };
};

export const positionToTileId = (col: number, row: string) => {
  const rowIndex = "ABCDEFGHI".indexOf(row);
  return (col - 1) * 9 + rowIndex + 1;
};
