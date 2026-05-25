import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import VirtualDisplay from './VirtualDisplay';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // NOVO ESTADO: Nome de Colecionador
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Verificar se o utilizador já está logado ao abrir a app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escutar alterações na sessão (login, logout, registo)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (isRegistering) {
      // REGISTO DE NOVO UTILIZADOR
      if (!fullName.trim()) {
        setMessage('Erro: Tens de escolher um Nome de Colecionador.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        setMessage(`Erro: ${error.message}`);
      } else if (data?.user) {
        // Criar o perfil na tabela user_profiles com o nome inserido
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            { 
              id: data.user.id, 
              full_name: fullName.trim(),
              subscription_status: 'free' 
            }
          ]);

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError.message);
        }

        setMessage('Registo feito com sucesso! Confirma o teu email.');
        setFullName('');
      }
    } else {
      // LOGIN DE UTILIZADOR EXISTENTE
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Erro: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
        A inicializar segurança...
      </div>
    );
  }

  // Se o utilizador NÃO estiver logado, mostra o portal de entrada
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-yellow-500 tracking-tight">Mavicut WheelTrack</h1>
            <p className="text-sm text-gray-400 mt-2">Gere a tua coleção e os teus expositores físicos</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* NOVO CAMPO: APARECE APENAS NO REGISTO */}
            {isRegistering && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Nome de Colecionador (Username)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Paulo_HotWheels"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition"
                  required={isRegistering}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o-teu-email@gmail.com"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Palavra-passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-gray-950 border border-gray-750 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition"
                required
              />
            </div>

            {message && (
              <p className="text-xs text-center font-medium p-2 rounded bg-gray-950 text-yellow-500 border border-gray-800">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold p-3 rounded-lg shadow-lg transition"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar na Garagem'}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-gray-800 pt-4">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage('');
                setFullName('');
              }}
              className="text-xs text-yellow-500 hover:underline"
            >
              {isRegistering ? 'Já tens conta? Entra aqui' : 'Não tens conta? Regista-te agora'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se o utilizador ESTIVER logado, renderiza apenas o controlador principal
  return (
    <div className="relative min-h-screen bg-gray-950">
      {/* O VirtualDisplay agora gere o seu próprio cabeçalho e botão de Sair */}
      <VirtualDisplay />

      {/* Etiqueta discreta com o Email no canto inferior direito */}
      <div className="fixed bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm border border-gray-800 px-3 py-1.5 rounded-full z-50 pointer-events-none shadow-lg">
        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
          👤 {session.user.email}
        </span>
      </div>
    </div>
  );
}