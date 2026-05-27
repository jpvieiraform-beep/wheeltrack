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
  
  // ADICIONADO: Flag para controlo de visualização pública da rede social
  isViewingPublic?: boolean;
}

export default function GridExpositor({
  currentDisplay, miniatures, selectedSlot, movingCar, activeGalleryUrl,
  onBack, onSlotClick, onCancelMove, onStartMove, onToggleTrade, onEdit, onCreate, onDelete,
  isViewingPublic = false // Valor por defeito para não quebrar em sítios antigos
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
      <div className="flex items-center justify-between border-b border-sky-900/40 pb-4">
        <div>
          <button onClick={onBack} className="text-xs text-yellow-400 font-bold underline mb-2 block">← Voltar para o Dashboard</button>
          <h1 className="text-2xl font-black text-gray-100 uppercase tracking-tight">
            {isBox ? '📦 ' : '🔲 '}{cleanDisplayName(currentDisplay.name)}
          </h1>
        </div>
      </div>

      {movingCar && !isViewingPublic && (
        <div className="bg-blue-950/50 border border-blue-500 text-blue-300 p-3 rounded-lg text-xs text-center flex justify-between items-center shadow-md">
          <span>🔄 A mover <strong>{movingCar.name}</strong>. Escolhe o destino.</span>
          <button onClick={onCancelMove} className="bg-blue-900 px-3 py-1 rounded-md text-white font-bold text-xs hover:bg-blue-800 transition">Cancelar</button>
        </div>
      )}

      {/* ÁREA DE VISUALIZAÇÃO: GRELHA OU LISTA */}
      <div className="bg-sky-950/20 p-4 rounded-2xl border border-sky-900/50 shadow-2xl backdrop-blur-sm">
        {isBox ? (
          /* VISTA EM LISTA (CAIXAS) */
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {miniatures.length === 0 ? (
              <div className="text-center py-10 text-sky-400/60 italic">Esta caixa está vazia.</div>
            ) : (
              miniatures.map((min) => (
                <div 
                  key={min.id} 
                  onClick={() => onSlotClick(min.display_row, min.display_column, min)}
                  className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition ${selectedSlot?.miniature?.id === min.id ? 'bg-sky-900/30 border-yellow-500' : 'bg-sky-950/60 border-sky-900/50 hover:border-sky-500/50'}`}
                >
                  <div className="w-10 h-10 bg-black rounded overflow-hidden flex items-center justify-center border border-sky-900">
                    {min.photo_url ? <img src={min.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs text-gray-700">🚗</span>}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{min.name}</h4>
                    <span className="text-[10px] text-sky-400 font-medium uppercase">{min.series || '---'}</span>
                  </div>
                  {min.is_for_trade && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black tracking-wider uppercase">🔄 DISPONÍVEL PARA TROCA</span>}
                </div>
              ))
            )}
            
            {/* SÓ MOSTRA O BOTÃO DE ADICIONAR SE NÃO FOR VISUALIZAÇÃO PÚBLICA */}
            {!isViewingPublic && (
              <button onClick={onCreate} className="mt-2 py-3 border-2 border-dashed border-sky-800 hover:border-yellow-500 rounded-lg text-sky-400/60 text-xs font-bold hover:text-yellow-500 transition uppercase tracking-wider">+ Adicionar Modelo</button>
            )}
          </div>
        ) : (
          /* VISTA EM GRELHA (EXPOSITOR) */
          <div className="min-w-[700px] space-y-2 overflow-x-auto">
            {Array.from({ length: currentDisplay.rows_count }).map((_, rIdx) => (
              <div key={`row-${rIdx}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentDisplay.columns_count}, minmax(0, 1fr))` }}>
                {Array.from({ length: currentDisplay.columns_count }).map((_, cIdx) => {
                  const r = rIdx + 1; const c = cIdx + 1;
                  const min = miniatures.find(m => m.display_row === r && m.display_column === c);
                  
                  // Se for visualização pública e o nicho estiver vazio, desativa cliques e muda o ponteiro do rato
                  const isClickable = !isViewingPublic || !!min;

                  return (
                    <div 
                      key={`slot-${r}-${c}`} 
                      onClick={() => isClickable && onSlotClick(r, c, min)} 
                      className={`relative aspect-[4/3] border rounded bg-gray-950 flex flex-col items-center justify-center p-1 transition ${
                        min 
                          ? min.is_for_trade 
                            ? 'border-blue-900/80 ring-1 ring-blue-900/30' 
                            : 'border-sky-900/60' 
                          : 'border-sky-950/40'
                      } ${isClickable ? 'cursor-pointer hover:border-yellow-500' : 'cursor-not-allowed opacity-30'} ${selectedSlot?.row === r && selectedSlot?.col === c ? 'ring-2 ring-yellow-500' : ''}`}
                    >
                      {min ? (
                        <div className="w-full h-full relative flex flex-col justify-end text-center">
                          {min.photo_url && <img src={min.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 rounded" />}
                          <p className="text-[9px] font-black truncate bg-black/80 px-1 z-10 text-white uppercase tracking-tighter">
                            {min.is_for_trade && '🔄 '}{min.name}
                          </p>
                        </div>
                      ) : (
                        !isViewingPublic && <span className="text-[8px] text-sky-800 font-black">+</span >
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAINEL DE DETALHES DO SLOT (COMUM) */}
      {selectedSlot && (!movingCar || isViewingPublic) && (
        <div className="p-5 bg-sky-950/40 border border-sky-900/50 rounded-xl flex flex-col md:flex-row gap-6 shadow-xl backdrop-blur-md animate-fade-in">
          <div className="w-56 flex-shrink-0">
             <div className="w-full aspect-[4/3] bg-gray-950 border border-sky-900 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
              {activeGalleryUrl ? <img src={activeGalleryUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-sky-800 font-bold uppercase">Sem Fotografia</span>}
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">{selectedSlot.miniature ? selectedSlot.miniature.name : 'Nicho Vazio'}</h2>
              {selectedSlot.miniature && (
                <div className="grid grid-cols-2 gap-3 text-xs text-sky-300 mt-4 font-medium uppercase tracking-wider">
                  <div>Série: <span className="text-white font-bold">{selectedSlot.miniature.series || '---'}</span></div>
                  <div>Código Toy: <span className="text-white font-bold">{selectedSlot.miniature.code || '---'}</span></div>
                  <div>Raridade: <span className="text-yellow-400 font-black">{selectedSlot.miniature.rarity_type || 'Regular'}</span></div>
                  <div>Ano Lançamento: <span className="text-white font-bold">{selectedSlot.miniature.release_year || '---'}</span></div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5 border-t border-sky-900/40 pt-4">
              {selectedSlot.miniature ? (
                /* BOTÕES EM MODO PROPRIETÁRIO VS MODO SOCIAL */
                !isViewingPublic ? (
                  <>
                    <button onClick={() => onToggleTrade(selectedSlot.miniature, selectedSlot.miniature.is_for_trade)} className={`px-3 py-1.5 font-black text-xs rounded-lg uppercase tracking-wider transition ${selectedSlot.miniature.is_for_trade ? 'bg-blue-600 text-white' : 'bg-sky-950 text-sky-400 border border-sky-800 hover:border-sky-500'}`}>
                      {selectedSlot.miniature.is_for_trade ? '🔒 Trancar' : '🔄 Meter Troca'}
                    </button>
                    <button onClick={onEdit} className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-xs rounded-lg uppercase tracking-wider transition">✏️ Editar</button>
                    <button onClick={() => onStartMove(selectedSlot.miniature)} className="px-3 py-1.5 bg-sky-800 hover:bg-sky-700 text-white font-black text-xs rounded-lg uppercase tracking-wider transition">↕️ Mover</button>
                    <button onClick={() => onDelete(selectedSlot.miniature)} className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/40 font-black text-xs rounded-lg uppercase tracking-wider transition">🗑️ Remover</button>
                  </>
                ) : (
                  /* SE FOR OUTRO UTILIZADOR A VER: APENAS EXPÕE O BOTÃO DE PROPOSTA CASO ESTEJA ATIVO */
                  selectedSlot.miniature.is_for_trade ? (
                    <button onClick={() => alert('Em breve: Enviar proposta de troca direta!')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg uppercase tracking-widest shadow-lg transition">
                      📥 Propor Troca por este Modelo
                    </button>
                  ) : (
                    <span className="text-xs text-sky-400/50 italic font-bold uppercase tracking-wider">🔒 Este artigo pertence à coleção privada e não está para negócio.</span>
                  )
                )
              ) : (
                /* SE NÃO TIVER MINIATURA E FOR O DONO, ADICIONA NOVO */
                !isViewingPublic && (
                  <button onClick={onCreate} className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-xs rounded-lg uppercase tracking-widest transition shadow-lg">Adicionar Carro</button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}