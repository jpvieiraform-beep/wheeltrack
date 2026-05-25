import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ICON_TH = 'https://collecthw.com/images/th.png';
const ICON_STH = 'https://collecthw.com/images/sth.png';

interface DashboardProps {
  allMiniatures: any[];
  displaysList: any[];
  globalMarket: any[];
  subscriptionStatus: 'free' | 'premium';
  onSelectDisplay: (display: any) => void;
  onDeleteDisplay: (e: React.MouseEvent, displayId: string, displayName: string) => void;
  onCreateNewClick: () => void;
  onLogout: () => void;
  wishlist: any[];
  onAddToWishlist: (carName: string, series: string, toyCode: string) => Promise<void>;
  onRemoveFromWishlist: (wishlistId: string) => Promise<void>;
}

export default function Dashboard({
  allMiniatures, displaysList, globalMarket, subscriptionStatus, onSelectDisplay, onDeleteDisplay, onCreateNewClick, onLogout,
  wishlist, onAddToWishlist, onRemoveFromWishlist
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'expositores' | 'wishlist' | 'mercado' | 'trocas'>('expositores');
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

  // Estados do Formulário da Wishlist
  const [newCarName, setNewCarName] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [newToyCode, setNewToyCode] = useState('');

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || '');
      }
    }
    getUserData();
  }, []);

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

  // Carregar conversas na Central de Matches
  useEffect(() => {
    if (activeTab === 'trocas' && currentUserId) fetchMyChats();
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

  // Redirecionamento dinâmico para a tua Edge Function com o endpoint "smooth-function"
  const handleCheckout = async () => {
    try {
      const SUPABASE_PROJECT_URL = window.location.hostname === 'localhost' 
        ? 'http://127.0.0.1:54321' 
        : 'https://xmopkisvoxpnrorlexfz.supabase.co';
      
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/smooth-function`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({ 
          userId: currentUserId, 
          email: currentUserEmail 
        })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; 
      } else {
        alert("Erro ao gerar pagamento: " + (data.error || "Tenta novamente."));
      }
    } catch (err) {
      console.error("Erro no Stripe Checkout:", err);
      alert("Erro de ligação ao servidor de pagamentos.");
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
      setActiveTab('trocas');
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            WHEELTRACK MAVICUT{' '}
            {subscriptionStatus === 'premium' ? (
              <span className="text-yellow-500">PREMIUM</span>
            ) : (
              <span className="text-gray-400">FREE</span>
            )}
          </h1>
          
          <div className="flex flex-wrap bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs w-fit shadow-inner gap-1">
            <button onClick={() => setActiveTab('expositores')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 ${activeTab === 'expositores' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🔲 Meus Expositores
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 ${activeTab === 'wishlist' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              ⭐ Wishlist
            </button>
            <button onClick={() => setActiveTab('mercado')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 ${activeTab === 'mercado' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🌐 Mercado Global
            </button>
            <button onClick={() => setActiveTab('trocas')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 flex items-center gap-2 ${activeTab === 'trocas' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🔄 Central Matches
              {activeMatches.length > 0 && (
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black animate-pulse">
                  {activeMatches.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button onClick={onCreateNewClick} className="px-4 py-2.5 bg-yellow-500 text-gray-950 text-xs font-black rounded-lg uppercase tracking-wider shadow hover:bg-yellow-600 transition">
            + Novo Módulo
          </button>
          <button onClick={onLogout} className="px-4 py-2.5 bg-red-950 border border-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition">
            Sair
          </button>
        </div>
      </div>

      {/* ABA: EXPOSITORES */}
      {activeTab === 'expositores' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center shadow">
              <span className="text-xs text-gray-400 block mb-1">Total Modelos</span>
              <span className="text-2xl font-black">{allMiniatures.length}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center border-l-4 border-l-amber-500 flex flex-col items-center justify-center shadow">
              <img src={ICON_STH} alt="STH" className="w-5 h-5 object-contain mb-1" />
              <span className="text-xl font-black text-amber-400">{allMiniatures.filter(m => m.rarity_type === 'Super Treasure Hunt').length}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center border-l-4 border-l-slate-400 flex flex-col items-center justify-center shadow">
              <img src={ICON_TH} alt="TH" className="w-5 h-5 object-contain mb-1" />
              <span className="text-xl font-black text-slate-300">{allMiniatures.filter(m => m.rarity_type === 'Treasure Hunt').length}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center border-l-4 border-l-blue-500 shadow">
              <span className="text-xs text-gray-400 block mb-1">Para Troca</span>
              <span className="text-2xl font-black text-blue-400">{allMiniatures.filter(m => m.is_for_trade).length}</span>
            </div>
          </div>
          <div className="space-y-6 pt-2">
            {Object.keys(groupedDisplaysByRoom).map((roomName) => (
              <div key={roomName} className="space-y-3 bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
                <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase border-b border-gray-800 pb-1">📍 {roomName}</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {groupedDisplaysByRoom[roomName].map((disp: any) => (
                    <div key={disp.id} onClick={() => onSelectDisplay(disp)} className="bg-gray-900 border border-gray-800 p-5 rounded-xl cursor-pointer hover:border-yellow-500 transition relative group shadow">
                      <button onClick={(e) => onDeleteDisplay(e, disp.id, disp.name)} className="absolute top-3 right-3 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">🗑️</button>
                      <h4 className="text-base font-bold text-gray-200">{cleanDisplayName(disp.name)}</h4>
                      <span className="text-[10px] text-gray-400 bg-gray-950 px-2 py-0.5 rounded font-mono mt-2 inline-block">{disp.rows_count}×{disp.columns_count} Vagas</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ABA: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="pt-2 animate-fade-in grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl h-fit space-y-4 text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">Adicionar à Lista</h3>
            <form onSubmit={handleWishlistSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Modelo / Nome do Carro *</label>
                <input type="text" value={newCarName} onChange={(e) => setNewCarName(e.target.value)} placeholder="Ex: Nissan Skyline GT-R" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Série (Opcional)</label>
                <input type="text" value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="Ex: Then and Now" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Código Toy# / Fabrico (Opcional)</label>
                <input type="text" value={newToyCode} onChange={(e) => setNewToyCode(e.target.value)} placeholder="Ex: HKG27" className="w-full bg-gray-950 border border-gray-750 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-500" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase tracking-wider hover:bg-yellow-400 transition shadow">Lançar Desejo</button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4 text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">Modelos Caçados ({wishlist.length})</h3>
            {wishlist.length === 0 ? (
              <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-8 text-center text-gray-500 text-sm">A tua lista de caça está vazia. Adiciona carros ao lado!</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {wishlist.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-700 shadow transition">
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.car_name}</h4>
                      <div className="flex gap-2 mt-1">
                        {item.series && <span className="text-[9px] bg-gray-950 px-2 py-0.5 rounded text-gray-400">🎬 {item.series}</span>}
                        {item.toy_code && <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded text-yellow-500 font-mono"># {item.toy_code}</span>}
                      </div>
                    </div>
                    <button onClick={() => onRemoveFromWishlist(item.id)} className="text-gray-600 hover:text-red-500 text-xs transition p-2">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: MERCADO GLOBAL */}
      {activeTab === 'mercado' && (
        <div className="pt-2 animate-fade-in space-y-4">
          <div className="border-b border-gray-800 pb-3 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-black text-white">Classificados da Comunidade</h3>
              <p className="text-xs text-gray-400 font-light mt-0.5">Miniaturas sinalizadas para troca por outros colecionadores.</p>
            </div>
            <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-bold">{globalMarket.length} disponíveis</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {globalMarket.map((car, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col hover:border-gray-600 transition shadow">
                <div className="h-32 bg-gray-950 flex items-center justify-center overflow-hidden relative">
                  {car.photo_url ? (
                    <img src={car.photo_url} alt={car.name} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <span className="text-3xl">🚗</span>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] text-white font-bold border border-white/10 uppercase">
                    {car.rarity_type}
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1 text-left">
                  <h4 className="text-sm font-bold text-white truncate">{car.name}</h4>
                  <span className="text-[10px] text-gray-400 mt-1">Série: {car.series || 'N/A'}</span>
                  {car.toy_code && <span className="text-[9px] text-yellow-500 font-mono">#{car.toy_code}</span>}
                  <span className="text-[10px] text-yellow-500 font-bold mt-2 flex items-center gap-1">👤 {userProfiles[car.user_id] || 'Colecionador'}</span>
                  
                  <button onClick={() => handleProporTrocaClick(car)} className="mt-auto pt-3 w-full border-t border-gray-800 text-xs font-bold text-blue-400 hover:text-blue-300 transition uppercase tracking-wide flex items-center justify-center gap-2">💬 Propor Troca</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA: CENTRAL DE MATCHES / CHAT */}
      {activeTab === 'trocas' && (
        <div className="pt-2 animate-fade-in space-y-4">
          <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl text-left space-y-3">
            <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider flex items-center gap-2">📡 Radar de Cruzamentos Automáticos</h3>
            
            {/* SE FOR FREE: MOSTRA O CARD DE CONVERSÃO DO STRIPE DIRETAMENTE */}
            {subscriptionStatus === 'free' ? (
              <div className="bg-gradient-to-br from-gray-950 to-gray-900 border border-yellow-500/20 p-6 rounded-xl text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-500 text-gray-950 text-[9px] font-black px-3 py-1 uppercase tracking-wider rounded-bl-lg animate-pulse">
                  {activeMatches.length} Cruzamentos Detetados!
                </div>
                <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                  O radar detetou <span className="text-yellow-500 font-bold">{activeMatches.length} correspondências</span> entre a tua Wishlist e o Mercado Global! Desbloqueia o acesso para abrir as conversas e fechar os teus negócios.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={handleCheckout} 
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider shadow-lg transform hover:scale-[1.01] transition-all"
                  >
                    Ativar Conta PRO por 2,99€ / Mês
                  </button>
                </div>
              </div>
            ) : activeMatches.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum colecionador tem atualmente os carros da tua Wishlist marcados para troca.</p>
            ) : (
              /* SE FOR PREMIUM: EXIBE OS CARDS DOS MATCHES REAIS */
              <div className="grid sm:grid-cols-2 gap-3">
                {activeMatches.map((match, i) => (
                  <div key={i} className="bg-gray-900 border-2 border-yellow-500/30 p-4 rounded-xl flex justify-between items-center shadow-lg">
                    <div>
                      <span className="text-[9px] bg-yellow-500 text-gray-950 font-black px-1.5 py-0.5 rounded uppercase">Match Ideal</span>
                      <h4 className="text-sm font-bold text-white mt-1.5">Tu queres: {match.wishName}</h4>
                      <p className="text-xs text-gray-400">Disponível com: <span className="text-yellow-500 font-bold">{userProfiles[match.car.user_id] || 'Colecionador'}</span></p>
                    </div>
                    <button onClick={() => handleProporTrocaClick(match.car)} className="bg-blue-600 text-white font-bold text-xs px-3 py-2 rounded-lg uppercase">Negociar</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden h-[450px] flex shadow-xl">
            <div className="w-1/3 border-r border-gray-800 bg-gray-950 flex flex-col">
              <div className="p-4 border-b border-gray-800 text-left"><h3 className="text-xs font-black text-white uppercase tracking-wider">Conversas</h3></div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-900">
                {myChats.length === 0 ? (
                  <div className="p-4 text-xs text-gray-500 text-center mt-10">Nenhuma conversa ativa.</div>
                ) : (
                  myChats.map((chat) => (
                    <div key={chat.userId} onClick={() => setActiveChatUser(chat.userId)} className={`p-4 cursor-pointer transition text-left ${activeChatUser === chat.userId ? 'bg-gray-900' : 'hover:bg-gray-900/40'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-yellow-500 truncate">{userProfiles[chat.userId] || 'Colecionador'}</span>
                        <span className="text-[9px] text-gray-500">{new Date(chat.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-1">{chat.lastMessage}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-900">
              {activeChatUser ? (
                <>
                  <div className="p-4 border-b border-gray-800 bg-gray-950 text-left">
                    <span className="text-xs font-black text-white uppercase tracking-wide">Conversa com <span className="text-yellow-500">{userProfiles[activeChatUser] || 'Colecionador'}</span></span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} className={`max-w-[70%] p-3 rounded-2xl text-sm text-left ${isMe ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-gray-800 text-gray-200 self-start rounded-bl-none'}`}>
                          <p>{msg.content}</p>
                          <span className="text-[8px] opacity-60 block text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleSendReply} className="p-3 bg-gray-950 border-t border-gray-800 flex gap-2">
                    <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Escreve uma resposta..." className="flex-1 bg-gray-900 border border-gray-750 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" />
                    <button type="submit" className="bg-blue-600 text-white px-5 font-bold text-xs rounded-xl uppercase">Enviar</button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-2">
                  <span className="text-3xl">💬</span>
                  <p className="text-xs font-medium">Seleciona um contacto para conversar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MENSAGEM INICIAL */}
      {selectedCarForPropose && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">Proposta de Troca</h3>
            <form onSubmit={handleSendInitialMessage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mensagem Inicial</label>
                <textarea value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} className="w-full h-24 bg-gray-950 border border-gray-750 rounded-xl p-3 text-xs text-white focus:outline-none resize-none" required></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedCarForPropose(null)} className="px-3 py-1.5 text-xs font-bold text-gray-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 text-gray-950 font-black text-xs rounded-xl uppercase">Enviar Proposta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYWALL ATIVA (Lançada a partir dos cliques no Mercado Global) */}
      {showPaywall && subscriptionStatus === 'free' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-770 p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(234,179,8,0.15)] mb-4">🔒</div>
            <h3 className="text-2xl font-black text-white tracking-tight">Recurso Premium</h3>
            <p className="text-sm text-gray-400 mt-3 mb-6 leading-relaxed">Para iniciares conversas, veres o cruzamento de dados e veres quem tem o carro que procuras, desbloqueia o WheelTrack PRO.</p>
            
            <button onClick={handleCheckout} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black text-sm rounded-xl uppercase tracking-wider shadow-lg transition transform hover:scale-[1.02]">
              Desbloquear por 2,99€ / Mês
            </button>
            
            <div className="mt-4 flex flex-col gap-2 text-[10px] text-gray-500 font-medium">
              <span className="flex items-center justify-center gap-1">✔️ Cancela a qualquer momento</span>
              <span className="flex items-center justify-center gap-1">✔️ Match instantâneo por Código Toy#</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}