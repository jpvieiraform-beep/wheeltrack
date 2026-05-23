import React from 'react';

interface GridExpositorProps {
  currentDisplay: any;
  miniatures: any[];
  selectedSlot: any;
  movingCar: any;
  activeGalleryUrl: string | null;
  onBack: () => void;
  onSlotClick: (row: number, col: number, miniature: any) => void;
  onCancelMove: () => void;
  onStartMove: (miniature: any) => void;
  onToggleTrade: (miniature: any, currentTradeStatus: boolean) => void;
  onEdit: () => void;
  onCreate: () => void;
  onDelete: (miniature: any) => void;
}

export default function GridExpositor({
  currentDisplay, miniatures, selectedSlot, movingCar, activeGalleryUrl,
  onBack, onSlotClick, onCancelMove, onStartMove, onToggleTrade, onEdit, onCreate, onDelete
}: GridExpositorProps) {
  
  const cleanDisplayName = (fullName: string) => {
    if (fullName && fullName.startsWith('[')) {
      const closingBracket = fullName.indexOf(']');
      if (closingBracket > 1) return fullName.substring(closingBracket + 1).trim();
    }
    return fullName || '';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <button onClick={onBack} className="text-xs text-yellow-500 underline mb-2 block">← Voltar para o Dashboard</button>
          <h1 className="text-2xl font-bold text-gray-100">{cleanDisplayName(currentDisplay.name)}</h1>
        </div>
      </div>

      {movingCar && (
        <div className="bg-blue-950/50 border border-blue-500 text-blue-300 p-3 rounded-lg text-xs text-center flex justify-between items-center shadow-md">
          <span>🔄 A mover <strong>{movingCar.name}</strong>. Escolhe uma vaga vazia neste mural.</span>
          <button onClick={onCancelMove} className="bg-blue-900 px-3 py-1 rounded-md text-white font-bold text-xs hover:bg-blue-800 transition">Cancelar</button>
        </div>
      )}

      <div className="bg-neutral-900 p-4 rounded-2xl border-4 border-neutral-800 shadow-2xl overflow-x-auto">
        <div className="min-w-[700px] space-y-2">
          {Array.from({ length: currentDisplay.rows_count }).map((_, rIdx) => (
            <div key={`row-${rIdx}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentDisplay.columns_count}, minmax(0, 1fr))` }}>
              {Array.from({ length: currentDisplay.columns_count }).map((_, cIdx) => {
                const r = rIdx + 1; 
                const c = cIdx + 1;
                const min = miniatures.find(m => m.display_row === r && m.display_column === c);
                
                let ring = '';
                if (min) {
                  if (min.rarity_type === 'Super Treasure Hunt') ring = 'ring-2 ring-amber-500 border-transparent';
                  else if (min.rarity_type === 'Treasure Hunt') ring = 'ring-2 ring-slate-300 border-transparent';
                  else if (min.rarity_type === 'Premium') ring = 'ring-2 ring-blue-500 border-transparent';
                }

                return (
                  <div key={`slot-${r}-${c}`} onClick={() => onSlotClick(r, c, min)} className={`relative aspect-[4/3] border border-gray-700 rounded bg-gray-900 flex flex-col items-center justify-center p-1 cursor-pointer transition hover:scale-[1.03] hover:border-yellow-500 shadow-sm ${ring} ${movingCar?.id === min?.id ? 'opacity-30' : ''}`}>
                    <span className="absolute top-0.5 left-1 text-[7px] text-gray-500 font-mono">L{r}C{c}</span>
                    {min ? (
                      <div className="w-full h-full relative flex flex-col justify-end text-center">
                        {min.photo_url && <img src={min.photo_url} alt={min.name} className="absolute inset-0 w-full h-full object-cover opacity-75 rounded" />}
                        <p className="text-[9px] font-bold truncate bg-black/80 px-1 rounded z-10 text-white">{min.name}</p>
                        {min.is_for_trade && <span className="absolute top-0.5 right-1 text-[9px] bg-blue-600 px-1.5 rounded-full font-black text-white shadow">🔄</span>}
                      </div>
                    ) : (
                      <span className="text-[8px] text-gray-700 font-light">{movingCar ? 'Colocar' : '+ Nicho'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedSlot && !movingCar && (
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col md:flex-row gap-6 shadow-lg">
          <div className="w-56 flex flex-col gap-2 flex-shrink-0">
            <div className="w-full aspect-[4/3] bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
              {activeGalleryUrl ? <img src={activeGalleryUrl} alt="Gallery" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-600">Sem Imagem</span>}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-yellow-500 tracking-tight">{selectedSlot.miniature ? selectedSlot.miniature.name : 'Nicho Disponível'}</h2>
              {selectedSlot.miniature?.is_for_trade ? (
                <span className="text-[9px] bg-blue-500 text-white font-black px-2.5 py-0.5 rounded-full shadow animate-pulse">🔄 MARCADO PARA TROCA (REPETIDO)</span>
              ) : selectedSlot.miniature && (
                <span className="text-[9px] bg-gray-800 text-gray-400 font-bold px-2.5 py-0.5 rounded-full border border-gray-700">🔒 Item Privado</span>
              )}
            </div>

            {selectedSlot.miniature && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-800 pt-3 mt-3 text-gray-300 font-light">
                <div><span className="text-gray-500 block font-medium">Série:</span> {selectedSlot.miniature.series || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Pintura:</span> {selectedSlot.miniature.color || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Toy Card Code:</span> {selectedSlot.miniature.code || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Ano da Linha:</span> {selectedSlot.miniature.release_year || '---'}</div>
              </div>
            )}

            <div className="flex gap-2 mt-5 border-t border-gray-800 pt-3">
              {selectedSlot.miniature ? (
                <>
                  <button onClick={() => onToggleTrade(selectedSlot.miniature, selectedSlot.miniature.is_for_trade)} className={`px-3 py-1.5 font-bold text-xs rounded-lg uppercase transition-colors ${selectedSlot.miniature.is_for_trade ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>
                    {selectedSlot.miniature.is_for_trade ? '🔄 Mover para Coleção' : '➕ Marcar como Repetido'}
                  </button>
                  <button onClick={onEdit} className="px-3 py-1.5 bg-yellow-500 text-gray-950 font-bold text-xs rounded-lg uppercase hover:bg-yellow-400 transition">✏️ Editar</button>
                  <button onClick={() => onStartMove(selectedSlot.miniature)} className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg uppercase hover:bg-blue-500 transition">🔄 Mover</button>
                  <button onClick={() => onDelete(selectedSlot.miniature)} className="px-3 py-1.5 bg-red-950 border border-red-700 text-red-200 font-bold text-xs rounded-lg uppercase hover:bg-red-900 transition">🗑️ Remover</button>
                </>
              ) : (
                <button onClick={onCreate} className="px-4 py-2 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase hover:bg-yellow-400 transition">Vincular Carrinho neste Slot</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}