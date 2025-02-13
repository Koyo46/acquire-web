export const tileKindToPosition = (tileKind: number) => {
  const col = Math.floor((tileKind - 1) / 9) + 1;
  const row = "ABCDEFGHI"[(tileKind - 1) % 9];
  return { col, row };
};

export const positionToTileKind = (col: number, row: string) => {
  const rowIndex = "ABCDEFGHI".indexOf(row);
  return (col - 1) * 9 + rowIndex + 1;
};
