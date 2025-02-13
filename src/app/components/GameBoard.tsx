"use client";
import Grid from "./Grid";
import TurnManager from "./TurnManager";
// import HotelList from "./HotelList";
// import PlayerHand from "./PlayerHand";

export default function GameBoard({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {

  return (
    <div>
      <TurnManager gameId={gameId} playerId={playerId} players={players} />
      <Grid gameId={gameId} playerId={playerId} />
    </div>
  );
}
