import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose, onSaveComplete }: ProfileSettingsModalProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  
  const [statusMessage, setStatusMessage] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Carrega os dados atuais do perfil do utilizador logado
  useEffect(() => {
    if (!isOpen) return;

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, location, bio')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setLocation(data.location || '');
        setBio(data.bio || '');
        setStatusMessage('✅ O teu username atual');
        setIsValid(true);
      }
    };

    loadProfile();
  }, [isOpen]);

  // 2. VERIFICAÇÃO EM TEMPO REAL: Corre a cada tecla que o utilizador digita
  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputName = e.target.value.trim().toLowerCase();
    // Limpa caracteres especiais inválidos para URLs (só deixa letras, números e underscores)
    const nomeLimpo = inputName.replace(/[^a-z0-9_]/g, '');
    setUsername(nomeLimpo);

    if (nomeLimpo.length < 3) {
      setStatusMessage('❌ O nome deve ter pelo menos 3 caracteres.');
      setIsValid(false);
      return;
    }

    // Procura na tabela se já existe outra pessoa com este username (excluindo o próprio utilizador)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', nomeLimpo);

    if (error) {
      console.error(error);
      return;
    }

    // Se encontrou alguém e esse alguém não sou eu, o nome está ocupado
    const isOccupied = data && data.length > 0 && data[0].id !== userId;

    if (isOccupied) {
      setStatusMessage('❌ Este username já está a ser utilizado por outro colecionador.');
      setIsValid(false);
    } else {
      setStatusMessage('✅ Username disponível!');
      setIsValid(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !userId || saving) return;

    try {
      setSaving(true);

      const payload = {
        username: username,
        full_name: fullName.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (error) throw error;

      onSaveComplete();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao guardar perfil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-gray-800 pb-2">Editar Perfil da Rede</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Campo de Username com Link */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">O teu link único (Username) *</label>
            <div className="flex items-center bg-gray-950 border border-gray-700 rounded-lg p-3 focus-within:border-yellow-500 transition">
              <span className="text-sm text-gray-500 font-mono select-none">wheeltrack.mavicut.pt/p/</span>
              <input 
                type="text" 
                value={username} 
                onChange={handleUsernameChange} 
                placeholder="paulo_apulia" 
                className="bg-transparent text-sm text-white outline-none w-full lowercase font-mono"
                required 
              />
            </div>
            <p className={`text-[11px] mt-1 font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>
              {statusMessage}
            </p>
          </div>

          {/* Nome de Exibição */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome de Colecionador</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Ex: Paulo Silva" 
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:border-yellow-500 outline-none transition" 
            />
          </div>

          {/* Localidade */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Localização / Região</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Ex: Apúlia, Esposende" 
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:border-yellow-500 outline-none transition" 
            />
          </div>

          {/* Biografia */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sobre mim (Biografia)</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Conta à malta o que gostas de colecionar... Só Hot Wheels? Procuras STH?" 
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 h-24 outline-none focus:border-yellow-500 transition resize-none"
            ></textarea>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition">Cancelar</button>
            <button 
              type="submit" 
              disabled={!isValid || saving} 
              className="px-6 py-2.5 bg-yellow-500 text-black font-black text-xs rounded-lg uppercase shadow-lg hover:bg-yellow-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'A guardar...' : 'Gravar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}