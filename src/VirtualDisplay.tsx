import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import GridExpositor from './GridExpositor';
import MiniatureFormModal from './MiniatureFormModal';

export const PRESET_MODELS = [
  { id: 'slim_30', name: 'Módulo Slim 30 (1:64)', rows: 5, cols: 6, type: 'Loose', icon: '📏', color: 'text-sky-400', description: 'Perfeito para cabeceiras e espaços pequenos.' },
  { id: 'master_50', name: 'Módulo Master 50 (1:64)', rows: 5, cols: 10, type: 'Loose', icon: '🔲', color: 'text-amber-400', description: 'O clássico para coleções em crescimento.' },
  { id: 'garage_100', name: 'Módulo Garage 100 (1:64)', rows: 10, cols: 10, type: 'Loose', icon: '🏢', color: 'text-emerald-400', description: 'Para os colecionadores hardcore.' },
  { id: 'supergrid_117', name: 'SuperGrid 117 (1:64)', rows: 13, cols: 9, type: 'Loose', icon: '⚡', color: 'text-indigo-400', description: 'Grelha vertical otimizada de alta densidade.' },
  { id: 'supergrid_130', name: 'SuperGrid 130 (1:64)', rows: 13, cols: 10, type: 'Loose', icon: '🚀', color: 'text-violet-400', description: 'Linhas estendidas para proteção máxima.' },
  { id: 'supergrid_169', name: 'SuperGrid 169 (1:64)', rows: 13, cols: 13, type: 'Loose', icon: '👑', color: 'text-fuchsia-400', description: 'O titã dos expositores Loose ao quadrado.' },
  { id: 'blister_39', name: 'Expositor Blister (1:64)', rows: 13, cols: 3, type: 'Blister', icon: '🏷️', color: 'text-rose-400', description: 'Design em formato de cartela com 3 colunas organizadas.' },
  { id: 'frame_39', name: 'Expositor Frame (1:64)', rows: 13, cols: 3, type: 'Blister', icon: '🖼️', color: 'text-orange-400', description: 'Estrutura robusta quadrada com calhas verticais flexíveis.' },
  { id: 'blister_gr', name: 'Expositor Blister GR (1:64)', rows: 30, cols: 7, type: 'Blister', icon: '🎪', color: 'text-cyan-400', description: 'Grande formato profissional com 7 calhas de alta capacidade.' }
];

interface VirtualDisplayProps {
  targetUserId: string;
  isViewingPublic: boolean;
}

export default function VirtualDisplay({ targetUserId, isViewingPublic }: VirtualDisplayProps) {
  // Estado Global
  const [loading, setLoading] = useState(true);
  const [displaysList, setDisplaysList] = useState<any[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<any>(null);
  const [miniatures, setMiniatures] = useState<any[]>([]);
  
  // Estado de Interação da Grelha
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [movingCar, setMovingCar] = useState<any>(null);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);
  
  // Estado do Menu de Criação
  const [showCreationMenu, setShowCreationMenu] = useState(false);
  const [displayType, setDisplayType] = useState<'expositor' | 'caixa'>('expositor');
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [tempLocations, setTempLocations] = useState<{ [key: string]: string }>({});

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Escuta o evento global enviado pelo botão "+ Novo Módulo" do App.tsx
  useEffect(() => {
    const handleOpenCreation = () => {
      if (!isViewingPublic) {
        setDisplayType('expositor');
        setShowCreationMenu(true);
      }
    };
    window.addEventListener('open-creation', handleOpenCreation);
    return () => window.removeEventListener('open-creation', handleOpenCreation);
  }, [isViewingPublic]);

  async function loadDisplays() {
    try {
      setLoading(true);
      if (!targetUserId) return;
      const { data } = await supabase.from('displays').select('*').eq('user_id', targetUserId);
      setDisplaysList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMiniatures(display: any) {
    setCurrentDisplay(display);
    const { data: minData } = await supabase
      .from('miniatures')
      .select('*')
      .eq('display_id', display.id)
      .eq('user_id', targetUserId);
    setMiniatures(minData || []);
    setSelectedSlot(null);
    setMovingCar(null);
  }

  async function loadSelectedSlotPhotos(miniature: any) {
    if (!miniature) return;
    const { data: photosData } = await supabase.from('miniature_photos').select('photo_url').eq('miniature_id', miniature.id);
    const extraUrls = photosData?.map((p: any) => p.photo_url) || [];
    setSelectedSlot((prev: any) => ({
      ...prev,
      allPhotos: miniature.photo_url ? [miniature.photo_url, ...extraUrls] : extraUrls
    }));
    setActiveGalleryUrl(miniature.photo_url || extraUrls[0] || null);
  }

  useEffect(() => {
    loadDisplays();
  }, [targetUserId]);

  const handleCreateDisplay = async (preset: typeof PRESET_MODELS[0]) => {
    if (isViewingPublic || !targetUserId) return;
    const chosenLocation = tempLocations[preset.id] || 'Garagem';
    const baseName = customDisplayName.trim() || preset.name;
    const finalName = `[${chosenLocation}] ${baseName}`;

    setLoading(true);
    const { error } = await supabase.from('displays').insert([{
      user_id: targetUserId, 
      name: finalName,
      model_type: preset.id,
      rows_count: preset.rows,
      columns_count: preset.cols
    }]);

    if (error) alert("Erro ao criar módulo: " + error.message);
    setCustomDisplayName('');
    setTempLocations({});
    setShowCreationMenu(false);
    await loadDisplays();
  };

  const handleCreateBox = async () => {
    if (isViewingPublic || !targetUserId) return;
    const baseName = customDisplayName.trim() || 'Nova Caixa';
    const finalName = `[CAIXA] ${baseName}`;

    setLoading(true);
    const { error } = await supabase.from('displays').insert([{
      user_id: targetUserId,
      name: finalName,
      model_type: 'Box_Storage',
      rows_count: 1,
      columns_count: 500
    }]);

    if (error) alert("Erro ao criar caixa: " + error.message);
    setCustomDisplayName('');
    setShowCreationMenu(false);
    setDisplayType('expositor');
    await loadDisplays();
  };

  const handleDeleteCar = async (car: any) => {
    if (isViewingPublic || !car || !car.id) return;
    if (!confirm(`Remover "${car.name}" permanentemente?`)) return;
    const { error } = await supabase.from('miniatures').delete().eq('id', car.id);
    if (!error) {
      setMiniatures(miniatures.filter(m => m.id !== car.id));
      setSelectedSlot(null);
    }
  };

  const handleMoveCarExecution = async (targetRow: number, targetCol: number) => {
    if (isViewingPublic || !movingCar) return;
    const { error } = await supabase.from('miniatures').update({ display_row: targetRow, display_column: targetCol }).eq('id', movingCar.id);
    if (!error) {
      setMiniatures(miniatures.map(m => m.id === movingCar.id ? { ...m, display_row: targetRow, display_column: targetCol } : m));
      setMovingCar(null);
      setSelectedSlot(null);
    }
  };

  const handleToggleTrade = async (miniature: any, currentTradeStatus: boolean) => {
    if (isViewingPublic) return;
    const novoEstado = !currentTradeStatus;
    const { error } = await supabase.from('miniatures').update({ is_for_trade: novoEstado }).eq('id', miniature.id);
    if (!error) {
      setSelectedSlot({ ...selectedSlot, miniature: { ...selectedSlot.miniature, is_for_trade: novoEstado } });
      await loadMiniatures(currentDisplay);
    }
  };

  const handleSlotClick = async (row: number, col: number, miniature: any) => {
    if (movingCar) {
      if (!miniature && !isViewingPublic) handleMoveCarExecution(row, col); 
    } else {
      if (isViewingPublic && !miniature) return;
      setSelectedSlot({ row, col, miniature, allPhotos: miniature?.photo_url ? [miniature.photo_url] : [] });
      setActiveGalleryUrl(miniature?.photo_url || null);
      if (miniature) await loadSelectedSlotPhotos(miniature);
    }
  };

  const extractLocation = (fullName: string) => fullName.startsWith('[') ? fullName.substring(1, fullName.indexOf(']')) : 'Garagem';
  const cleanDisplayName = (fullName: string) => fullName.startsWith('[') ? fullName.substring(fullName.indexOf(']') + 1).trim() : fullName;

  const groupedDisplaysByRoom = displaysList.reduce((acc: any, display: any) => {
    const room = extractLocation(display.name);
    if (!acc[room]) acc[room] = [];
    acc[room].push(display);
    return acc;
  }, {});

  if (loading) {
    return <div className="text-center py-12 text-xs font-bold text-sky-400 animate-pulse uppercase tracking-widest">A sincronizar expositores...</div>;
  }

  // SUB-MENU DE CRIAÇÃO INTERNO
  if (showCreationMenu && !isViewingPublic) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-sky-950/20 border border-sky-900/50 rounded-2xl backdrop-blur-md animate-fade-in mt-6">
        <div className="text-center mb-6 border-b border-sky-900/40 pb-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-yellow-400">🛠️ Configurar Nova Arrumação</h2>
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setDisplayType('expositor')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${displayType === 'expositor' ? 'bg-yellow-500 text-gray-950' : 'bg-sky-950 border border-sky-800 text-sky-400'}`}>🔲 Expositor Físico</button>
            <button onClick={() => setDisplayType('caixa')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${displayType === 'caixa' ? 'bg-amber-600 text-gray-950' : 'bg-sky-950 border border-sky-800 text-sky-400'}`}>Box Storage</button>
          </div>
        </div>

        {displayType === 'expositor' ? (
          <div className="space-y-4">
            <input type="text" value={customDisplayName} onChange={(e) => setCustomDisplayName(e.target.value)} placeholder="Identificador opcional (ex: Prateleira Principal)..." className="w-full bg-sky-950 border border-sky-800 rounded-xl p-3 text-white text-sm text-center focus:border-yellow-500 focus:outline-none" />
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-1">
              {PRESET_MODELS.map((preset) => (
                <div key={preset.id} className="bg-sky-950/40 border border-sky-900/60 p-4 rounded-xl flex flex-col justify-between hover:border-yellow-400 transition">
                  <div className="text-sm font-bold text-white uppercase tracking-tight">{preset.name}</div>
                  <select value={tempLocations[preset.id] || 'Garagem'} onChange={(e) => setTempLocations({...tempLocations, [preset.id]: e.target.value})} className="mt-3 w-full bg-gray-950 border border-sky-900 rounded-lg p-1.5 text-white text-xs">
                    <option value="Garagem">Garagem 🚗</option> <option value="Quarto">Quarto 🛏️</option> <option value="Corredor">Corredor 🧱</option> <option value="Sala de Estar">Sala de Estar 📺</option> <option value="Escritório">Escritório 💼</option>
                  </select>
                  <button onClick={() => handleCreateDisplay(preset)} className="mt-3 w-full py-1.5 bg-yellow-500 text-gray-950 text-xs font-black rounded-lg uppercase">Montar</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center p-6 space-y-4 max-w-sm mx-auto">
            <input type="text" value={customDisplayName} onChange={(e) => setCustomDisplayName(e.target.value)} placeholder="Nome da Caixa (ex: Caixa de Repetidos)..." className="w-full bg-sky-950 border border-sky-800 rounded-xl p-3 text-white text-sm text-center focus:border-amber-500 focus:outline-none" />
            <button onClick={handleCreateBox} className="w-full py-3 bg-amber-600 text-gray-950 text-xs font-black rounded-xl uppercase tracking-wider">Criar Caixa</button>
          </div>
        )}
        <div className="text-center mt-4 border-t border-sky-900/30 pt-3"><button onClick={() => { setShowCreationMenu(false); setCustomDisplayName(''); }} className="text-xs text-sky-400 hover:text-white underline">Voltar à Garagem</button></div>
      </div>
    );
  }

  // GRELHA COMPLETA DO EXPOSITOR SE SELECIONADO
  if (currentDisplay) {
    return (
      <>
        <GridExpositor 
          currentDisplay={currentDisplay} miniatures={miniatures} selectedSlot={selectedSlot} movingCar={movingCar} activeGalleryUrl={activeGalleryUrl}
          onBack={() => { setCurrentDisplay(null); loadDisplays(); }} onSlotClick={handleSlotClick} onCancelMove={() => setMovingCar(null)}
          onStartMove={(m: any) => setMovingCar(m)} onToggleTrade={handleToggleTrade}
          onEdit={() => { if (!isViewingPublic) { setIsEditing(true); setIsModalOpen(true); } }}
          onCreate={() => { if (!isViewingPublic) { setIsEditing(false); setIsModalOpen(true); } }}
          onDelete={handleDeleteCar} isViewingPublic={isViewingPublic}
        />
        <MiniatureFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaveComplete={async () => { setIsModalOpen(false); await loadMiniatures(currentDisplay); }} displayId={currentDisplay?.id} slot={selectedSlot} existingCar={isEditing ? selectedSlot?.miniature : null} />
      </>
    );
  }

  // SE NÃO HÁ EXPOSITOR SELECIONADO Nem Menu de Criação Aberto: Renderiza a lista de vitrines principais na aba de Módulos
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 animate-fade-in">
      {Object.keys(groupedDisplaysByRoom).length === 0 ? (
        <div className="text-center py-12 bg-sky-950/20 border border-sky-900/40 rounded-2xl text-xs text-sky-400 font-bold uppercase tracking-wider">
          Ainda não tens módulos montados na tua parede. Clica em "+ Novo Módulo" no topo!
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedDisplaysByRoom).map((roomName) => {
            const isBox = roomName.toUpperCase() === 'CAIXA';
            return (
              <div key={roomName} className={`space-y-3 p-4 rounded-2xl border ${isBox ? 'bg-amber-950/10 border-amber-900/30' : 'bg-sky-900/20 border-sky-900/30'}`}>
                <h3 className={`text-xs font-black tracking-wider uppercase border-b pb-1 ${isBox ? 'text-amber-500 border-amber-900/50' : 'text-sky-300 border-sky-900/40'}`}>
                  {isBox ? '📦 Caixas de Arrumação / Stock' : `📍 ${roomName}`}
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {groupedDisplaysByRoom[roomName].map((disp: any) => (
                    <div key={disp.id} onClick={() => loadMiniatures(disp)} className={`p-5 rounded-xl cursor-pointer transition relative group shadow backdrop-blur-sm ${isBox ? 'bg-amber-950/20 border-dashed border-2 border-amber-800/50 hover:border-amber-500' : 'bg-sky-950/40 border border-sky-900/40 hover:border-yellow-500'}`}>
                      <h4 className="text-base font-bold text-gray-200">{isBox ? '📦 ' : '🔲 '}{cleanDisplayName(disp.name)}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono mt-2 inline-block ${isBox ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-950 text-sky-400'}`}>{isBox ? 'Capacidade Livre' : `${disp.rows_count}×${disp.columns_count} Vagas`}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}