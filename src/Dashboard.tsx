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
}

export default function Dashboard({
  allMiniatures, displaysList, globalMarket, subscriptionStatus, onSelectDisplay, onDeleteDisplay, onCreateNewClick, onLogout
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'expositores' | 'mercado' | 'trocas'>('expositores');
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Estados do Chat
  const [selectedCarForPropose, setSelectedCarForPropose] = useState<any>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const [myChats, setMyChats] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    getUserId();
  }, []);

  // Carregar conversas na Central de Matches
  useEffect(() => {
    if (activeTab === 'trocas' && currentUserId) {
      fetchMyChats();
    }
  }, [activeTab, currentUserId]);

  // Carregar mensagens de um chat específico
  useEffect(() => {
    if (activeChatUser && currentUserId) {
      fetchChatMessages(activeChatUser);
      
      // Canal em tempo real para receber novas mensagens instantaneamente
      const channel = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          fetchChatMessages(activeChatUser);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeChatUser, currentUserId]);

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
      setInitialMessage(`Olá! Vi o teu ${car.name} no Mercado Global e tenho interesse em negociar uma troca.`);
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
      alert("Proposta de troca enviada com sucesso para a Central de Matches!");
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
            <button onClick={() => setActiveTab('mercado')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 ${activeTab === 'mercado' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🌐 Mercado Global
            </button>
            <button onClick={() => setActiveTab('trocas')} className={`px-4 py-2 rounded-lg font-extrabold transition-all duration-150 flex items-center gap-2 ${activeTab === 'trocas' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🔄 Central Matches
              {subscriptionStatus === 'free' && (
                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-black animate-pulse shadow-sm">Pro</span>
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
                <div className="p-3 flex flex-col flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{car.name}</h4>
                  <span className="text-[10px] text-gray-400 mt-1">Série: {car.series || 'N/A'}</span>
                  <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">👤 Colecionador</span>
                  
                  <button 
                    onClick={() => handleProporTrocaClick(car)}
                    className="mt-auto pt-3 w-full border-t border-gray-800 text-xs font-bold text-blue-400 hover:text-blue-300 transition uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    💬 Propor Troca
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA: CENTRAL DE MATCHES / CHAT (AGORA ACESSÍVEL A AMBOS) */}
      {activeTab === 'trocas' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden h-[500px] flex shadow-xl animate-fade-in">
          {/* Barra Lateral: Lista de Contactos */}
          <div className="w-1/3 border-r border-gray-800 bg-gray-950 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Conversas Ativas</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-900">
              {myChats.length === 0 ? (
                <div className="p-4 text-xs text-gray-500 text-center mt-10">Nenhuma conversa iniciada. Propõe uma troca no mercado!</div>
              ) : (
                myChats.map((chat) => (
                  <div 
                    key={chat.userId} 
                    onClick={() => setActiveChatUser(chat.userId)}
                    className={`p-4 cursor-pointer transition text-left ${activeChatUser === chat.userId ? 'bg-gray-900' : 'hover:bg-gray-900/40'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-200 truncate">Colecionador</span>
                      <span className="text-[9px] text-gray-500">{new Date(chat.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1">{chat.lastMessage}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Área Principal: Janela de Chat */}
          <div className="flex-1 flex flex-col bg-gray-900">
            {activeChatUser ? (
              <>
                {/* Cabeçalho do Chat */}
                <div className="p-4 border-b border-gray-800 bg-gray-950 text-left">
                  <span className="text-xs font-black text-yellow-500 uppercase tracking-wide">Conversa Direta</span>
                </div>
                
                {/* Balões de Mensagem */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                  {chatMessages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={`max-w-[70%] p-3 rounded-2xl text-sm text-left ${isMe ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-gray-800 text-gray-200 self-start rounded-bl-none'}`}>
                        <p>{msg.content}</p>
                        <span className="text-[8px] opacity-60 block text-right mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Caixa de Input de Resposta */}
                <form onSubmit={handleSendReply} className="p-3 bg-gray-950 border-t border-gray-800 flex gap-2">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreve uma resposta..." 
                    className="flex-1 bg-gray-900 border border-gray-750 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 font-bold text-xs rounded-xl uppercase tracking-wider transition">Enviar</button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-2">
                <span className="text-3xl">💬</span>
                <p className="text-xs font-medium">Seleciona um colecionador na barra lateral para falar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: MANDAR MENSAGEM INICIAL (SÓ PREMIUM CONSEGUE ABRIR) */}
      {selectedCarForPropose && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider border-b border-gray-800 pb-2">Proposta de Troca</h3>
            <div className="bg-gray-950 p-3 rounded-xl border border-gray-850 flex gap-3 items-center">
              <span className="text-2xl">🚗</span>
              <div>
                <h4 className="text-xs font-bold text-white">{selectedCarForPropose.name}</h4>
                <p className="text-[10px] text-gray-500">Série: {selectedCarForPropose.series || 'N/A'}</p>
              </div>
            </div>
            <form onSubmit={handleSendInitialMessage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mensagem Inicial</label>
                <textarea 
                  value={initialMessage} 
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="w-full h-24 bg-gray-950 border border-gray-750 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-500 resize-none"
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedCarForPropose(null)} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-xs rounded-xl uppercase tracking-wider shadow transition">Enviar Proposta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYWALL ATIVA (SÓ ABRE SE SHOWPAYWALL FOR TRUE) */}
      {showPaywall && subscriptionStatus === 'free' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(234,179,8,0.15)] mb-4">🔒</div>
            <h3 className="text-2xl font-black text-white tracking-tight">Recurso Premium</h3>
            <p className="text-sm text-gray-400 mt-3 mb-6 leading-relaxed">
              Para iniciares conversas e propores trocas no Mercado Global, desbloqueia o WheelTrack PRO. Utilizadores Free podem ler e responder a propostas recebidas.
            </p>
            <button 
              onClick={() => alert("A redirecionar para pagamento Stripe...")}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black text-sm rounded-xl uppercase tracking-wider shadow-lg transition transform hover:scale-[1.02]"
            >
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