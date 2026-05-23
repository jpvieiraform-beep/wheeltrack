import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const PRESET_MODELS = [
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

const STORAGE_BUCKET_NAME = 'miniatures_photos';
const ICON_TH = 'https://collecthw.com/images/th.png';
const ICON_STH = 'https://collecthw.com/images/sth.png';

export default function VirtualDisplay() {
  const [displaysList, setDisplaysList] = useState<any[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<any>(null);
  const [miniatures, setMiniatures] = useState<any[]>([]);
  const [allMiniatures, setAllMiniatures] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCreationMenu, setShowCreationMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('location'); 
  const [movingCar, setMovingCar] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Estados para Edição do Módulo
  const [isEditingDisplay, setIsEditingDisplay] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDisplayLocation, setEditDisplayLocation] = useState('Garagem');

  // Estados do Formulário do Carrinho (Suporta Lista de Fotos Secundárias)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carName, setCarName] = useState('');
  const [carRarity, setCarRarity] = useState('Regular');
  const [carYear, setCarYear] = useState('2026');
  const [carSeries, setCarSeries] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carCode, setCarCode] = useState('');
  const [carNotes, setCarNotes] = useState('');
  const [carPhotoUrl, setCarPhotoUrl] = useState<string | null>(null);
  const [secondaryPhotos, setSecondaryPhotos] = useState<string[]>([]); // URLs temporárias em criação
  
  // Controle de Visualização da Galeria no Detalhe
  const [activeGalleryUrl, setActiveGalleryUrl] = useState<string | null>(null);

  // Estados de Criação do Módulo
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [tempLocations, setTempLocations] = useState<{ [key: string]: string }>({});

  async function loadGlobalData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: displaysData, error: dError } = await supabase
        .from('displays')
        .select('*')
        .eq('user_id', user.id);
      if (dError) throw dError;
      setDisplaysList(displaysData || []);

      const { data: allMiniaturesData, error: mError } = await supabase
        .from('miniatures')
        .select('*')
        .eq('user_id', user.id);
      if (mError) throw mError;
      setAllMiniatures(allMiniaturesData || []);

    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 📸 Carrega a miniatura e busca de forma limpa as suas fotos extra na tabela secundária
  async function loadMiniatures(display: any) {
    setCurrentDisplay(display);
    const { data: minData } = await supabase
      .from('miniatures')
      .select('*')
      .eq('display_id', display.id);
    
    setMiniatures(minData || []);
    setSelectedSlot(null);
    setMovingCar(null);
  }

  // ⚙️ Função auxiliar para carregar as fotos extra do slot inspecionado
  async function loadSelectedSlotPhotos(miniature: any) {
    if (!miniature) return;
    const { data: photosData } = await supabase
      .from('miniature_photos')
      .select('photo_url')
      .eq('miniature_id', miniature.id);
    
    const extraUrls = photosData?.map(p => p.photo_url) || [];
    setSelectedSlot((prev: any) => ({
      ...prev,
      allPhotos: miniature.photo_url ? [miniature.photo_url, ...extraUrls] : extraUrls
    }));
    setActiveGalleryUrl(miniature.photo_url || extraUrls[0] || null);
  }

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleCreateDisplay = async (preset: typeof PRESET_MODELS[0]) => {
    if (!userId) return;
    const chosenLocation = tempLocations[preset.id] || 'Garagem';
    const baseName = customDisplayName.trim() || `${preset.name}`;
    const finalName = `[${chosenLocation}] ${baseName}`;

    const newDisplay = {
      user_id: userId,
      name: finalName,
      model_type: preset.id,
      rows_count: preset.rows,
      columns_count: preset.cols
    };

    setLoading(true);
    const { data, error } = await supabase.from('displays').insert([newDisplay]).select().single();

    if (error) {
      alert("Erro ao criar módulo: " + error.message);
      setLoading(false);
    } else {
      setCustomDisplayName('');
      setTempLocations({});
      setShowCreationMenu(false);
      await loadGlobalData();
      if (data) await loadMiniatures(data);
    }
  };

  const handleUpdateDisplayMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDisplay || !editDisplayName.trim()) return;

    const updatedName = `[${editDisplayLocation}] ${editDisplayName.trim()}`;

    setLoading(true);
    const { error } = await supabase
      .from('displays')
      .update({ name: updatedName })
      .eq('id', currentDisplay.id);

    if (!error) {
      const updatedDisplayObj = { ...currentDisplay, name: updatedName };
      setCurrentDisplay(updatedDisplayObj);
      setIsEditingDisplay(false);
      await loadGlobalData();
    } else {
      alert("Erro ao atualizar módulo: " + error.message);
      setLoading(false);
    }
  };

  const handleDeleteDisplay = async (e: React.MouseEvent, displayId: string, displayName: string) => {
    e.stopPropagation();
    if (!confirm(`ATENÇÃO: Tens a certeza que queres eliminar o expositor "${displayName}"?\nTodos os itens guardados nele serão permanentemente apagados!`)) return;

    setLoading(true);
    const { error } = await supabase.from('displays').delete().eq('id', displayId);

    if (!error) {
      await loadGlobalData();
      setSelectedSlot(null);
      setCurrentDisplay(null);
    } else {
      alert("Erro ao apagar: " + error.message);
      setLoading(false);
    }
  };

  // Upload Otimizado com suporte a empilhamento de fotos
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, isSecondary: boolean = false) => {
    try {
      setUploadingPhoto(true);
      if (!event.target.files || event.target.files.length === 0 || !userId) {
        throw new Error('Nenhum ficheiro selecionado.');
      }

      const originalFile = event.target.files[0];
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(originalFile);
        reader.onload = (event: any) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Falha ao criar contexto 2D.'));
            
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha na conversão.'));
            }, 'image/jpeg', 0.7);
          };
        };
        reader.onerror = error => reject(error);
      });

      const fileName = `${userId}/${Date.now()}_${isSecondary ? 'sec' : 'prim'}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .getPublicUrl(fileName);

      if (isSecondary) {
        setSecondaryPhotos(prev => [...prev, publicUrl]);
      } else {
        setCarPhotoUrl(publicUrl);
      }
      alert('Foto carregada e processada com sucesso!');
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carName.trim() || !selectedSlot || !userId || !currentDisplay) return;

    const parsedYear = parseInt(carYear, 10) || 2026;
    const carDataPayload = {
      name: carName,
      rarity_type: carRarity,
      release_year: parsedYear,
      series: carSeries.trim() || null,
      color: carColor.trim() || null,
      code: carCode.trim() || null,
      notes: carNotes.trim() || null,
      photo_url: carPhotoUrl
    };

    if (isEditing && selectedSlot.miniature) {
      // Atualizar a miniatura principal
      const { error } = await supabase.from('miniatures').update(carDataPayload).eq('id', selectedSlot.miniature.id);
      if (!error) {
        // Se houver novas fotos secundárias adicionadas na edição, grava-as
        if (secondaryPhotos.length > 0) {
          const bulkPhotos = secondaryPhotos.map(url => ({ miniature_id: selectedSlot.miniature.id, photo_url: url }));
          await supabase.from('miniature_photos').insert(bulkPhotos);
        }

        setIsModalOpen(false);
        setSecondaryPhotos([]);
        const { data: minData } = await supabase.from('miniatures').select('*').eq('display_id', currentDisplay.id);
        setMiniatures(minData || []);
        const updatedCar = minData?.find(m => m.id === selectedSlot.miniature.id);
        const nextSlot = { ...selectedSlot, miniature: updatedCar };
        setSelectedSlot(nextSlot);
        await loadSelectedSlotPhotos(updatedCar);
        await loadGlobalData();
      } else {
        alert("Erro: " + error.message);
      }
    } else {
      // Inserir nova miniatura
      const newCar = {
        user_id: userId,
        display_id: currentDisplay.id,
        display_row: selectedSlot.row,
        display_column: selectedSlot.col,
        ...carDataPayload
      };

      const { data: insertedCar, error: insertError } = await supabase.from('miniatures').insert([newCar]).select().single();
      
      if (!insertError && insertedCar) {
        // Gravar as fotos relacionais secundárias usando o ID gerado
        if (secondaryPhotos.length > 0) {
          const bulkPhotos = secondaryPhotos.map(url => ({ miniature_id: insertedCar.id, photo_url: url }));
          await supabase.from('miniature_photos').insert(bulkPhotos);
        }

        const { data: minData } = await supabase.from('miniatures').select('*').eq('display_id', currentDisplay.id);
        setMiniatures(minData || []);
        setSelectedSlot(null);
        setSecondaryPhotos([]);
        setIsModalOpen(false);
        await loadGlobalData();
      } else {
        alert("Erro: " + (insertError?.message || "Falha na indexação"));
      }
    }
  };

  const handleOpenEditModal = async () => {
    if (!selectedSlot || !selectedSlot.miniature) return;
    const m = selectedSlot.miniature;
    setCarName(m.name || '');
    setCarRarity(m.rarity_type || 'Regular');
    setCarYear((m.release_year || 2026).toString());
    setCarSeries(m.series || '');
    setCarColor(m.color || '');
    setCarCode(m.code || '');
    setCarNotes(m.notes || '');
    setCarPhotoUrl(m.photo_url || null);
    
    // Obter fotos existentes para saber o estado atual
    const { data } = await supabase.from('miniature_photos').select('photo_url').eq('miniature_id', m.id);
    setSecondaryPhotos(data?.map(p => p.photo_url) || []);
    
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setCarName('');
    setCarRarity('Regular');
    setCarYear('2026');
    setCarSeries('');
    setCarColor('');
    setCarCode('');
    setCarNotes('');
    setCarPhotoUrl(null);
    setSecondaryPhotos([]);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDeleteCar = async (car: any) => {
    if (!car || !car.id) return;
    if (!confirm(`Tens a certeza que queres remover "${car.name}"?`)) return;

    const { error } = await supabase.from('miniatures').delete().eq('id', car.id);
    if (!error) {
      setMiniatures(miniatures.filter(m => m.id !== car.id));
      setSelectedSlot(null);
      await loadGlobalData();
    } else {
      alert("Erro: " + error.message);
    }
  };

  const handleMoveCarExecution = async (targetRow: number, targetCol: number) => {
    if (!movingCar) return;

    const { error } = await supabase
      .from('miniatures')
      .update({ display_row: targetRow, display_column: targetCol })
      .eq('id', movingCar.id);

    if (!error) {
      setMiniatures(miniatures.map(m => m.id === movingCar.id ? { ...m, display_row: targetRow, display_column: targetCol } : m));
      setMovingCar(null);
      setSelectedSlot(null);
      await loadGlobalData();
    } else {
      alert("Erro ao mover: " + error.message);
    }
  };

  const handleSlotClick = async (row: number, col: number, miniature: any) => {
    if (movingCar) {
      if (miniature) alert("Nicho ocupado!");
      else handleMoveCarExecution(row, col);
    } else {
      setSelectedSlot({ row, col, miniature, allPhotos: miniature?.photo_url ? [miniature.photo_url] : [] });
      setActiveGalleryUrl(miniature?.photo_url || null);
      if (miniature) {
        await loadSelectedSlotPhotos(miniature);
      }
    }
  };

  const totalCars = allMiniatures.length;
  const totalTH = allMiniatures.filter(m => m.rarity_type === 'Treasure Hunt').length;
  const totalSTH = allMiniatures.filter(m => m.rarity_type === 'Super Treasure Hunt').length;
  const totalPremium = allMiniatures.filter(m => m.rarity_type === 'Premium').length;

  const filteredSearch = searchQuery.trim() === '' 
    ? [] 
    : allMiniatures.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentModelMeta = currentDisplay ? PRESET_MODELS.find(p => p.id === currentDisplay.model_type) : null;

  const extractLocation = (fullName: string) => {
    if (fullName && fullName.startsWith('[')) {
      const closingBracket = fullName.indexOf(']');
      if (closingBracket > 1) return fullName.substring(1, closingBracket);
    }
    return 'Garagem';
  };

  const cleanDisplayName = (fullName: string) => {
    if (fullName && fullName.startsWith('[')) {
      const closingBracket = fullName.indexOf(']');
      if (closingBracket > 1) return fullName.substring(closingBracket + 1).trim();
    }
    return fullName || '';
  };

  const groupedDisplaysByRoom = displaysList.reduce((acc: any, display: any) => {
    const room = extractLocation(display.name);
    if (!acc[room]) acc[room] = [];
    acc[room].push(display);
    return acc;
  }, {});

  const handleLocationChange = (presetId: string, value: string) => {
    setTempLocations(prev => ({ ...prev, [presetId]: value }));
  };

  const handleOpenEditDisplayModal = () => {
    if (!currentDisplay) return;
    setEditDisplayName(cleanDisplayName(currentDisplay.name));
    setEditDisplayLocation(extractLocation(currentDisplay.name));
    setIsEditingDisplay(true);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">A carregar garagem virtual...</div>;

  // CASO 1: SELECÇÃO DE NOVOS EXPOSITORES AUTORIZADOS
  if (showCreationMenu || displaysList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center justify-center font-sans">
        <div className="max-w-2xl w-full text-center mb-8 border-b border-gray-800 pb-6 space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-100 tracking-tighter">Sincronizar Novo Módulo Físico</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto font-light">Escreve o nome identificador abaixo. A sala será definida no cartão do modelo correspondente.</p>
          <input type="text" value={customDisplayName} onChange={(e) => setCustomDisplayName(e.target.value)} placeholder="Nome opcional (Ex: Módulo Premium, Parede Esquerda...)" className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-3.5 text-white text-center text-sm focus:outline-none focus:border-yellow-500 shadow-inner placeholder-gray-600" />
        </div>

        <div className="max-w-5xl w-full space-y-8 mb-8 overflow-y-auto max-h-[50vh] pr-2">
          <div>
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Módulos para Miniaturas Soltas (Scale 1:64)</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {PRESET_MODELS.filter(p => p.type === 'Loose').map((preset) => (
                <div key={preset.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between hover:border-yellow-500 transition shadow-lg space-y-4">
                  <div className="flex gap-3 items-start">
                    <span className={`text-2xl ${preset.color} bg-gray-950 p-2 rounded-lg border border-gray-800`}>{preset.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-100">{preset.name}</h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{preset.rows}L × {preset.cols}C ({preset.rows * preset.cols} vagas)</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block pl-0.5">Onde está instalado?</label>
                    <select value={tempLocations[preset.id] || 'Garagem'} onChange={(e) => handleLocationChange(preset.id, e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white text-xs cursor-pointer">
                      <option value="Garagem">Garagem 🚗</option>
                      <option value="Quarto">Quarto 🛏️</option>
                      <option value="Corredor">Corredor 🧱</option>
                      <option value="Escadas">Escadas 🪜</option>
                      <option value="Sala de Estar">Sala de Estar 📺</option>
                      <option value="Escritório">Escritório 💼</option>
                      <option value="Outro">Outro Espaço 📦</option>
                    </select>
                  </div>
                  <button onClick={() => handleCreateDisplay(preset)} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 text-xs font-black rounded-lg transition uppercase tracking-wider">Sincronizar Módulo</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Módulos para Miniaturas em Blister (Scale 1:64)</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {PRESET_MODELS.filter(p => p.type === 'Blister').map((preset) => (
                <div key={preset.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between hover:border-yellow-500 transition shadow-lg space-y-4">
                  <div className="flex gap-3 items-start">
                    <span className={`text-2xl ${preset.color} bg-gray-950 p-2 rounded-lg border border-gray-800`}>{preset.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-100">{preset.name}</h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{preset.cols} Calhas × {preset.rows} Blisters</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block pl-0.5">Onde está instalado?</label>
                    <select value={tempLocations[preset.id] || 'Garagem'} onChange={(e) => handleLocationChange(preset.id, e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white text-xs cursor-pointer">
                      <option value="Garagem">Garagem 🚗</option>
                      <option value="Quarto">Quarto 🛏️</option>
                      <option value="Corredor">Corredor 🧱</option>
                      <option value="Escadas">Escadas 🪜</option>
                      <option value="Sala de Estar">Sala de Estar 📺</option>
                      <option value="Escritório">Escritório 💼</option>
                      <option value="Outro">Outro Espaço 📦</option>
                    </select>
                  </div>
                  <button onClick={() => handleCreateDisplay(preset)} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 text-xs font-black rounded-lg transition uppercase tracking-wider">Sincronizar Calhas</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        {displaysList.length > 0 && <button onClick={() => setShowCreationMenu(false)} className="text-xs text-gray-500 hover:text-white underline font-light">Voltar para o Dashboard</button>}
      </div>
    );
  }

  // CASO 2: DASHBOARD CENTRAL
  if (!currentDisplay) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 font-sans max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-100 tracking-tight">Painel WheelTrack</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gestão profissional da tua coleção de miniaturas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
              <span className="text-gray-500 px-2 font-medium">Visualização:</span>
              <button onClick={() => setSortBy('location')} className={`px-2.5 py-1.5 rounded font-bold transition ${sortBy === 'location' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}>Múrais por Divisão</button>
              <button onClick={() => setSortBy('name')} className={`px-2.5 py-1.5 rounded font-bold transition ${sortBy === 'name' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}>Lista Geral (A-Z)</button>
            </div>
            <button onClick={() => setShowCreationMenu(true)} className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 text-xs font-black rounded-lg shadow transition uppercase tracking-wider">+ Novo Módulo</button>
          </div>
        </div>

        {/* Contadores Globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-md text-center flex flex-col items-center justify-center min-h-[110px]">
            <span className="text-2xl block mb-1">🏎️</span>
            <span className="text-xs text-gray-400 block font-medium">Total Modelos</span>
            <span className="text-2xl font-black text-white">{totalCars}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-md text-center border-l-4 border-l-slate-400 flex flex-col items-center justify-center min-h-[110px]">
            <div className="w-8 h-8 flex items-center justify-center mb-1">
              <img src={ICON_TH} alt="TH Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]" />
            </div>
            <span className="text-xs text-gray-400 block font-medium">Treasure Hunts (TH)</span>
            <span className="text-2xl font-black text-slate-300">{totalTH}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-md text-center border-l-4 border-l-amber-500 flex flex-col items-center justify-center min-h-[110px]">
            <div className="w-8 h-8 flex items-center justify-center mb-1">
              <img src={ICON_STH} alt="STH Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
            </div>
            <span className="text-xs text-gray-400 block font-medium">Super TH (STH)</span>
            <span className="text-2xl font-black text-amber-400">{totalSTH}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-md text-center border-l-4 border-l-blue-500 flex flex-col items-center justify-center min-h-[110px]">
            <span className="text-2xl block mb-1">💎</span>
            <span className="text-xs text-gray-400 block font-medium">Premiums</span>
            <span className="text-2xl font-black text-blue-400">{totalPremium}</span>
          </div>
        </div>

        {/* Pesquisa */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">🔍</span>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Procurar miniatura na coleção inteira..." className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 placeholder-gray-600" />
          </div>
          {searchQuery.trim() !== '' && (
            <div className="bg-gray-950 border border-gray-800 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-900">
              {filteredSearch.length > 0 ? (
                filteredSearch.map((car) => {
                  const dispParent = displaysList.find(d => d.id === car.display_id);
                  return (
                    <div key={car.id} onClick={() => { if(dispParent) loadMiniatures(dispParent); }} className="p-3 flex items-center justify-between text-sm hover:bg-gray-900/60 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-gray-900 rounded border border-gray-800 overflow-hidden flex items-center justify-center text-xs">
                          {car.photo_url ? <img src={car.photo_url} className="w-full h-full object-cover" /> : '🏎️'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-200">{car.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{car.series || 'Sem Série'} | {car.color || 'Sem Cor'}</p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] pl-4">
                        <span className="text-yellow-500 font-semibold block">{dispParent ? cleanDisplayName(dispParent.name) : 'Módulo'}</span>
                        <span className="text-gray-500 font-mono">{dispParent ? extractLocation(dispParent.name) : '---'} • L{car.display_row} C{car.display_column}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-3 text-xs text-gray-600 text-center font-light">Nenhum resultado encontrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Painel por Salas */}
        <div className="space-y-6 pt-2">
          {sortBy === 'location' ? (
            Object.keys(groupedDisplaysByRoom).map((roomName) => (
              <div key={roomName} className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900/60">
                <div className="flex items-center gap-2 border-b border-gray-900 pb-2">
                  <span className="text-sm">📍</span>
                  <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">{roomName}</h3>
                  <span className="text-[9px] bg-gray-950 text-gray-500 font-mono px-2 py-0.5 rounded-full font-bold">{groupedDisplaysByRoom[roomName].length} Módulos</span>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {groupedDisplaysByRoom[roomName].map((disp: any) => {
                    const meta = PRESET_MODELS.find(p => p.id === disp.model_type);
                    return (
                      <div key={disp.id} onClick={() => loadMiniatures(disp)} className="bg-gray-900 border border-gray-800 p-5 rounded-xl cursor-pointer hover:border-yellow-500 hover:scale-[1.01] transition shadow-md group relative">
                        <button onClick={(e) => handleDeleteDisplay(e, disp.id, disp.name)} className="absolute top-3 right-3 text-gray-600 hover:text-red-500 text-xs p-1 rounded transition opacity-0 group-hover:opacity-100">🗑️</button>
                        <h4 className="text-base font-bold text-gray-200 group-hover:text-yellow-500 transition pr-6 truncate">{cleanDisplayName(disp.name)}</h4>
                        <div className="flex gap-2 mt-3">
                          <span className="text-[10px] text-gray-400 bg-gray-950 px-2 py-0.5 rounded font-mono">{disp.rows_count}×{disp.columns_count}</span>
                          <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded font-semibold border border-yellow-500/20">{meta?.type === 'Blister' ? 'Calhas' : 'Loose'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-900 pb-2">Lista Corrida de Módulos</h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...displaysList].sort((a,b) => a.name.localeCompare(b.name)).map((disp) => {
                  const meta = PRESET_MODELS.find(p => p.id === disp.model_type);
                  return (
                    <div key={disp.id} onClick={() => loadMiniatures(disp)} className="bg-gray-900 border border-gray-800 p-5 rounded-xl cursor-pointer hover:border-yellow-500 hover:scale-[1.01] transition shadow-md group relative">
                      <button onClick={(e) => handleDeleteDisplay(e, disp.id, disp.name)} className="absolute top-3 right-3 text-gray-600 hover:text-red-500 text-xs p-1 rounded transition opacity-0 group-hover:opacity-100">🗑️</button>
                      <h4 className="text-base font-bold text-gray-200 group-hover:text-yellow-500 transition pr-6 truncate">{cleanDisplayName(disp.name)}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">📍 Divisão: {extractLocation(disp.name)}</p>
                      <div className="flex gap-2 mt-2.5">
                        <span className="text-[10px] text-gray-400 bg-gray-950 px-2 py-0.5 rounded font-mono">{disp.rows_count}×{disp.columns_count}</span>
                        <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded font-semibold border border-yellow-500/20">{meta?.type === 'Blister' ? 'Calhas' : 'Loose'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // CASO 3: INTERFACE INTERNA DO EXPOSITOR
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between border-b border-b-gray-800 pb-4">
        <div>
          <button onClick={() => { setSelectedSlot(null); setMovingCar(null); setCurrentDisplay(null); loadGlobalData(); }} className="text-xs text-yellow-500 underline mb-2 block">← Voltar para o Dashboard</button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-100">{cleanDisplayName(currentDisplay.name)}</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              📍 Divisão Física: {extractLocation(currentDisplay.name)}
            </span>
            <button onClick={handleOpenEditDisplayModal} className="text-xs font-bold text-yellow-500 hover:text-yellow-400 px-2 py-1 rounded border border-yellow-500/30 bg-yellow-500/5 transition">
              ⚙️ Editar Módulo
            </button>
          </div>
        </div>
      </div>

      {movingCar && (
        <div className="max-w-6xl mx-auto mb-4 bg-blue-950/50 border border-blue-500 text-blue-300 p-3 rounded-lg text-xs text-center flex justify-between items-center">
          <span>🔄 A mover <strong>{movingCar.name}</strong>. Escolha um novo espaço em branco neste módulo.</span>
          <button onClick={() => setMovingCar(null)} className="bg-blue-900 px-2 py-1 rounded text-white font-bold text-xs">Cancelar</button>
        </div>
      )}

      {/* Matriz Física */}
      <div className="max-w-6xl mx-auto bg-neutral-900 p-4 rounded-2xl border-4 border-neutral-800 shadow-2xl overflow-x-auto">
        <div className="min-w-[700px] space-y-2">
          {Array.from({ length: currentDisplay.rows_count }).map((_, rIdx) => {
            const r = rIdx + 1;
            return (
              <div key={`row-${r}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentDisplay.columns_count}, minmax(0, 1fr))` }}>
                {Array.from({ length: currentDisplay.columns_count }).map((_, cIdx) => {
                  const c = cIdx + 1;
                  const miniature = miniatures.find(m => m.display_row === r && m.display_column === c);
                  const isBeingMoved = movingCar?.id === miniature?.id;

                  let rarityRingClass = '';
                  if (miniature) {
                    if (miniature.rarity_type === 'Super Treasure Hunt') rarityRingClass = 'ring-2 ring-amber-500 border-transparent';
                    else if (miniature.rarity_type === 'Treasure Hunt') rarityRingClass = 'ring-2 ring-slate-300 border-transparent';
                    else if (miniature.rarity_type === 'Premium') rarityRingClass = 'ring-2 ring-blue-500 border-transparent';
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleSlotClick(r, c, miniature)}
                      className={`
                        relative aspect-[4/3] border border-gray-700 rounded bg-gray-900 
                        flex flex-col items-center justify-center p-1 cursor-pointer 
                        transition-all duration-150 hover:border-yellow-500 hover:scale-[1.04] hover:z-10
                        ${rarityRingClass}
                        ${isBeingMoved ? 'opacity-30 border-dashed border-yellow-500' : ''}
                        overflow-hidden
                      `}
                    >
                      <span className="absolute top-0.5 left-1 text-[8px] text-gray-500 font-mono z-10">
                        {currentModelMeta?.type === 'Blister' ? `C${c}-P${r}` : `L${r}C${c}`}
                      </span>
                      {miniature ? (
                        <div className="flex flex-col items-center justify-center text-center w-full h-full relative">
                          {miniature.photo_url ? (
                            <img src={miniature.photo_url} alt={miniature.name} className="absolute inset-0 w-full h-full object-cover rounded opacity-80" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {miniature.rarity_type === 'Super Treasure Hunt' ? (
                                <img src={ICON_STH} alt="STH Logo" className="w-6 h-6 object-contain z-10" />
                              ) : miniature.rarity_type === 'Treasure Hunt' ? (
                                <img src={ICON_TH} alt="TH Logo" className="w-6 h-6 object-contain z-10" />
                              ) : (
                                <span className="text-lg z-10">{currentModelMeta?.type === 'Blister' ? '🏷️' : '🏎️'}</span>
                              )}
                            </div>
                          )}
                          <p className="text-[9px] text-gray-100 font-bold truncate w-full px-0.5 mt-auto z-10 bg-black/75 rounded">{miniature.name}</p>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-[9px] font-light z-10">
                          {movingCar ? 'Encaixar' : '+ Slot'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌟 PAINEL DE INSPEÇÃO COM AJUSTE DE GALERIA DINÂMICA (Opção B) */}
      {selectedSlot && !movingCar && (
        <div className="max-w-6xl mx-auto mt-6 p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col md:flex-row md:items-start gap-6 shadow-lg">
          
          {/* Lado Esquerdo: Imagem Ampliada + Carrossel de Fotos Secundárias */}
          <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
            <div className="w-full aspect-[4/3] bg-gray-950 border border-gray-800 rounded-lg flex items-center justify-center overflow-hidden relative group">
              {activeGalleryUrl ? (
                <img src={activeGalleryUrl} alt="Visualização Ativa" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition" onClick={() => window.open(activeGalleryUrl, '_blank')} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  {selectedSlot.miniature?.rarity_type === 'Super Treasure Hunt' ? (
                    <img src={ICON_STH} alt="STH Logo" className="w-12 h-12 object-contain" />
                  ) : selectedSlot.miniature?.rarity_type === 'Treasure Hunt' ? (
                    <img src={ICON_TH} alt="TH Logo" className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-4xl mb-2 opacity-20">🖼️</span>
                  )}
                  <span className="text-xs text-gray-600 font-light mt-2">Sem fotos guardadas</span>
                </div>
              )}
            </div>
            
            {/* Tiras de Miniaturas Clicáveis (Se houver mais de uma foto na tabela) */}
            {selectedSlot.allPhotos && selectedSlot.allPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 max-w-full">
                {selectedSlot.allPhotos.map((url: string, idx: number) => (
                  <div key={idx} onClick={() => setActiveGalleryUrl(url)} className={`w-14 h-10 rounded border bg-gray-950 overflow-hidden cursor-pointer flex-shrink-0 transition-all ${activeGalleryUrl === url ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-gray-800 opacity-60 hover:opacity-100'}`}>
                    <img src={url} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lado Direito: Detalhes do Modelo */}
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-gray-500 mb-1">
              {currentModelMeta?.type === 'Blister' ? `Calha Vertical: Posição ${selectedSlot.col} — Altura: Nível ${selectedSlot.row}` : `Coordenadas: Linha ${selectedSlot.row}, Coluna ${selectedSlot.col}`}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-2xl font-black text-yellow-500 tracking-tight">{selectedSlot.miniature ? selectedSlot.miniature.name : "Vaga Livre"}</p>
              {selectedSlot.miniature?.rarity_type && (
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1
                  ${selectedSlot.miniature.rarity_type === 'Super Treasure Hunt' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : ''}
                  ${selectedSlot.miniature.rarity_type === 'Treasure Hunt' ? 'bg-slate-400/20 text-slate-300 border-slate-400/40' : ''}
                  ${selectedSlot.miniature.rarity_type === 'Premium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : ''}
                  ${selectedSlot.miniature.rarity_type === 'Regular' ? 'bg-gray-800 text-gray-400 border-gray-700' : ''}
                `}>
                  {selectedSlot.miniature.rarity_type === 'Super Treasure Hunt' && <img src={ICON_STH} className="w-3 h-3 object-contain inline" />}
                  {selectedSlot.miniature.rarity_type === 'Treasure Hunt' && <img src={ICON_TH} className="w-3 h-3 object-contain inline" />}
                  {selectedSlot.miniature.rarity_type === 'Super Treasure Hunt' ? 'STH' : selectedSlot.miniature.rarity_type === 'Treasure Hunt' ? 'TH' : selectedSlot.miniature.rarity_type}
                </span>
              )}
            </div>
            
            {selectedSlot.miniature && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-800 pt-3 text-gray-300 font-light">
                <div><span className="text-gray-500 block font-medium">Série:</span> {selectedSlot.miniature.series || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Cor Original:</span> {selectedSlot.miniature.color || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Toy Card Code:</span> {selectedSlot.miniature.code || '---'}</div>
                <div><span className="text-gray-500 block font-medium">Ano Linha:</span> {selectedSlot.miniature.release_year || '---'}</div>
                {selectedSlot.miniature.notes && (
                  <div className="col-span-2 sm:col-span-4 mt-1 bg-gray-950 p-2.5 rounded border border-gray-800 text-gray-400">
                    <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Notas do Item:</span>
                    {selectedSlot.miniature.notes}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-5 border-t border-gray-800 pt-3 justify-end md:justify-start">
              {selectedSlot.miniature ? (
                <>
                  <button onClick={handleOpenEditModal} className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold text-xs rounded-lg transition uppercase tracking-wider">✏️ Editar</button>
                  <button onClick={() => setMovingCar(selectedSlot.miniature)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition uppercase tracking-wider">🔄 Mover</button>
                  <button onClick={() => handleDeleteCar(selectedSlot.miniature)} className="px-3 py-2 bg-red-950 border border-red-700 text-red-200 hover:bg-red-900 font-bold text-xs rounded-lg transition uppercase tracking-wider">🗑️ Remover</button>
                </>
              ) : (
                <button onClick={handleOpenCreateModal} className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black text-xs rounded-xl shadow uppercase tracking-wider">Registrar Miniatura neste Slot</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO DO EXPOSITOR */}
      {isEditingDisplay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-black text-gray-100 pb-2 border-b border-gray-800">⚙️ Configurações do Módulo</h3>
            <form onSubmit={handleUpdateDisplayMeta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Nome do Módulo</label>
                <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white text-sm focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Nova Localização Física</label>
                <select value={editDisplayLocation} onChange={(e) => setEditDisplayLocation(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white text-sm cursor-pointer">
                  <option value="Garagem">Garagem 🚗</option>
                  <option value="Quarto">Quarto 🛏️</option>
                  <option value="Corredor">Corredor 🧱</option>
                  <option value="Escadas">Escadas 🪜</option>
                  <option value="Sala de Estar">Sala de Estar 📺</option>
                  <option value="Escritório">Escritório 💼</option>
                  <option value="Outro">Outro Espaço 📦</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <button type="button" onClick={() => setIsEditingDisplay(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black text-xs rounded-xl shadow transition uppercase tracking-wider">Gravar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 MODAL FORMULÁRIO DO CARRINHO COM MULTI-UPLOAD SECUNDÁRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-xl font-black text-gray-100 pb-2 border-b border-gray-800">
              {isEditing ? '✏️ Atualizar Ficha Técnica' : `📥 Vincular Novo Item 1:64`}
            </h2>
            <form onSubmit={handleSaveCar} className="space-y-4">
              
              {/* Painel de Uploads */}
              <div className="space-y-3 bg-gray-950 p-4 rounded-xl border border-gray-800">
                {/* 1. Foto Principal (Obrigatória/Capa) */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="w-16 h-12 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {carPhotoUrl ? <img src={carPhotoUrl} className="w-full h-full object-cover" /> : <span className="text-xs opacity-30">Capa</span>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Foto de Capa (Blister Principal)</label>
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} disabled={uploadingPhoto || !userId} className="text-xs text-gray-500 file:mr-2 file:py-0.5 file:px-2 file:rounded file:bg-gray-850 file:text-gray-300 hover:file:bg-gray-800" />
                  </div>
                </div>

                {/* 2. Uploads Secundários Consecutivos (Tabela Relacional) */}
                <div className="flex flex-col sm:flex-row gap-3 items-center border-t border-gray-900 pt-2">
                  <div className="w-16 h-12 bg-gray-900 border border-gray-750 rounded-lg flex items-center justify-center text-lg text-gray-600 flex-shrink-0 font-bold">
                    +
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Adicionar Foto Extra (Verso, Detalhes...)</label>
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} disabled={uploadingPhoto || !userId} className="text-xs text-gray-500 file:mr-2 file:py-0.5 file:px-2 file:rounded file:bg-gray-850 file:text-gray-300 hover:file:bg-gray-800" />
                  </div>
                </div>

                {/* Lista Horizontal de Fotos Extra Carregadas */}
                {secondaryPhotos.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-gray-900">
                    {secondaryPhotos.map((url, idx) => (
                      <div key={idx} className="w-12 h-9 rounded bg-gray-900 border border-gray-850 overflow-hidden flex-shrink-0 relative group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setSecondaryPhotos(secondaryPhotos.filter(p => p !== url))} className="absolute inset-0 bg-red-950/80 text-white text-[9px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-bold">Remover</button>
                      </div>
                    ))}
                  </div>
                )}
                {uploadingPhoto && <p className="text-[10px] text-yellow-500 animate-pulse mt-1">A carregar e processar imagem...</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Nome Oficial da Miniatura *</label>
                <input type="text" value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Ex: Nissan Skyline GT-R (R34)" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Raridade / Linha</label>
                  <select value={carRarity} onChange={(e) => setCarRarity(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm">
                    <option value="Regular">Regular (Mainline)</option>
                    <option value="Premium">Premium</option>
                    <option value="Treasure Hunt">Treasure Hunt (TH)</option>
                    <option value="Super Treasure Hunt">Super Treasure Hunt (STH)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Ano de Lançamento</label>
                  <input type="number" value={carYear} onChange={(e) => setCarYear(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Série / Segmento</label>
                  <input type="text" value={carSeries} onChange={(e) => setCarSeries(e.target.value)} placeholder="Ex: HW J-Imports" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Pintura / Cor</label>
                  <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="Ex: Spectraflame Blue" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Código de Fabrico (Toy#)</label>
                <input type="text" value={carCode} onChange={(e) => setCarCode(e.target.value)} placeholder="Ex: GHD81" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Notas / Estado da Cartela</label>
                <textarea value={carNotes} onChange={(e) => setCarNotes(e.target.value)} placeholder="Ex: Cartela curta, bolha com detalhe..." rows={2} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-2.5 text-white text-sm resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancelar</button>
                <button type="submit" disabled={uploadingPhoto} className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black text-xs rounded-xl shadow transition uppercase tracking-wider">
                  Salvar na Grelha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}