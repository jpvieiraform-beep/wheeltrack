import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import VirtualDisplay from './VirtualDisplay';
import ProfileSettingsModal from './ProfileSettingsModal';

// ==========================================
// COMPONENTE: FEED DA COMUNIDADE (MERCADO DE TROCAS)
// ==========================================
function FeedComunidade() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      // Procura as miniaturas para troca e cruza com os dados do perfil do dono
      const { data, error } = await supabase
        .from('miniatures')
        .select(`
          id, name, rarity_type, release_year, series, photo_url, user_id,
          profiles!miniatures_user_id_fkey ( username, full_name, location )
        `)
        .eq('is_for_trade', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    };
    loadFeed();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-sm font-bold text-sky-300 animate-pulse uppercase tracking-widest">A sintonizar radar de trocas...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 mt-8 animate-fade-in">
      <div className="border-b border-sky-900/60 pb-3 mb-6">
        <h2 className="text-lg font-black uppercase tracking-wider text-yellow-400">🔄 Radar de Trocas em Portugal</h2>
        <p className="text-xs text-sky-200/70">Vê os últimos modelos que entraram para troca nas garagens da comunidade.</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-sky-950/20 border border-sky-900/40 rounded-2xl text-xs text-sky-300/60 font-bold uppercase tracking-wider">
          Nenhum carrinho no mercado de trocas de momento. Sé o primeiro!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => {
            const perfil = item.profiles;
            return (
              <div key={item.id} className="bg-sky-950/40 border border-sky-900/50 rounded-2xl p-4 flex gap-4 hover:border-sky-500/50 transition shadow-lg backdrop-blur-sm">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl border border-sky-900 bg-sky-950 shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-sky-950 border border-sky-900 rounded-xl flex items-center justify-center text-2xl shrink-0 select-none">🚗</div>
                )}
                <div className="flex flex-col justify-between w-full min-w-0">
                  <div>
                    <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">{item.rarity_type}</span>
                    <h3 className="text-sm font-black text-white truncate mt-1 uppercase tracking-tight">{item.name}</h3>
                    <p className="text-[11px] text-sky-300/80 truncate font-medium">{item.series || 'Série Não Especificada'} ({item.release_year})</p>
                  </div>
                  
                  <div className="pt-2 border-t border-sky-900/40 flex justify-between items-center mt-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-yellow-500 font-bold block truncate">👤 {perfil?.full_name || 'Colecionador'}</span>
                      <span className="text-[9px] text-sky-400 font-medium block truncate">📍 {perfil?.location || 'Portugal'}</span>
                    </div>
                    {perfil?.username && (
                      <button 
                        onClick={() => navigate(`/p/${perfil.username}`)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-[10px] rounded-lg uppercase tracking-wider transition shrink-0"
                      >
                        Ver Garagem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE GESTOR DA VISUALIZAÇÃO DA GARAGEM
// ==========================================
function GaragemContainer({ session }: { session: any }) {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'garagem' | 'feed'>('garagem');

  useEffect(() => {
    const inicializarVisualizacao = async () => {
      setLoading(true);
      try {
        if (username) {
          setActiveTab('garagem'); // Força aba da garagem ao visitar terceiros
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
            navigate('/');
          }
        } else if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, bio, location, is_premium')
            .eq('id', session.user.id)
            .single();
            
          setTargetUserId(session.user.id);
          if (data) setProfileData(data);
        }
      } catch (err) {
        console.error("Erro ao inicializar:", err);
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
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-slate-950 to-black text-white flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-xs tracking-widest text-yellow-400 uppercase">
          A sintonizar frequências da rede...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-950 via-slate-950 to-black text-white font-sans pb-16">
      
      {/* CABEÇALHO SOCIAL DA REDE DE COLECIONADORES */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="bg-sky-900/30 border border-sky-800/40 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                {username ? `Garagem de ${profileData?.full_name || username}` : `A Minha Garagem`}
              </h1>
              {profileData?.is_premium && (
                <span className="text-[10px] bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase shadow-md">
                  PREMIUM
                </span>
              )}
            </div>
            {profileData?.bio && <p className="text-sm text-sky-200/70 mt-2 max-w-xl">{profileData.bio}</p>}
            {profileData?.location && <span className="text-xs text-sky-400 font-medium block mt-2">📍 {profileData.location}</span>}
          </div>

          {/* BOTÕES DE ACÇÃO */}
          <div className="flex gap-2 w-full md:w-auto">
            {!username ? (
              <>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-sky-950 border border-sky-800 hover:border-sky-500 text-xs font-bold rounded-xl transition text-sky-200 w-1/2 md:w-auto uppercase tracking-wider"
                >
                  ⚙️ Perfil
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 text-red-400 text-xs font-bold rounded-xl transition w-1/2 md:w-auto uppercase tracking-wider"
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

        {/* SELEÇÃO DE ABAS (SÓ APARECE NA NOSSA PRÓPRIA CONTA) */}
        {!username && (
          <div className="flex gap-2 mt-6 border-b border-sky-900/40 pb-2">
            <button
              onClick={() => setActiveTab('garagem')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${activeTab === 'garagem' ? 'bg-yellow-500 text-black font-black' : 'text-sky-300 hover:text-white'}`}
            >
              🏁 Os Meus Módulos
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${activeTab === 'feed' ? 'bg-yellow-500 text-black font-black' : 'text-sky-300 hover:text-white'}`}
            >
              🌍 Mercado Global de Trocas
            </button>
          </div>
        )}
      </div>

      {/* ALTERNADOR DE CONTEÚDO */}
      {activeTab === 'feed' && !username ? (
        <FeedComunidade />
      ) : (
        targetUserId && (
          <VirtualDisplay targetUserId={targetUserId} isViewingPublic={!!username} />
        )
      )}

      {/* Marcador de Login */}
      {session?.user && (
        <div className="fixed bottom-4 right-4 bg-sky-950/90 backdrop-blur-sm border border-sky-800 px-4 py-2 rounded-full z-50 pointer-events-none shadow-2xl">
          <span className="text-[10px] text-sky-300 font-mono flex items-center gap-2">
            ID: <span className="text-yellow-400 font-bold">{session.user.email}</span>
          </span>
        </div>
      )}

      <ProfileSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveComplete={() => {
          setIsSettingsOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

// ==========================================
// ROUTER E PORTAL DE ENTRADA (LOOK HOT WHEELS CERULEANO)
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName.trim() } }
      });
      
      if (error) {
        setMessage(`Erro: ${error.message}`);
      } else if (data?.user) {
        setMessage('Registo feito com sucesso! Confirma o e-mail de ativação.');
        setFullName('');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Erro: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="animate-pulse font-bold text-xs tracking-widest text-sky-400 uppercase">A calibrar segurança...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-900 via-slate-950 to-black text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-sky-950/30 border border-sky-800/50 p-8 rounded-2xl max-w-md w-full shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-yellow-400 tracking-tight uppercase italic border-b-2 border-yellow-400 pb-2 inline-block">WHEELTRACK</h1>
            <p className="text-xs text-sky-300 font-bold uppercase tracking-wider mt-3">A tua garagem de miniaturas online</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-black text-sky-300 uppercase mb-2 tracking-wider">Nome de Colecionador</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Paulo Silva"
                  className="w-full bg-sky-950/60 border border-sky-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 transition placeholder-sky-800 text-sm"
                  required={isRegistering}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-sky-300 uppercase mb-2 tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o-teu-email@gmail.com"
                className="w-full bg-sky-950/60 border border-sky-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 transition placeholder-sky-800 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-sky-300 uppercase mb-2 tracking-wider">Palavra-passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-sky-950/60 border border-sky-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 transition placeholder-sky-800 text-sm"
                required
              />
            </div>

            {message && (
              <p className="text-xs text-center font-bold p-2.5 rounded bg-sky-950 border border-sky-800 text-yellow-400">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black p-3.5 rounded-lg shadow-xl transition uppercase tracking-widest text-xs"
            >
              {isRegistering ? 'Criar Garagem' : 'Entrar na Garagem'}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-sky-900/40 pt-4">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage('');
                setFullName('');
              }}
              className="text-xs text-sky-300 hover:text-white font-bold transition"
            >
              {isRegistering ? 'Já tens conta? Iniciar Sessão' : 'Não tens conta? Regista-te na Rede'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<GaragemContainer session={session} />} />
        <Route path="/p/:username" element={<GaragemContainer session={session} />} />
      </Routes>
    </Router>
  );
}