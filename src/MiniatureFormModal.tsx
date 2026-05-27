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
  const [carFactoryCode, setCarFactoryCode] = useState('');
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
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => { if (b) resolve(b); }, 'image/jpeg', 0.7);
          };
        };
      });

      const fileName = `${user.id}/${Date.now()}_${isSecondary ? 'sec' : 'prim'}.jpg`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET_NAME).upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(fileName);
      if (isSecondary) setSecondaryPhotos(prev => [...prev, publicUrl]);
      else setCarPhotoUrl(publicUrl);
    } catch (e: any) { alert('Erro upload: ' + e.message); } 
    finally { setUploadingPhoto(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!carName.trim() || !slot || !user) return;

    const payload = {
      name: carName,
      rarity_type: carRarity,
      release_year: parseInt(carYear, 10) || 2026,
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
        const { error: insertError } = await supabase.from('miniatures').insert([{
          user_id: user.id, display_id: displayId, display_row: slot.row, display_column: slot.col, ...payload
        }]);
        if (insertError) throw insertError;
      }
      onSaveComplete(); // Só fecha se chegar aqui sem erros
    } catch (err: any) {
      console.error("Erro Supabase:", err);
      alert("Erro ao gravar no servidor: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-lg font-black text-white border-b border-gray-800 pb-2">Ficha Técnica</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-gray-950 p-3 rounded-xl border border-gray-850 space-y-2">
            <label className="text-gray-400 font-medium text-xs">Imagens do Modelo:</label>
            <div className="flex gap-2 flex-wrap">
              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, false)} className="text-xs text-gray-500" />
              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, true)} className="text-xs text-gray-500" />
            </div>
            {uploadingPhoto && <span className="text-[10px] text-yellow-500 animate-pulse">A carregar...</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Oficial *</label>
            <input type="text" value={carName} onChange={(e) => setCarName(e.target.value)} className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
             {/* Adiciona aqui os teus campos de Raridade, Ano, Serie, etc. igual ao que tinhas */}
             <select value={carRarity} onChange={(e) => setCarRarity(e.target.value)} className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white">
                <option value="Regular">Regular</option>
                <option value="Premium">Premium</option>
                <option value="Treasure Hunt">TH</option>
                <option value="Super Treasure Hunt">STH</option>
             </select>
             <input type="number" value={carYear} onChange={(e) => setCarYear(e.target.value)} className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-sm text-white" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-400">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase">Salvar Ficha</button>
          </div>
        </form>
      </div>
    </div>
  );
}