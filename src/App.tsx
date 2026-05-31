import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import VirtualDisplay from './VirtualDisplay';
import Dashboard from './Dashboard';
import ProfileSettingsModal from './ProfileSettingsModal';

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
  
  // Sincronização centralizada com os nomes de abas exigidos pelo teu Dashboard.tsx
  const [activeTab, setActiveTab] = useState<'modules' | 'market' | 'wishlist' | 'matches' | 'feed'>('modules');
  
  // Captura se o utilizador está a inspecionar uma vitrine ou caixa específica
  const [selectedDisplay, setSelectedDisplay] = useState<any>(null);

  // Estados espelhados para alimentar a lógica interna do Dashboard
  const [allMiniatures, setAllMiniatures] = useState<any[]>([]);
  const [displaysList, setDisplaysList] = useState<any[]>([]);
  const [globalMarket, setGlobalMarket] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  const syncData = async (userId: string) => {
    const { data: mins } = await supabase.from('miniatures').select('*').eq('user_id', userId);
    setAllMiniatures(mins || []);
    
    const { data: disps } = await supabase.from('displays').select('*').eq('user_id', userId);
    setDisplaysList(disps || []);

    const { data: wish } = await supabase.from('wishlist').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setWishlist(wish || []);

    const { data: market } = await supabase.from('miniatures').select('*').eq('is_for_trade', true).order('created_at', { ascending: false });
    setGlobalMarket(market || []);
  };

  useEffect(() => {
    const inicializarVisualizacao = async () => {
      setLoading(true);
      try {
        if (username) {
          setActiveTab('modules');
          const { data, error } = await supabase
            .from('user_profiles') 
            .select('id, full_name, subscription_status')
            .eq('username', username)
            .maybeSingle();

          if (data && !error) {
            setTargetUserId(data.id);
            setProfileData({
              full_name: data.full_name,
              is_premium: data.subscription_status === 'premium'
            });
            await syncData(data.id);
          } else {
            alert('Colecionador não encontrado na rede WheelTrack!');
            navigate('/');
          }
        } else if (session?.user) {
          setTargetUserId(session.user.id);
          const { data } = await supabase
            .from('user_profiles') 
            .select('full_name, subscription_status')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (data) {
            setProfileData({
              full_name: data.full_name,
              is_premium: data.subscription_status === 'premium'
            });
          }
          await syncData(session.user.id);
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

  const handleExportClick = () => {
    if (allMiniatures.length === 0) {
      alert("A tua coleção ainda não tem carrinhos para exportar! 🚗");
      return;
    }
    const headers = ['Nome do Modelo', 'Série', 'Código Toy#', 'Raridade', 'Para Troca?', 'Data de Registo'];
    const rows = allMiniatures.map(car => [
      `"${car.name?.replace(/"/g, '""') || ''}"`,
      `"${car.series?.replace(/"/g, '""') || ''}"`,
      `"${car.toy_code || ''}"`,
      `"${car.rarity_type || 'Common'}"`,
      car.is_for_trade ? 'SIM' : 'NAO',
      new Date(car.created_at).toLocaleDateString('pt-PT')
    ]);
    const csvContent = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Minha_Colecao_WheelTrack_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToWishlist = async (carName: string, series: string, toyCode: string) => {
    if (!targetUserId) return;
    await supabase.from('wishlist').insert([{ user_id: targetUserId, car_name: carName, series, toy_code: toyCode }]);
    const { data: wish } = await supabase.from('wishlist').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
    setWishlist(wish || []);
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    await supabase.from('wishlist').delete().eq('id', wishlistId);
    const { data: wish } = await supabase.from('wishlist').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
    setWishlist(wish || []);
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

  const subStatus = profileData?.is_premium ? 'premium' : 'free';

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-950 via-slate-950 to-black text-white font-sans pb-16">
      
      {/* PAINEL DE CONTROLO INTEGRADO */}
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-4">
        
        {/* FILA DO TITULO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-sky-900/10 border border-sky-800/30 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[11px] font-black tracking-widest text-sky-400 uppercase block">
              WHEELTRACK MAVICUT {profileData?.is_premium ? 'PREMIUM' : 'FREE'}
            </span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white border-b-2 border-yellow-400 inline-block pb-1">
              {username ? `Garagem de ${profileData?.full_name || username}` : `A Minha Garagem`}
            </h1>
            {profileData?.bio && <p className="text-xs text-sky-200/60 pt-1 max-w-md">{profileData.bio}</p>}
            {profileData?.location && <span className="text-[10px] text-sky-400 block">📍 {profileData.location}</span>}
          </div>

          {/* BOTÕES LATERAIS DE ACÇÃO */}
          <div className="flex flex-col gap-2 w-full md:w-auto items-stretch md:items-end shrink-0">
            {!username ? (
              <div className="flex gap-2 justify-end w-full">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-sky-950 border border-sky-800 hover:border-sky-500 text-[11px] font-black rounded-lg transition text-sky-200 uppercase tracking-wider grow md:grow-0"
                >
                  ⚙️ Perfil
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 text-red-400 text-[11px] font-black rounded-lg transition uppercase tracking-wider grow md:grow-0"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black rounded-xl transition shadow-md uppercase tracking-wider w-full"
              >
                Voltar à Minha Garagem
              </button>
            )}

            {!username && (
              <div className="flex gap-2 justify-end w-full">
                <button 
                  onClick={handleExportClick} 
                  className="px-4 py-2 bg-sky-950 hover:bg-sky-800 border border-sky-800 text-sky-200 text-[11px] font-black rounded-lg uppercase tracking-wider transition grow md:grow-0"
                >
                  📥 Exportar Lista
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-creation'))} 
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 text-[11px] font-black rounded-lg uppercase tracking-wider transition shadow-md grow md:grow-0"
                >
                  + Novo Módulo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SELEÇÃO DE MENUS COM A NOVA ABA DO FEED SOCIAL INTEGRADA */}
        {!username && (
          <div className="flex flex-wrap bg-sky-950/40 p-1 rounded-xl border border-sky-900/40 text-xs w-full shadow-2xl backdrop-blur-sm gap-1">
            <button
              onClick={() => { setSelectedDisplay(null); setActiveTab('modules'); }}
              className={`px-4 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all grow md:grow-0 ${activeTab === 'modules' && !selectedDisplay ? 'bg-yellow-500 text-gray-950 font-black' : 'text-sky-300 hover:text-white'}`}
            >
              🏁 Os Meus Módulos
            </button>
            <button
              onClick={() => { setSelectedDisplay(null); setActiveTab('market'); }}
              className={`px-4 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all grow md:grow-0 ${activeTab === 'market' ? 'bg-yellow-500 text-gray-950 font-black' : 'text-sky-300 hover:text-white'}`}
            >
              🌍 Mercado & Radar 🛞
            </button>
            <button
              onClick={() => { setSelectedDisplay(null); setActiveTab('wishlist'); }}
              className={`px-4 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all grow md:grow-0 ${activeTab === 'wishlist' ? 'bg-yellow-500 text-gray-950 font-black' : 'text-sky-300 hover:text-white'}`}
            >
              ⭐ Wishlist
            </button>
            <button
              onClick={() => { setSelectedDisplay(null); setActiveTab('matches'); }}
              className={`px-4 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all grow md:grow-0 ${activeTab === 'matches' ? 'bg-yellow-500 text-gray-950 font-black' : 'text-sky-300 hover:text-white'}`}
            >
              🔄 Central Matches
            </button>
            {/* NOVO BOTÃO DO FEED ESTILO FACEBOOK */}
            <button
              onClick={() => { setSelectedDisplay(null); setActiveTab('feed'); }}
              className={`px-4 py-2.5 rounded-lg font-black uppercase tracking-wider transition-all grow md:grow-0 ${activeTab === 'feed' ? 'bg-yellow-500 text-gray-950 font-black' : 'text-sky-300 hover:text-white'}`}
            >
              👥 Feed da Rede
            </button>
          </div>
        )}
      </div>

      {/* ALTERNADOR DE CONTEÚDO */}
      {selectedDisplay && targetUserId ? (
        <VirtualDisplay targetUserId={targetUserId} isViewingPublic={!!username} />
      ) : (
        <Dashboard 
          allMiniatures={allMiniatures}
          displaysList={displaysList}
          globalMarket={globalMarket}
          subscriptionStatus={subStatus}
          onSelectDisplay={(display) => setSelectedDisplay(display)}
          onDeleteDisplay={async (id) => {
            await supabase.from('displays').delete().eq('id', id);
            const { data: disps } = await supabase.from('displays').select('*').eq('user_id', targetUserId);
            setDisplaysList(disps || []);
          }}
          wishlist={wishlist}
          onAddToWishlist={handleAddToWishlist}
          onRemoveFromWishlist={handleRemoveFromWishlist}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Identificador fixo */}
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
        onSaveComplete={() => { setIsSettingsOpen(false); window.location.reload(); }} 
      />
    </div>
  );
}

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
        setMessage('Registo feito com sucesso! Faz login com a tua nova conta.');
        setIsRegistering(false);
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
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 font-black p-3.5 rounded-lg shadow-xl transition uppercase tracking-widest text-xs"
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