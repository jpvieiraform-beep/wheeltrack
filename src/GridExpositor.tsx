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
  
  const isBox = currentDisplay.name.startsWith('[CAIXA]');

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
          <h1 className="text-2xl font-black text-gray-100 uppercase tracking-tight">
            {isBox ? '📦 ' : '🔲 '}{cleanDisplayName(currentDisplay.name)}
          </h1>
        </div>
      </div>

      {movingCar && (
        <div className="bg-blue-950/50 border border-blue-500 text-blue-300 p-3 rounded-lg text-xs text-center flex justify-between items-center shadow-md">
          <span>🔄 A mover <strong>{movingCar.name}</strong>. Escolhe o destino.</span>
          <button onClick={onCancelMove} className="bg-blue-900 px-3 py-1 rounded-md text-white font-bold text-xs hover:bg-blue-800 transition">Cancelar</button>
        </div>
      )}

      {/* ÁREA DE VISUALIZAÇÃO: GRELHA OU LISTA */}
      <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-2xl">
        {isBox ? (
          /* VISTA EM LISTA (CAIXAS) */
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {miniatures.length === 0 ? (
              <div className="text-center py-10 text-gray-600 italic">Esta caixa está vazia.</div>
            ) : (
              miniatures.map((min) => (
                <div 
                  key={min.id} 
                  onClick={() => onSlotClick(min.display_row, min.display_column, min)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition ${selectedSlot?.miniature?.id === min.id ? 'bg-gray-800 border-yellow-500' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
                >
                  <div className="w-10 h-10 bg-black rounded overflow-hidden flex items-center justify-center">
                    {min.photo_url ? <img src={min.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs text-gray-700">🚗</span>}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">{min.name}</h4>
                    <span className="text-[10px] text-gray-500 uppercase">{min.series || '---'}</span>
                  </div>
                  {min.is_for_trade && <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full font-black">REPETIDO</span>}
                </div>
              ))
            )}
            <button onClick={onCreate} className="mt-2 py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 text-xs font-bold hover:border-yellow-500 hover:text-yellow-500 transition">+ Adicionar Modelo</button>
          </div>
        ) : (
          /* VISTA EM GRELHA (EXPOSITOR) */
          <div className="min-w-[700px] space-y-2 overflow-x-auto">
            {Array.from({ length: currentDisplay.rows_count }).map((_, rIdx) => (
              <div key={`row-${rIdx}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentDisplay.columns_count}, minmax(0, 1fr))` }}>
                {Array.from({ length: currentDisplay.columns_count }).map((_, cIdx) => {
                  const r = rIdx + 1; const c = cIdx + 1;
                  const min = miniatures.find(m => m.display_row === r && m.display_column === c);
                  return (
                    <div key={`slot-${r}-${c}`} onClick={() => onSlotClick(r, c, min)} className={`relative aspect-[4/3] border rounded bg-gray-950 flex flex-col items-center justify-center p-1 cursor-pointer transition ${min ? 'border-gray-700' : 'border-gray-800'} hover:border-yellow-500 ${selectedSlot?.row === r && selectedSlot?.col === c ? 'ring-2 ring-yellow-500' : ''}`}>
                      {min ? (
                        <div className="w-full h-full relative flex flex-col justify-end text-center">
                          {min.photo_url && <img src={min.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 rounded" />}
                          <p className="text-[9px] font-bold truncate bg-black/80 px-1 z-10">{min.name}</p>
                        </div>
                      ) : <span className="text-[8px] text-gray-800">+</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAINEL DE DETALHES DO SLOT (COMUM) */}
      {selectedSlot && !movingCar && (
        <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col md:flex-row gap-6 shadow-lg">
          <div className="w-56 flex-shrink-0">
             <div className="w-full aspect-[4/3] bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
              {activeGalleryUrl ? <img src={activeGalleryUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-600">Sem Imagem</span>}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">{selectedSlot.miniature ? selectedSlot.miniature.name : 'Nicho Selecionado'}</h2>
            {selectedSlot.miniature && (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mt-4">
                <div>Série: {selectedSlot.miniature.series || '---'}</div>
                <div>Código: {selectedSlot.miniature.code || '---'}</div>
              </div>
            )}
            <div className="flex gap-2 mt-5 border-t border-gray-800 pt-3">
              {selectedSlot.miniature ? (
                <>
                  <button onClick={() => onToggleTrade(selectedSlot.miniature, selectedSlot.miniature.is_for_trade)} className={`px-3 py-1.5 font-bold text-xs rounded-lg uppercase ${selectedSlot.miniature.is_for_trade ? 'bg-blue-600 text-white' : 'bg-gray-800'}`}>
                    {selectedSlot.miniature.is_for_trade ? '🔄 Mover' : '➕ Repetido'}
                  </button>
                  <button onClick={onEdit} className="px-3 py-1.5 bg-yellow-500 text-gray-950 font-bold text-xs rounded-lg uppercase">✏️ Editar</button>
                  <button onClick={() => onStartMove(selectedSlot.miniature)} className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg uppercase">🔄 Mover</button>
                  <button onClick={() => onDelete(selectedSlot.miniature)} className="px-3 py-1.5 bg-red-950 text-red-200 border border-red-700 font-bold text-xs rounded-lg uppercase">🗑️ Remover</button>
                </>
              ) : (
                <button onClick={onCreate} className="px-4 py-2 bg-yellow-500 text-gray-950 font-black text-xs rounded-lg uppercase">Adicionar Carro</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}