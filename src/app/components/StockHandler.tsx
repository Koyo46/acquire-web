import { useGame } from "@/src/app/contexts/GameContext";
import { caluculateStockPrice } from "@/src/utils/hotelStockBoard";
export default function StockHandler({ gameId, playerId, players }: { gameId: string, playerId: string, players: string[] }) {
  const { preMergeHotelData, mergingHotels, setMergingHotels, currentMergingHotel, setCurrentMergingHotel } = useGame() || {};
  const handleMergeComplete = async () => {
    if (mergingHotels && mergingHotels.length > 0) {
      const remainingHotels = mergingHotels.slice(1);
      if (setMergingHotels) {
        setMergingHotels(remainingHotels);
      }
      if (setCurrentMergingHotel) {
        setCurrentMergingHotel(remainingHotels[0] || null);
      }
    }
  };
  const sellShares = (hotel: any) => {
    console.log(hotel);
    handleMergeComplete();
  }

  const keepShares = (hotel: any) => {
    console.log(hotel);
    handleMergeComplete();

  }

  const exchangeShares = (hotel: any) => {
    console.log(hotel);
    handleMergeComplete();
  }

  return (
    currentMergingHotel && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">買収される{currentMergingHotel.name}の株をどうしますか？</h3>
          {/* マージ前のタイル数を表示 */}
          <p>マージ前のタイル数: {preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount}</p>
          現在の株価：{caluculateStockPrice(currentMergingHotel.name, preMergeHotelData?.find(hotel => hotel.id === currentMergingHotel.id)?.tileCount)}
          <div className="flex gap-4 justify-end">
            <button className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors" onClick={() => sellShares(currentMergingHotel)}>
              売却する
            </button>
            <button className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" onClick={() => keepShares(currentMergingHotel)}>
              保持する
            </button>
            <button className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" onClick={() => exchangeShares(currentMergingHotel)}>
              持っている株を買収先の株と2:1で交換する
            </button>
          </div>
        </div>
      </div>
    )
  );
}
