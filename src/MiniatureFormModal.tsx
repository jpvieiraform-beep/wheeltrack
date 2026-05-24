import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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
  const [carName, setCarName] = useState('');
  const [carRarity, setCarRarity] = useState('Regular');
  const [carYear, setCarYear] = useState('2026');
  const [carSeries, setCarSeries] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carCode, setCarCode] = useState('');
  const [carFactoryCode, setCarFactoryCode] = useState(''); // Novo estado para Código de Fabrico
  const [carNotes, setCarNotes] = useState('');
  const [carPhotoUrl, setCarPhotoUrl] = useState<string | null>(null);
  const [carIsForTrade, setCarIsForTrade] = useState(false);
  const [secondaryPhotos, setSecondaryPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (existingCar) {
      setCarName(existingCar.name || '');
      setCarRarity(existingCar.rarity_type || 'Regular');
      setCarYear((existingCar.release_year || 2026).toString());
      setCarSeries(existingCar.series || '');
      setCarColor(existingCar.color || '');
      setCarCode(existingCar.code || '');
      setCarFactoryCode(existingCar.factory_code || ''); // Carrega o código de fabrico
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
      alert('Erro upload: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!carName.trim() || !slot || !user) return;

    const parsedYear = parseInt(carYear, 10) || 2026;
    const payload = {
      name: carName,
      rarity_type: carRarity,
      release_year: parsedYear,
      series: carSeries.trim() || null,
      color: carColor.trim() || null,
      code: carCode.trim() || null,
      factory_code: carFactoryCode.trim() || null, // Guarda o código de fabrico
      notes: carNotes.trim() || null,
      photo_url: carPhotoUrl,
      is_for_trade: carIsForTrade
    };

    if (existingCar) {
      const { error } = await supabase.from('miniatures').update(payload).eq('id', existingCar.id);
      if (!error && secondaryPhotos.length > 0) {
        const bulkPhotos = secondaryPhotos.map(url => ({ miniature_id: existingCar.id, photo_url: url }));
        await supabase.from('miniature_photos').insert(bulkPhotos);
      }
    } else {
      await supabase.from('miniatures').insert([{
        user_id: user.id,
        display_id: displayId,
        display_row: slot.row,
        display_column: slot.col,
        ...payload
      }]);
    }
    onSaveComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-lg font-black text-white border-b border-gray-800 pb-2">Ficha Técnica da Miniatura</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Zona de Imagens */}
          <div className="bg-gray-950 p-3 rounded-xl border border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-gray-400 font-medium">Imagens do Modelo:</label>
              {uploadingPhoto && <span className="text-[10px] text-yellow-500 animate-pulse">A carregar...</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} className="text-xs text-gray-500" />
              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} className="text-xs text-gray-500" />
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Oficial *</label>
            <input type="text" value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Ex: '67 Camaro" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" required />
          </div>

          {/* Linha: Raridade / Código Toy# */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Raridade</label>
              <select value={carRarity} onChange={(e) => setCarRarity(e.target.value)} className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition">
                <option value="Regular">Regular (Mainline)</option>
                <option value="Premium">Premium</option>
                <option value="Treasure Hunt">Treasure Hunt (TH)</option>
                <option value="Super Treasure Hunt">Super Treasure Hunt (STH)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Código Toy#</label>
              <input type="text" value={carCode} onChange={(e) => setCarCode(e.target.value)} placeholder="Ex: GHD81" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" />
            </div>
          </div>

          {/* Linha: Série / Ano */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Série</label>
              <input type="text" value={carSeries} onChange={(e) => setCarSeries(e.target.value)} placeholder="Ex: HW Flames" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Ano</label>
              <input type="number" value={carYear} onChange={(e) => setCarYear(e.target.value)} className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" required />
            </div>
          </div>

          {/* Linha: Cor / Código de Fabrico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Cor / Pintura</label>
              <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="Ex: Spectraflame Red" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Cód. Fabrico</label>
              <input type="text" value={carFactoryCode} onChange={(e) => setCarFactoryCode(e.target.value)} placeholder="Ex: N23 (Base Code)" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-gray-400 uppercase mb-1">Notas / Observações</label>
            <textarea 
              value={carNotes} 
              onChange={(e) => setCarNotes(e.target.value)} 
              placeholder="Detalhes sobre o estado do blister, variações de roda..." 
              className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white h-20 resize-none focus:outline-none focus:border-yellow-500 transition"
            ></textarea>
          </div>

          {/* Toggle de Troca */}
          <div className="bg-blue-950/30 border border-blue-900/50 p-3 rounded-xl flex items-center justify-between mt-2">
            <div>
              <label className="block text-xs font-bold text-blue-400 uppercase cursor-pointer" htmlFor="tradeToggle">Disponível para Troca?</label>
              <span className="text-[10px] text-gray-400 block font-light">Sinaliza este item como repetido para a rede.</span>
            </div>
            <input id="tradeToggle" type="checkbox" checked={carIsForTrade} onChange={(e) => setCarIsForTrade(e.target.checked)} className="w-5 h-5 rounded bg-gray-950 text-blue-600 focus:ring-0 cursor-pointer" />
          </div>

          {/* Botões Base */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg transition">Salvar Ficha</button>
          </div>
        </form>
      </div>
    </div>
  );
}