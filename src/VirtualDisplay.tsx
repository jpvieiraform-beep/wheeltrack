import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './Dashboard';
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

export default function VirtualDisplay() {
  // Estado Global
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'premium'>('free');
  
  // Estado dos Dados
  const [displaysList, setDisplaysList] = useState<any[]>([]);
  const [allMiniatures, setAllMiniatures] = useState<any[]>([]);
  const [globalMarket, setGlobalMarket] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]); // NOVO ESTADO: Lista de Desejos
  const [currentDisplay, setCurrentDisplay] = useState<any>(null);
  const [miniatures, setMiniatures] = useState<any[]>([]);
  
  // Estado de Interação da Grelha
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [movingCar, setMovingCar] = useState<any>(null);
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);
  
  // Estado do Menu de Criação
  const [showCreationMenu, setShowCreationMenu] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [tempLocations, setTempLocations] = useState<{ [key: string]: string }>({});

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // --- FUNÇÕES DE CARREGAMENTO ---
  async function loadGlobalData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Carrega o Perfil (Free/Premium)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .maybeSingle();
      
      setSubscriptionStatus(profileData?.subscription_status as 'free' | 'premium' || 'free');

      // Carrega os Expositores do Utilizador
      const { data: displaysData } = await supabase.from('displays').select('*').eq('user_id', user.id);
      setDisplaysList(displaysData || []);

      // Carrega os Carros do Utilizador
      const { data: allMiniaturesData } = await supabase.from('miniatures').select('*').eq('user_id', user.id);
      setAllMiniatures(allMiniaturesData || []);

      // Carrega TODOS os carros disponíveis para troca (Mercado Global)
      const { data: marketData } = await supabase
        .from('miniatures')
        .select('*')
        .eq('is_for_trade', true)
        .order('created_at', { ascending: false });
        
      setGlobalMarket(marketData || []);

      // NOVO: Carrega a Wishlist pessoal do utilizador logado
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setWishlist(wishlistData || []);

    } catch (err: any) {
      console.error("Erro global:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMiniatures(display: any) {
    setCurrentDisplay(display);
    const { data: minData } = await supabase.from('miniatures').select('*').eq('display_id', display.id);
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
    loadGlobalData();
  }, []);

  // --- FUNÇÕES DE AÇÃO (SUPABASE) ---
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload(); 
  }

  const handleCreateDisplay = async (preset: typeof PRESET_MODELS[0]) => {
    if (!userId) return;
    const chosenLocation = tempLocations[preset.id] || 'Garagem';
    const baseName = customDisplayName.trim() || preset.name;
    const finalName = `[${chosenLocation}] ${baseName}`;

    setLoading(true);
    const { error } = await supabase.from('displays').insert([{
      user_id: userId, 
      name: finalName,
      model_type: preset.id,
      rows_count: preset.rows,
      columns_count: preset.cols
    }]);

    if (error) alert("Erro ao criar módulo: " + error.message);
    setCustomDisplayName('');
    setTempLocations({});
    setShowCreationMenu(false);
    await loadGlobalData();
  };

  const handleDeleteDisplay = async (e: React.MouseEvent, displayId: string, displayName: string) => {
    e.stopPropagation();
    if (!confirm(`Eliminar expositor "${displayName}" permanentemente?`)) return;
    setLoading(true);
    const { error } = await supabase.from('displays').delete().eq('id', displayId);
    if (!error) {
      await loadGlobalData();
      setSelectedSlot(null);
      setCurrentDisplay(null);
    } else {
      setLoading(false);
    }
  };

  const handleDeleteCar = async (car: any) => {
    if (!car || !car.id) return;
    if (!confirm(`Remover "${car.name}" permanentemente?`)) return;
    const { error } = await supabase.from('miniatures').delete().eq('id', car.id);
    if (!error) {
      setMiniatures(miniatures.filter(m => m.id !== car.id));
      setSelectedSlot(null);
      await loadGlobalData();
    }
  };

  const handleMoveCarExecution = async (targetRow: number, targetCol: number) => {
    if (!movingCar) return;
    const { error } = await supabase.from('miniatures').update({ display_row: targetRow, display_column: targetCol }).eq('id', movingCar.id);
    if (!error) {
      setMiniatures(miniatures.map(m => m.id === movingCar.id ? { ...m, display_row: targetRow, display_column: targetCol } : m));
      setMovingCar(null);
      setSelectedSlot(null);
      await loadGlobalData();
    }
  };

  const handleToggleTrade = async (miniature: any, currentTradeStatus: boolean) => {
    const novoEstado = !currentTradeStatus;
    const { error } = await supabase.from('miniatures').update({ is_for_trade: novoEstado }).eq('id', miniature.id);
    if (!error) {
      setSelectedSlot({ ...selectedSlot, miniature: { ...selectedSlot.miniature, is_for_trade: novoEstado } });
      await loadMiniatures(currentDisplay);
      await loadGlobalData();
    } else {
      alert("Erro ao atualizar estado de troca.");
    }
  };

  const handleSlotClick = async (row: number, col: number, miniature: any) => {
    if (movingCar) {
      if (!miniature) handleMoveCarExecution(row, col); 
    } else {
      setSelectedSlot({ row, col, miniature, allPhotos: miniature?.photo_url ? [miniature.photo_url] : [] });
      setActiveGalleryUrl(miniature?.photo_url || null);
      if (miniature) await loadSelectedSlotPhotos(miniature);
    }
  };

  // NOVO: Adicionar carro à Wishlist no Supabase
  const handleAddToWishlist = async (carName: string, series: string, toyCode: string) => {
    if (!userId || !carName.trim()) return;
    const { error } = await supabase.from('wishlist').insert([{
      user_id: userId,
      car_name: carName.trim(),
      series: series.trim() || null,
      toy_code: toyCode.trim() || null
    }]);

    if (error) alert("Erro ao adicionar desejo: " + error.message);
    else await loadGlobalData();
  };

  // NOVO: Remover carro da Wishlist no Supabase
  const handleRemoveFromWishlist = async (wishlistId: string) => {
    if (!wishlistId) return;
    const { error } = await supabase.from('wishlist').delete().eq('id', wishlistId);
    
    if (error) alert("Erro ao remover desejo: " + error.message);
    else await loadGlobalData();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-sans text-sm">A sincronizar a tua garagem...</div>;
  }

  if (showCreationMenu || displaysList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center justify-center font-sans">
        <div className="max-w-2xl w-full text-center mb-8 border-b border-gray-800 pb-6 space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-100 tracking-tighter">Sincronizar Novo Módulo</h2>
          <input type="text" value={customDisplayName} onChange={(e) => setCustomDisplayName(e.target.value)} placeholder="Identificador opcional (ex: Prateleira de Cima)..." className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white text-center text-sm focus:outline-none" />
        </div>
        <div className="max-w-5xl w-full grid md:grid-cols-3 gap-4 overflow-y-auto max-h-[50vh] pr-2">
          {PRESET_MODELS.map((preset) => (
            <div key={preset.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between hover:border-yellow-500 transition space-y-4">
              <div className="flex gap-3 items-start">
                <span className="text-2xl bg-gray-950 p-2 rounded-lg">{preset.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">{preset.name}</h3>
                  <p className="text-[10px] text-gray-500 font-mono">{preset.rows}L × {preset.cols}C</p>
                </div>
              </div>
              <select value={tempLocations[preset.id] || 'Garagem'} onChange={(e) => setTempLocations({...tempLocations, [preset.id]: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white text-xs">
                <option value="Garagem">Garagem 🚗</option>
                <option value="Quarto">Quarto 🛏️</option>
                <option value="Corredor">Corredor 🧱</option>
                <option value="Sala de Estar">Sala de Estar 📺</option>
                <option value="Escritório">Escritório 💼</option>
              </select>
              <button onClick={() => handleCreateDisplay(preset)} className="w-full py-2 bg-yellow-500 text-gray-950 text-xs font-black rounded-lg uppercase">Montar</button>
            </div>
          ))}
        </div>
        {displaysList.length > 0 && <button onClick={() => setShowCreationMenu(false)} className="mt-4 text-xs text-gray-500 underline">Cancelar e Voltar</button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {!currentDisplay ? (
        <Dashboard 
          allMiniatures={allMiniatures}
          displaysList={displaysList}
          globalMarket={globalMarket}
          subscriptionStatus={subscriptionStatus}
          onSelectDisplay={loadMiniatures}
          onDeleteDisplay={handleDeleteDisplay}
          onCreateNewClick={() => setShowCreationMenu(true)}
          onLogout={handleLogout}
          // INJEÇÃO DAS NOVAS PROPRIEDADES DA WISHLIST:
          wishlist={wishlist}
          onAddToWishlist={handleAddToWishlist}
          onRemoveFromWishlist={handleRemoveFromWishlist}
        />
      ) : (
        <GridExpositor 
          currentDisplay={currentDisplay}
          miniatures={miniatures}
          selectedSlot={selectedSlot}
          movingCar={movingCar}
          activeGalleryUrl={activeGalleryUrl}
          onBack={() => { setCurrentDisplay(null); loadGlobalData(); }}
          onSlotClick={handleSlotClick}
          onCancelMove={() => setMovingCar(null)}
          onStartMove={(miniature: any) => setMovingCar(miniature)}
          onToggleTrade={handleToggleTrade}
          onEdit={() => { setIsEditing(true); setIsModalOpen(true); }}
          onCreate={() => { setIsEditing(false); setIsModalOpen(true); }}
          onDelete={handleDeleteCar}
        />
      )}

      <MiniatureFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveComplete={async () => {
          setIsModalOpen(false);
          await loadMiniatures(currentDisplay);
          await loadGlobalData();
        }}
        displayId={currentDisplay?.id}
        slot={selectedSlot}
        existingCar={isEditing ? selectedSlot?.miniature : null}
      />
    </div>
  );
}