import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import VirtualDisplay from './VirtualDisplay';
import ProfileSettingsModal from './ProfileSettingsModal';

// ==========================================
// COMPONENTE GESTOR DA VISUALIZAÇÃO (SOCIAL / PRIVADO)
// ==========================================
function GaragemContainer({ session }: { session: any }) {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const inicializarVisualizacao = async () => {
      setLoading(true);
      try {
        if (username) {
          // 1. MODO SOCIAL: Estamos a visitar o link de outro colecionador (/p/username)
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, bio, location, is_premium')
            .eq('username', username)
            .single();

          if (data && !error) {
            setTargetUserId(data.id);
            setProfileData(data);
          } else {
            alert('Colecionador não encontrado na rede WheelTrack!');
            navigate('/'); // Redireciona para a nossa garagem se o utilizador não existir
          }
        } else if (session?.user) {
          // 2. MODO PRIVADO: Estamos na nossa própria garagem (/)
          setTargetUserId(session.user.id);
          
          // Vai buscar os dados do teu perfil para preencher o cabeçalho
          const { data } = await supabase
            .from('profiles')
            .select('full_name, bio, location, is_premium')
            .eq('id', session.user.id)
            .single();
            
          if (data) setProfileData(data);
        }
      } catch (err) {
        console.error("Erro ao inicializar rota:", err);
      } finally {
        setLoading(false);
      }
    };

    inicializarVisualizacao();
  }, [username, session, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-xs tracking-widest text-yellow-500 uppercase">
          A carregar garagem virtual...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-950 text-white font-sans pb-16">
      
      {/* CABEÇALHO SOCIAL DA REDE DE COLECIONADORES */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                {username ? `Garagem de ${profileData?.full_name || username}` : `A Minha Garagem`}
              </h1>
              {profileData?.is_premium && (
                <span className="text-[10px] bg-yellow-500 text-black px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase shadow-md">
                  PREMIUM
                </span>
              )}
            </div>
            
            {profileData?.bio && (
              <p className="text-sm text-gray-400 mt-2 max-w-xl">{profileData.bio}</p>
            )}
            
            {profileData?.location && (
              <span className="text-xs text-gray-500 font-medium block mt-2">📍 {profileData.location}</span>
            )}
          </div>

          {/* BOTÕES DE ACÇÃO DO TOPO */}
          <div className="flex gap-2 w-full md:w-auto">
            {!username ? (
              <>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-gray-950 hover:bg-gray-800 border border-gray-750 hover:border-gray-600 text-xs font-bold rounded-xl transition text-gray-300 w-1/2 md:w-auto uppercase tracking-wider"
                >
                  ⚙️ Perfil da Rede
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 text-xs font-bold rounded-xl transition w-1/2 md:w-auto uppercase tracking-wider"
                >
                  Sair
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black rounded-xl transition shadow-md uppercase tracking-wider w-full md:w-auto"
              >
                Voltar à Minha Garagem
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RENDERIZADOR PRINCIPAL DA APP (PASSANDO AS PROPS DINÂMICAS) */}
      {targetUserId && (
        <VirtualDisplay targetUserId={targetUserId} isViewingPublic={!!username} />
      )}

      {/* Etiqueta de Utilizador Autenticado */}
      {session?.user && (
        <div className="fixed bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-800 px-4 py-2 rounded-full z-50 pointer-events-none shadow-xl">
          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
            Utilizador: <span className="text-yellow-500">{session.user.email}</span>
          </span>
        </div>
      )}

      {/* MODAL PARA ALTERAR O USERNAME E VERIFICAÇÃO EM TEMPO REAL */}
      <ProfileSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveComplete={() => {
          setIsSettingsOpen(false);
          window.location.reload(); // Recarrega para desenhar as novas definições no ecrã
        }}
      />
    </div>
  );
}

// ==========================================
// ROUTER E PORTAL DE ENTRADA (LOGIN / REGISTO)
// ==========================================
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Valida sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta logins/logouts em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (isRegistering) {
      if (!fullName.trim()) {
        setMessage('Erro: Tens de escolher um Nome de Colecionador.');
        return;
      }

      // No registo, passamos o full_name nos metadados (o robô do Supabase lê isto e cria o perfil automaticamente)
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });
      
      if (error) {
        setMessage(`Erro: ${error.message}`);
      } else if (data?.user) {
        setMessage('Registo feito com sucesso! Confirma o e-mail de ativação.');
        setFullName('');
      }
    } else {
      // Login Convencional
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Erro: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-xs tracking-widest text-gray-500 uppercase">
          A inicializar segurança...
        </div>
      </div>
    );
  }

  // Se o utilizador NÃO estiver logado, exibe o portal de autenticação
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-yellow-500 tracking-tight">Mavicut WheelTrack</h1>
            <p className="text-sm text-gray-400 mt-2">A primeira rede social de colecionadores de miniaturas</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Nome de Colecionador</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Paulo Silva"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition placeholder-gray-600 text-sm"
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
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition placeholder-gray-600 text-sm"
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
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition placeholder-gray-600 text-sm"
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
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black p-3 rounded-lg shadow-lg transition uppercase tracking-wider text-xs"
            >
              {isRegistering ? 'Criar Conta na Rede' : 'Entrar na Garagem'}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-gray-800 pt-4">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage('');
                setFullName('');
              }}
              className="text-xs text-yellow-500 hover:underline font-bold"
            >
              {isRegistering ? 'Já tens conta? Entra aqui' : 'Não tens conta? Regista-te agora'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // APLICAÇÃO COM ROUTER INSTALADO
  return (
    <Router>
      <Routes>
        {/* Rota Raiz: Acede à tua própria garagem */}
        <Route path="/" element={<GaragemContainer session={session} />} />
        
        {/* Rota Dinâmica: Abre o perfil de qualquer colecionador */}
        <Route path="/p/:username" element={<GaragemContainer session={session} />} />
      </Routes>
    </Router>
  );
}