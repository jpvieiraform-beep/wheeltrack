import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { logActivity } from './activityService';

interface MiniatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  displayId: string;
  slot: { row: number, col: number } | null;
  existingCar?: any;
}

const STORAGE_BUCKET_NAME = 'miniatures_photos';

export default function MiniatureFormModal({ isOpen, onClose, onSaveComplete, displayId, slot, existingCar }: MiniatureFormModalProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [carName, setCarName] = useState('');
  const [carRarity, setCarRarity] = useState('Regular');
  const [carYear, setCarYear] = useState('2026');
  const [carSeries, setCarSeries] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carCode, setCarCode] = useState('');
  const [carFactoryCode, setCarFactoryCode] = useState('');
  const [carNotes, setCarNotes] = useState('');
  const [carPhotoUrl, setCarPhotoUrl] = useState<string | null>(null);
  const [carIsForTrade, setCarIsForTrade] = useState(false);
  const [secondaryPhotos, setSecondaryPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // deteta o utilizador atualmente ligado na app
  useEffect(() => {
    const getLoggedUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getLoggedUser();
  }, []);

  useEffect(() => {
    if (existingCar) {
      setCarName(existingCar.name || '');
      setCarRarity(existingCar.rarity_type || 'Regular');
      setCarYear((existingCar.release_year || 2026).toString());
      setCarSeries(existingCar.series || '');
      setCarColor(existingCar.color || '');
      setCarCode(existingCar.code || '');
      setCarFactoryCode(existingCar.factory_code || '');
      setCarNotes(existingCar.notes || '');
      setCarPhotoUrl(existingCar.photo_url || null);
      setCarIsForTrade(existingCar.is_for_trade || false);
      
      const fetchPhotos = async () => {
        const { data } = await supabase.from('miniature_photos').select('photo_url').eq('miniature_id', existingCar.id);
        setSecondaryPhotos(data?.map(p => p.photo_url) || []);
      };
      fetchPhotos();
    } else {
      setCarName('');
      setCarRarity('Regular');
      setCarYear('2026');
      setCarSeries('');
      setCarColor('');
      setCarCode('');
      setCarFactoryCode('');
      setCarNotes('');
      setCarPhotoUrl(null);
      setCarIsForTrade(false);
      setSecondaryPhotos([]);
    }
  }, [existingCar, isOpen]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, isSecondary: boolean = false) => {
    try {
      setUploadingPhoto(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!event.target.files || event.target.files.length === 0 || !user) return;

      const originalFile = event.target.files[0];
      const compressedBlob = await new Promise<Blob>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(originalFile);
        reader.onload = (e: any) => {
          const img = new Image();
          img.src = e.target.result;
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
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.7);
          };
        };
      });

      const fileName = `${user.id}/${Date.now()}_${isSecondary ? 'sec' : 'prim'}.jpg`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET_NAME).upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(fileName);

      if (isSecondary) setSecondaryPhotos(prev => [...prev, publicUrl]);
      else setCarPhotoUrl(publicUrl);
    } catch (error: any) {
      alert('Erro no upload da imagem: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!carName.trim() || !user) return;

    const parsedYear = parseInt(carYear, 10) || 2026;
    const payload = {
      name: carName,
      rarity_type: carRarity,
      release_year: parsedYear,
      series: carSeries.trim() || null,
      color: carColor.trim() || null,
      code: carCode.trim() || null,
      factory_code: carFactoryCode.trim() || null,
      notes: carNotes.trim() || null,
      photo_url: carPhotoUrl,
      is_for_trade: carIsForTrade
    };

    try {
      if (existingCar) {
        const { error: updateError } = await supabase.from('miniatures').update(payload).eq('id', existingCar.id);
        if (updateError) throw updateError;
        
        if (secondaryPhotos.length > 0) {
          const bulkPhotos = secondaryPhotos.map(url => ({ miniature_id: existingCar.id, photo_url: url }));
          await supabase.from('miniature_photos').insert(bulkPhotos);
        }
      } else {
        const finalRow = slot?.row || Math.floor(Math.random() * 900000) + 1000;
        const finalCol = slot?.col || Math.floor(Math.random() * 900000) + 1000;

        const { data: insertedData, error: insertError } = await supabase.from('miniatures').insert([{
          user_id: user.id,
          display_id: displayId,
          display_row: finalRow,
          display_column: finalCol,
          ...payload
        }]).select();
        
        if (insertError) throw insertError;

        // 🎯 GATILHO: REGISTAR ATIVIDADE NO FEED AUTOMATICAMENTE
        if (insertedData && insertedData.length > 0) {
          const miniatureId = insertedData[0].id;
          const rarityEmoji = carRarity === 'Super Treasure Hunt' ? '⭐' : carRarity === 'Treasure Hunt' ? '🌟' : '🚗';
          const description = `Adicionou o ${rarityEmoji} ${carName}${carSeries ? ` (${carSeries})` : ''} à sua coleção`;
          
          await logActivity(
            'car_added',
            description,
            miniatureId,
            { 
              rarity: carRarity, 
              series: carSeries,
              photo_url: carPhotoUrl
            }
          );
        }
      }
      onSaveComplete();
    } catch (error: any) {
      console.error("Erro ao gravar:", error);
      alert("Erro ao gravar no servidor: " + error.message);
    }
  };

  if (!isOpen) return null;

  // REGRA DE OURO: O utilizador atual é o dono deste carro?
  // Se for um carro novo (não tem existingCar), a resposta é SIM.
  const isOwner = !existingCar || existingCar.user_id === currentUserId;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-gray-800 pb-2">
          {isOwner ? 'Ficha Técnica' : 'Detalhes da Miniatura'}
        </h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Imagens - Só mostra botões de upload se for o dono */}
          <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Imagens do Modelo</label>
              {uploadingPhoto && <span className="text-[10px] font-bold text-yellow-500 animate-pulse">A carregar...</span>}
            </div>
            {isOwner ? (
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} className="text-xs text-gray-500 w-full" />
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} className="text-xs text-gray-500 w-full" />
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                {carPhotoUrl || secondaryPhotos.length > 0 ? "Galeria de imagens disponível" : "Nenhuma imagem carregada pelo proprietário."}
              </div>
            )}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Oficial *</label>
            <input type="text" value={carName} onChange={(e) => setCarName(e.target.value)} disabled={!isOwner} placeholder="Ex: '67 Camaro" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
          </div>

          {/* Raridade e Ano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Raridade</label>
              <select value={carRarity} onChange={(e) => setCarRarity(e.target.value)} disabled={!isOwner} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white outline-none focus:border-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="Regular">Regular</option>
                <option value="Premium">Premium</option>
                <option value="Treasure Hunt">TH</option>
                <option value="Super Treasure Hunt">STH</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ano</label>
              <input type="number" value={carYear} onChange={(e) => setCarYear(e.target.value)} disabled={!isOwner} className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          {/* Série e Código Toy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Série</label>
              <input type="text" value={carSeries} onChange={(e) => setCarSeries(e.target.value)} disabled={!isOwner} placeholder="Ex: HW Flames" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Código Toy</label>
              <input type="text" value={carCode} onChange={(e) => setCarCode(e.target.value)} disabled={!isOwner} placeholder="Ex: GHD81" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          {/* Cor e Código de Fabrico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor / Pintura</label>
              <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} disabled={!isOwner} placeholder="Ex: Vermelho" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cód. Fabrico</label>
              <input type="text" value={carFactoryCode} onChange={(e) => setCarFactoryCode(e.target.value)} disabled={!isOwner} placeholder="Ex: N23" className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Observações</label>
            <textarea value={carNotes} onChange={(e) => setCarNotes(e.target.value)} disabled={!isOwner} placeholder="Nenhuma observação adicionada." className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:border-yellow-500 outline-none transition resize-none h-20 disabled:opacity-50 disabled:cursor-not-allowed" />
          </div>

          {/* Estado de Troca */}
          <div className={`p-3 rounded-xl flex items-center justify-between ${carIsForTrade ? 'bg-blue-950/30 border border-blue-900/50' : 'bg-gray-950 border border-gray-800'}`}>
            <div>
              <label className={`block text-[10px] font-bold uppercase ${carIsForTrade ? 'text-blue-400' : 'text-gray-400'}`}>
                {carIsForTrade ? 'Disponível para Troca' : 'Item de Coleção Privada'}
              </label>
              <span className="text-[10px] text-gray-500 block font-light">
                {carIsForTrade ? 'Este colecionador aceita propostas de negócio para esta peça.' : 'Este artigo não está disponível para negociação.'}
              </span>
            </div>
            {isOwner && (
              <input id="tradeToggle" type="checkbox" checked={carIsForTrade} onChange={(e) => setCarIsForTrade(e.target.checked)} className="w-5 h-5 rounded bg-gray-950 text-blue-600 cursor-pointer" />
            )}
          </div>

          {/* Botões Dinâmicos */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition">
              {isOwner ? 'Cancelar' : 'Fechar'}
            </button>
            
            {isOwner ? (
              <button type="submit" disabled={uploadingPhoto} className="px-6 py-2.5 bg-yellow-500 text-black font-black text-xs rounded-lg uppercase shadow-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {uploadingPhoto ? 'Aguarde...' : 'Salvar Ficha'}
              </button>
            ) : carIsForTrade ? (
              <button type="button" onClick={() => alert('Em breve: Sistema de mensagens para trocas!')} className="px-6 py-2.5 bg-blue-600 text-white font-black text-xs rounded-lg uppercase shadow-lg hover:bg-blue-500 transition">
                Propor Troca
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
