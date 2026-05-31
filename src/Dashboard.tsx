import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SocialFeed from './SocialFeed';

const ICON_TH = 'https://collecthw.com/images/th.png';
const ICON_STH = 'https://collecthw.com/images/sth.png';

interface DashboardProps {
  allMiniatures: any[];
  displaysList: any[];
  globalMarket: any[];
  subscriptionStatus: 'free' | 'premium';
  onSelectDisplay: (display: any) => void;
  onDeleteDisplay: (e: React.MouseEvent, displayId: string, displayName: string) => void;
  wishlist: any[];
  onAddToWishlist: (carName: string, series: string, toyCode: string) => Promise<void>;
  onRemoveFromWishlist: (wishlistId: string) => Promise<void>;
  activeTab: 'modules' | 'market' | 'wishlist' | 'matches' | 'feed';
  setActiveTab: (tab: any) => void;
}

export default function Dashboard({
  allMiniatures, displaysList, globalMarket, subscriptionStatus, onSelectDisplay, onDeleteDisplay,
  wishlist, onAddToWishlist, onRemoveFromWishlist, activeTab, setActiveTab
}: DashboardProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Estados do Chat e Identidades
  const [selectedCarForPropose, setSelectedCarForPropose] = useState<any>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [myChats, setMyChats] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  // Estado para armazenar em cache os contadores dinâmicos de reações por miniatura
  const [reactionsMap, setReactionsMap] = useState<Record<string, { count: number; userReacted: boolean }>>({});

  // Estados do Formulário da Wishlist
  const [newCarName, setNewCarName] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [newToyCode, setNewToyCode] = useState('');

  // =================================================================
  // SINCRO: Identidade do Utilizador e Listener do Feed Social
  // =================================================================
  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || '');
      }
    }
    getUserData();

    const handleFeedPropose = (e: Event) => {
      const car = (e as CustomEvent).detail;
      if (car) handleProporTrocaClick(car);
    };

    window.addEventListener('propor-troca-feed', handleFeedPropose);
    return () => {
      window.removeEventListener('propor-troca-feed', handleFeedPropose);
    };
  }, [userProfiles]);

  // Busca nomes reais para os utilizadores da rede
  useEffect(() => {
    async function fetchIdentities() {
      const uniqueIds = new Set<string>();
      globalMarket.forEach(car => { if (car.user_id) uniqueIds.add(car.user_id); });
      myChats.forEach(chat => { if (chat.userId) uniqueIds.add(chat.userId); });
      
      if (uniqueIds.size === 0) return;

      const { data } = await supabase.from('user_profiles').select('id, full_name').in('id', Array.from(uniqueIds));
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => map[p.id] = p.full_name || 'Colecionador');
        setUserProfiles(map);
      }
    }
    fetchIdentities();
  }, [globalMarket, myChats]);

  // Carrega contadores e estados de reações das rodas em tempo real do Supabase
  const fetchMarketReactions = async () => {
    if (globalMarket.length === 0) return;
    const carIds = globalMarket.map(c => c.id);
    const { data, error } = await supabase
      .from('miniature_reactions')
      .select('miniature_id, user_id')
      .in('miniature_id', carIds);

    if (data && !error) {
      const map: Record<string, { count: number; userReacted: boolean }> = {};
      carIds.forEach(id => {
        const itemReactions = data.filter(r => r.miniature_id === id);
        map[id] = {
          count: itemReactions.length,
          userReacted: itemReactions.some(r => r.user_id === currentUserId)
        };
      });
      setReactionsMap(map);
    }
  };

  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketReactions();
    }
  }, [globalMarket, activeTab, currentUserId]);

  // Carregar conversas na Central de Matches
  useEffect(() => {
    if (activeTab === 'matches' && currentUserId) fetchMyChats();
  }, [activeTab, currentUserId]);

  // Canal de tempo real para o Chat
  useEffect(() => {
    if (activeChatUser && currentUserId) {
      fetchChatMessages(activeChatUser);
      const channel = supabase
        .channel('chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchChatMessages(activeChatUser))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeChatUser, currentUserId]);

  const handleToggleWheelReaction = async (miniatureId: string, alreadyLiked: boolean) => {
    if (!currentUserId) return;
    try {
      if (alreadyLiked) {
        await supabase
          .from('miniature_reactions')
          .delete()
          .eq('miniature_id', miniatureId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('miniature_reactions')
          .insert([{ miniature_id: miniatureId, user_id: currentUserId }]);
      }
      fetchMarketReactions();
    } catch (err) {
      console.error("Erro ao alternar reação de roda:", err);
    }
  };

  const handleCheckout = async () => {
    try {
      const SUPABASE_PROJECT_URL = window.location.hostname === 'localhost' 
        ? 'http://127.0.0.1:54321' 
        : 'https://xmopkisvoxpnrorlexfz.supabase.co';
      
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/smooth-function`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(supabase as any).supabaseAnonKey || (supabase as any).auth?.supabaseAnonKey || ''}`
        },
        body: JSON.stringify({ userId: currentUserId, email: currentUserEmail })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; 
      } else {
        alert("Erro ao gerar pagamento: " + (data.error || "Tenta novamente."));
      }
    } catch (err) {
      console.error("Erro no Stripe Checkout:", err);
    }
  };

  const fetchMyChats = async () => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (data) {
      const contactsMap: { [key: string]: any } = {};
      data.forEach(msg => {
        const otherId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        if (!contactsMap[otherId]) {
          contactsMap[otherId] = { userId: otherId, lastMessage: msg.content, date: msg.created_at };
        }
      });
      setMyChats(Object.values(contactsMap));
    }
  };

  const fetchChatMessages = async (otherUserId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });
    if (data) setChatMessages(data);
  };

  const handleProporTrocaClick = (car: any) => {
    if (car.user_id === currentUserId) {
      alert("Este carrinho é teu! 😊");
      return;
    }
    if (subscriptionStatus === 'free') {
      setShowPaywall(true);
    } else {
      setSelectedCarForPropose(car);
      setInitialMessage(`Olá ${userProfiles[car.user_id] || ''}! Vi o teu ${car.name} no Mercado Global e tenho interesse em negociar uma troca.`);
    }
  };

  const handleSendInitialMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialMessage.trim() || !selectedCarForPropose || !currentUserId) return;

    const { error } = await supabase.from('messages').insert([{
      sender_id: currentUserId,
      receiver_id: selectedCarForPropose.user_id,
      miniature_id: selectedCarForPropose.id,
      content: initialMessage.trim()
    }]);

    if (!error) {
      alert("Proposta de troca enviada!");
      setSelectedCarForPropose(null);
      setInitialMessage('');
      setActiveTab('matches');
    } else {
      alert("Erro ao enviar: " + error.message);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChatUser || !currentUserId) return;

    const { error } = await supabase.from('messages').insert([{
      sender_id: currentUserId,
      receiver_id: activeChatUser,
      content: replyText.trim()
    }]);

    if (!error) {
      setReplyText('');
      fetchChatMessages(activeChatUser);
    }
  };

  const handleWishlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarName.trim()) return;
    await onAddToWishlist(newCarName, newSeries, newToyCode);
    setNewCarName('');
    setNewSeries('');
    setNewToyCode('');
  };

  const calculateMatches = () => {
    const matchesList: any[] = [];
    wishlist.forEach(wish => {
      globalMarket.forEach(marketCar => {
        const isNotMine = marketCar.user_id !== currentUserId;
        let isMatch = false;
        if (wish.toy_code && marketCar.toy_code) {
          isMatch = wish.toy_code.toLowerCase().trim() === marketCar.toy_code.toLowerCase().trim();
        } else {
          isMatch = marketCar.name.toLowerCase().includes(wish.car_name.toLowerCase()) || 
                    wish.car_name.toLowerCase().includes(marketCar.name.toLowerCase());
        }

        if (isNotMine && isMatch) {
          matchesList.push({ id: wish.id, wishName: wish.car_name, car: marketCar });
        }
      });
    });
    return matchesList;
  };

  const activeMatches = calculateMatches();

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

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      
      {/* ABA: EXPOSITORES */}
      {activeTab === 'modules' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl text-center shadow">
              <span className="text-xs text-sky-300 block mb-1">Total Modelos</span>
              <span className="text-2xl font-black">{allMiniatures.length}</span>
            </div>
            <div className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl text-center border-l-4 border-l-amber-500 flex flex-col items-center justify-center shadow">
              <img src={ICON_STH} alt="STH" className="w-5 h-5 object-contain mb-1" />
              <span className="text-xl font-black text-amber-400">{allMiniatures.filter(m => m.rarity_type === 'Super Treasure Hunt').length}</span>
            </div>
            <div className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl text-center border-l-4 border-l-slate-400 flex flex-col items-center justify-center shadow">
              <img src={ICON_TH} alt="TH" className="w-5 h-5 object-contain mb-1" />
              <span className="text-xl font-black text-slate-300">{allMiniatures.filter(m => m.rarity_type === 'Treasure Hunt').length}</span>
            </div>
            <div className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl text-center border-l-4 border-l-blue-500 shadow">
              <span className="text-xs text-sky-300 block mb-1">Para Troca</span>
              <span className="text-2xl font-black text-blue-400">{allMiniatures.filter(m => m.is_for_trade).length}</span>
            </div>
          </div>
          
          <div className="space-y-6 pt-2">
            {Object.keys(groupedDisplaysByRoom).map((roomName) => {
              const isBox = roomName.toUpperCase() === 'CAIXA';
              return (
                <div key={roomName} className={`space-y-3 p-4 rounded-2xl border ${isBox ? 'bg-amber-950/10 border-amber-900/30' : 'bg-sky-900/20 border-sky-900/30'}`}>
                  <h3 className={`text-xs font-black tracking-wider uppercase border-b pb-1 ${isBox ? 'text-amber-500 border-amber-900/50' : 'text-sky-300 border-sky-900/40'}`}>
                    {isBox ? '📦 Caixas de Arrumação / Stock' : `📍 ${roomName}`}
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {groupedDisplaysByRoom[roomName].map((disp: any) => (
                      <div 
                        key={disp.id} 
                        onClick={() => onSelectDisplay(disp)} 
                        className={`p-5 rounded-xl cursor-pointer transition relative group shadow backdrop-blur-sm ${
                          isBox 
                            ? 'bg-amber-950/20 border-dashed border-2 border-amber-800/50 hover:border-amber-500' 
                            : 'bg-sky-950/40 border border-sky-900/40 hover:border-yellow-500'
                        }`}
                      >
                        <button onClick={(e) => { e.stopPropagation(); onDeleteDisplay(e, disp.id, disp.name); }} className="absolute top-3 right-3 text-sky-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">🗑️</button>
                        <h4 className="text-base font-bold text-gray-200">{isBox ? '📦 ' : '🔲 '}{cleanDisplayName(disp.name)}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono mt-2 inline-block ${isBox ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-950 text-sky-400'}`}>
                          {isBox ? 'Capacidade Livre' : `${disp.rows_count}×${disp.columns_count} Vagas`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ABA: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="pt-2 animate-fade-in grid md:grid-cols-3 gap-6">
          <div className="bg-sky-950/40 border border-sky-900/40 p-5 rounded-2xl h-fit space-y-4 text-left backdrop-blur-sm">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-sky-900/40 pb-2">Adicionar à Lista</h3>
            <form onSubmit={handleWishlistSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-sky-300 uppercase mb-1">Modelo / Nome do Carro *</label>
                <input type="text" value={newCarName} onChange={(e) => setNewCarName(e.target.value)} placeholder="Ex: Nissan Skyline GT-R" className="w-full bg-sky-950 border border-sky-800 rounded-xl p-2.5 text-sm text-white placeholder-sky-700 focus:border-yellow-400 outline-none transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-sky-300 uppercase mb-1">Série (Opcional)</label>
                <input type="text" value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="Ex: Then and Now" className="w-full bg-sky-950 border border-sky-800 rounded-xl p-2.5 text-sm text-white placeholder-sky-700 focus:border-yellow-400 outline-none transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-sky-300 uppercase mb-1">Código Toy# / Fabrico (Opcional)</label>
                <input type="text" value={newToyCode} onChange={(e) => setNewToyCode(e.target.value)} placeholder="Ex: HKG27" className="w-full bg-sky-950 border border-sky-800 rounded-xl p-2.5 text-sm text-white placeholder-sky-700 focus:border-yellow-400 outline-none transition" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase tracking-wider hover:bg-yellow-400 transition shadow">Lançar Desejo</button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4 text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-sky-900/40 pb-2">Modelos Caçados ({wishlist.length})</h3>
            {wishlist.length === 0 ? (
              <div className="bg-sky-950/20 border border-sky-900/40 rounded-2xl p-8 text-center text-sky-400/60 text-sm">A tua lista de caça está vazia. Adiciona carros ao lado!</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {wishlist.map((item) => (
                  <div key={item.id} className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl flex justify-between items-center group hover:border-sky-500 shadow transition backdrop-blur-sm">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.car_name}</h4>
                      <div className="flex gap-2 mt-1">
                        {item.series && <span className="text-[9px] bg-gray-950 px-2 py-0.5 rounded text-sky-400">🎬 {item.series}</span>}
                        {item.toy_code && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded text-yellow-500 font-mono"># {item.toy_code}</span>}
                      </div>
                    </div>
                    <button onClick={() => onRemoveFromWishlist(item.id)} className="text-sky-600 hover:text-red-500 text-xs transition p-2">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: MERCADO GLOBAL & FEED SOCIAL - AZUL CERÚLEO E TONS CLAROS */}
      {activeTab === 'market' && (
        <div className="pt-2 animate-fade-in space-y-8">
          
          {/* TOPO DO RADAR SOCIAL */}
          <div className="bg-gradient-to-r from-sky-900/40 via-sky-800/20 to-transparent p-6 rounded-2xl border border-sky-400/20 shadow-xl backdrop-blur-md flex justify-between items-end">
            <div className="text-left">
              <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase block">RADAR SOCIAL WHEELTRACK</span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight italic mt-1">
                Atividade da Comunidade & Classificados
              </h3>
              <p className="text-xs text-sky-200/70 font-normal mt-1 max-w-xl">
                Acompanha os modelos que os colecionadores adicionam às suas garagens e propõe trocas nos classificados ativos.
              </p>
            </div>
            <div className="bg-sky-400/10 border border-sky-400/30 px-4 py-2 rounded-xl text-center shrink-0">
              <span className="text-[10px] text-sky-300 block uppercase font-bold tracking-wider">Rede Ativa</span>
              <span className="text-lg font-black text-white">{globalMarket.length} Modelos</span>
            </div>
          </div>

          {/* GRELHA DO FEED */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {globalMarket.map((car) => {
              const reactionInfo = reactionsMap[car.id] || { count: 0, userReacted: false };

              return (
                <div key={car.id} className="bg-gradient-to-b from-sky-900/30 via-slate-900/60 to-slate-950/90 border border-sky-500/20 rounded-2xl overflow-hidden flex flex-col hover:border-sky-400/60 transition-all duration-300 shadow-2xl group relative backdrop-blur-sm">
                  
                  {/* FOTO E CORES CLARAS */}
                  <div className="h-40 bg-slate-950/80 flex items-center justify-center overflow-hidden relative border-b border-sky-500/10">
                    {car.photo_url ? (
                      <img src={car.photo_url} alt={car.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100" />
                    ) : (
                      <span className="text-4xl filter drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">🚗</span>
                    )}
                    
                    <div className="absolute top-3 right-3 bg-sky-400/20 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] text-sky-200 font-black border border-sky-400/30 uppercase tracking-wider">
                      {car.rarity_type || 'Regular'}
                    </div>

                    <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-sky-300 font-medium">
                      ✨ Adicionado à coleção
                    </div>
                  </div>

                  {/* ELEMENTOS DE TEXTO */}
                  <div className="p-4 flex flex-col flex-1 text-left space-y-2">
                    <div>
                      <h4 className="text-base font-black text-white truncate uppercase tracking-tight group-hover:text-sky-300 transition">
                        {car.name}
                      </h4>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] text-sky-200/60">🎬 {car.series || 'Série Geral'}</span>
                        {car.toy_code && <span className="text-[9px] font-mono text-sky-400 bg-sky-400/5 px-1.5 py-0.2 rounded border border-sky-400/10">#{car.toy_code}</span>}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-sky-500/10 flex justify-between items-center">
                      <span className="text-xs text-sky-200 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        👤 {userProfiles[car.user_id] || 'Colecionador'}
                      </span>
                    </div>

                    {/* FILA DE ACÇÕES: SISTEMA REAL DE RODAS DE SUPABASE */}
                    <div className="pt-3 border-t border-sky-500/10 mt-auto flex justify-between items-center gap-2">
                      
                      {/* INTERAÇÃO DO FLAME (LIKE ESTILO FLAME) */}
                      <button 
                        onClick={() => handleToggleWheelReaction(car.id, reactionInfo.userReacted)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          reactionInfo.userReacted 
                            ? 'bg-orange-500/10 border border-orange-500/30 text-orange-500 font-black' 
                            : 'bg-sky-400/5 border border-sky-500/10 text-sky-300 hover:border-sky-400/40 hover:text-white'
                        }`}
                        title="Dar um Flame"
                      >
                        <span className={`text-sm transition-transform duration-300 ${reactionInfo.userReacted ? 'scale-125' : 'group-hover:scale-110'}`}>
                          🔥
                        </span>
                        <span className="font-mono text-[11px]">{reactionInfo.count}</span>
                      </button>

                      <button 
                        onClick={() => handleProporTrocaClick(car)} 
                        className="flex-1 py-1.5 bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400 hover:text-gray-950 text-xs font-black rounded-xl uppercase tracking-wider transition shadow flex items-center justify-center gap-1.5 text-sky-200"
                      >
                        💬 Propor Troca
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA: CENTRAL DE MATCHES / CHAT */}
      {activeTab === 'matches' && (
        <div className="pt-2 animate-fade-in space-y-4">
          <div className="bg-sky-950/20 border border-sky-900/40 p-5 rounded-2xl text-left space-y-3 backdrop-blur-sm">
            <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">📡 Radar de Cruzamentos Automáticos</h3>
            {subscriptionStatus === 'free' ? (
              <div className="bg-gradient-to-br from-gray-950 to-sky-950/50 border border-yellow-500/20 p-6 rounded-xl text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-500 text-gray-950 text-[9px] font-black px-3 py-1 uppercase tracking-wider rounded-bl-lg">
                  {activeMatches.length} Cruzamentos Detetados!
                </div>
                <p className="text-xs text-sky-200/80 max-w-md mx-auto leading-relaxed">
                  O radar detetou <span className="text-yellow-400 font-bold">{activeMatches.length} correspondências</span> entre a tua Wishlist e o Mercado Global! Desbloqueia o acesso para abrir as conversas e fechar os teus negócios.
                </p>
                <div className="pt-2">
                  <button onClick={handleCheckout} className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider shadow-lg transition">
                    Ativar Conta PRO por 2,99€ / Mês
                  </button>
                </div>
              </div>
            ) : activeMatches.length === 0 ? (
              <p className="text-xs text-sky-400/60 font-medium">Nenhum colecionador tem atualmente os carros da tua Wishlist marcados para troca.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeMatches.map((match, i) => (
                  <div key={i} className="bg-sky-950/40 border-2 border-yellow-500/30 p-4 rounded-xl flex justify-between items-center shadow-lg backdrop-blur-sm">
                    <div>
                      <span className="text-[9px] bg-yellow-500 text-gray-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Match Ideal</span>
                      <h4 className="text-sm font-bold text-white mt-1.5 uppercase tracking-tight">Tu queres: {match.wishName}</h4>
                      <p className="text-xs text-sky-300 font-medium">Disponível com: <span className="text-yellow-400 font-bold">{userProfiles[match.car.user_id] || 'Colecionador'}</span></p>
                    </div>
                    <button onClick={() => handleProporTrocaClick(match.car)} className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2 rounded-lg uppercase tracking-wider transition">Negociar</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-sky-950/40 border border-sky-900/40 rounded-2xl overflow-hidden h-[450px] flex shadow-xl backdrop-blur-sm">
            <div className="w-1/3 border-r border-sky-900/30 bg-gray-950/60 flex flex-col">
              <div className="p-4 border-b border-sky-900/30 text-left"><h3 className="text-xs font-black text-white uppercase tracking-wider">Conversas</h3></div>
              <div className="flex-1 overflow-y-auto divide-y divide-sky-950">
                {myChats.length === 0 ? (
                  <div className="p-4 text-xs text-sky-400/50 text-center mt-10 font-bold uppercase tracking-wider">Nenhuma conversa activa.</div>
                ) : (
                  myChats.map((chat) => (
                    <div key={chat.userId} onClick={() => setActiveChatUser(chat.userId)} className={`p-4 cursor-pointer transition text-left ${activeChatUser === chat.userId ? 'bg-sky-900/20' : 'hover:bg-sky-900/10'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-yellow-400 truncate">{userProfiles[chat.userId] || 'Colecionador'}</span>
                        <span className="text-[9px] text-sky-400 font-medium">{new Date(chat.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-sky-300/80 truncate mt-1">{chat.lastMessage}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-sky-950/10">
              {activeChatUser ? (
                <>
                  <div className="p-4 border-b border-sky-900/30 bg-gray-950/40 text-left">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Conversa com <span className="text-yellow-400">{userProfiles[activeChatUser] || 'Colecionador'}</span></span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} className={`max-w-[70%] p-3 rounded-2xl text-sm text-left ${isMe ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-sky-900/50 border border-sky-800 text-gray-200 self-start rounded-bl-none'}`}>
                          <p>{msg.content}</p>
                          <span className="text-[8px] opacity-60 block text-right mt-1 font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleSendReply} className="p-3 bg-gray-950/60 border-t border-sky-900/30 flex gap-2">
                    <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Escreve uma resposta..." className="flex-1 bg-sky-950 border border-sky-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition" />
                    <button type="submit" className="bg-blue-600 text-white px-5 font-black text-xs rounded-xl uppercase tracking-wider">Enviar</button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-sky-400/50 space-y-2 uppercase tracking-wider font-bold">
                  <span className="text-3xl">💬</span>
                  <p className="text-xs">Seleciona um contacto para conversar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA: FEED SOCIAL */}
      {activeTab === 'feed' && (
        <SocialFeed />
      )}

      {/* MODAL MENSAGEM INICIAL */}
      {selectedCarForPropose && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sky-900 border border-sky-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-sky-800 pb-2">Proposta de Troca</h3>
            <form onSubmit={handleSendInitialMessage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-sky-300 uppercase mb-1">Mensagem Inicial</label>
                <textarea value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} className="w-full h-24 bg-gray-950 border border-sky-800 rounded-xl p-3 text-xs text-white focus:outline-none resize-none" required></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedCarForPropose(null)} className="px-3 py-1.5 text-xs font-bold text-sky-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase">Enviar Proposta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYWALL ATIVA */}
      {showPaywall && subscriptionStatus === 'free' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-sky-950 border border-sky-800 p-8 rounded-3xl text-center shadow-2xl">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-sky-400 hover:text-white">✕</button>
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Recurso PRO</h3>
            <p className="text-sm text-sky-200/70 mt-3 mb-6 leading-relaxed">Para iniciares conversas, veres o cruzamento de dados e veres quem tem o carro que procuras, desbloqueia o WheelTrack Premium.</p>
            <button onClick={handleCheckout} className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-950 font-black text-sm rounded-xl uppercase tracking-wider shadow-lg transition">
              Desbloquear por 2,99€ / Mês
            </button>
          </div>
        </div>
      )}
    </div>
  );
}