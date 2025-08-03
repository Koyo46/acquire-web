import React from 'react';
import { hotelColors } from '@/src/utils/constants';

interface Hotel {
  name: string;
  tiles: Array<{ col: number; row: string }>;
}

interface MergeInfo {
  mergingHotels: Hotel[];
  survivingHotel: Hotel;
  cannotMerge: boolean;
  largeHotels?: Hotel[]; // サイズ11以上のホテル
}

interface TilePlacementConfirmModalProps {
  isOpen: boolean;
  mergeInfo: MergeInfo | null;
  selectedMergeDirection: number;
  onConfirm: () => void;
  onCancel: () => void;
  onSwapMergeDirection: () => void;
}

export const TilePlacementConfirmModal: React.FC<TilePlacementConfirmModalProps> = ({
  isOpen,
  mergeInfo,
  selectedMergeDirection,
  onConfirm,
  onCancel,
  onSwapMergeDirection,
}) => {
  if (!isOpen) return null;

  const canPlaceTile = !mergeInfo?.cannotMerge;
  const hasMerge = mergeInfo && mergeInfo.mergingHotels.length > 0;
  
  // 同サイズのホテルかどうかをチェック
  const isSameSize = hasMerge && 
    mergeInfo.mergingHotels.length === 1 &&
    mergeInfo.mergingHotels[0].tiles.length === mergeInfo.survivingHotel.tiles.length;

  // 選択された合併方向に基づいて表示を調整
  const displayMergingHotel = isSameSize && selectedMergeDirection === 1 
    ? mergeInfo.survivingHotel 
    : mergeInfo?.mergingHotels[0];
  
  const displaySurvivingHotel = isSameSize && selectedMergeDirection === 1 
    ? mergeInfo.mergingHotels[0] 
    : mergeInfo?.survivingHotel;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center pt-80 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">タイル配置の確認</h3>
        
        {/* 配置不可の場合 */}
        {mergeInfo?.cannotMerge && mergeInfo.largeHotels && (
          <div className="mb-4">
            <div className="flex items-center text-red-600 mb-2">
              <span className="text-xl mr-2">⚠️</span>
              <span className="font-semibold">この位置には配置できません</span>
            </div>
            <p className="text-gray-700 mb-2">
              サイズ11以上のホテル同士は合併できません：
            </p>
            <ul className="list-disc list-inside text-gray-600">
              {mergeInfo.largeHotels.map((hotel, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-white text-sm ${hotelColors[hotel.name] || 'bg-gray-400'}`}>
                    {hotel.name}
                  </span>
                  (サイズ: {hotel.tiles.length})
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 合併が発生する場合 */}
        {hasMerge && !mergeInfo.cannotMerge && displayMergingHotel && displaySurvivingHotel && (
          <div className="mb-4">
            <p className="text-gray-700 mb-3">
              この配置により以下の合併が発生します：
            </p>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-center">
                <div className="font-semibold text-red-600 flex items-center justify-center gap-2">
                  合併元: 
                  <span className={`px-2 py-1 rounded text-white ${hotelColors[displayMergingHotel.name] || 'bg-gray-400'}`}>
                    {displayMergingHotel.name}
                  </span>
                  (サイズ: {displayMergingHotel.tiles.length})
                </div>
                <div className="my-2 flex items-center justify-center">
                  <span className="text-2xl">↓</span>
                  {isSameSize && (
                    <button
                      onClick={onSwapMergeDirection}
                      className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                    >
                      ⇄ 交換
                    </button>
                  )}
                </div>
                <div className="font-semibold text-green-600 flex items-center justify-center gap-2">
                  合併先: 
                  <span className={`px-2 py-1 rounded text-white ${hotelColors[displaySurvivingHotel.name] || 'bg-gray-400'}`}>
                    {displaySurvivingHotel.name}
                  </span>
                  (サイズ: {displaySurvivingHotel.tiles.length})
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 通常の配置確認 */}
        {!hasMerge && !mergeInfo?.cannotMerge && (
          <p className="text-gray-700 mb-4">配置を確定しますか？</p>
        )}
        
        <div className="flex gap-4 justify-end">
          <button
            className={`px-6 py-2 rounded transition-colors ${
              canPlaceTile
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={onConfirm}
            disabled={!canPlaceTile}
          >
            確定する{!canPlaceTile && '(無効)'}
          </button>
          <button
            className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};