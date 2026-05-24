import React, { useState } from 'react';

const ICON_TH = 'https://collecthw.com/images/th.png';
const ICON_STH = 'https://collecthw.com/images/sth.png';

interface DashboardProps {
  allMiniatures: any[];
  displaysList: any[];
  globalMarket: any[]; // Nova propriedade para os carros da rede
  subscriptionStatus: 'free' | 'premium';
  onSelectDisplay: (display: any) => void;
  onDeleteDisplay: (e: React.MouseEvent, displayId: string, displayName: string) => void;
  onCreateNewClick: () => void;
  onLogout: () => void;
}

export default function Dashboard({
  allMiniatures, displaysList, globalMarket, subscriptionStatus, onSelectDisplay, onDeleteDisplay, onCreateNewClick, onLogout
}: DashboardProps) {
  // Agora temos 3 abas
  const [activeTab, setActiveTab] = useState<'expositores' | 'mercado' | 'trocas'>('expositores');
  // Estado para controlar se a paywall está visível a partir do mercado
  const [showPaywall, setShowPaywall] = useState(false);

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

  const handleProporTroca = () => {
    if (subscriptionStatus === 'free') {
      setShowPaywall(true);
    } else {
      alert("A abrir chat com o colecionador...");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      
      {/* CABEÇALHO DINÂMICO */}
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
          {/* Estatísticas e lista de expositores mantêm-se iguais */}
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

          {globalMarket.length === 0 ? (
            <div className="bg-gray-950 p-8 rounded-xl border border-gray-850 text-center text-gray-500 text-sm">
              Nenhuma miniatura disponível no mercado neste momento.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {globalMarket.map((car, idx) => (
                <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col hover:border-gray-600 transition shadow">
                  <div className="h-32 bg-gray-950 flex items-center justify-center overflow-hidden relative">
                    {car.photo_url ? (
                      <img src={car.photo_url} alt={car.name} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" />
                    ) : (
                      <span className="text-3xl">🚗</span>
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] text-white font-bold border border-white/10 uppercase">
                      {car.rarity_type}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h4 className="text-sm font-bold text-white truncate" title={car.name}>{car.name}</h4>
                    <span className="text-[10px] text-gray-400 mt-1">Série: {car.series || 'N/A'}</span>
                    <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">👤 Colecionador Anónimo</span>
                    
                    <button 
                      onClick={handleProporTroca}
                      className="mt-auto pt-3 w-full border-t border-gray-800 text-xs font-bold text-blue-400 hover:text-blue-300 transition uppercase tracking-wide flex items-center justify-center gap-2"
                    >
                      💬 Propor Troca
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAYWALL / OVERLAY (Aparece tanto na aba Matches como se clicar "Propor Troca" no Mercado) */}
      {(activeTab === 'trocas' || showPaywall) && subscriptionStatus === 'free' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <button onClick={() => { setActiveTab('expositores'); setShowPaywall(false); }} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(234,179,8,0.15)] mb-4">🔒</div>
            <h3 className="text-2xl font-black text-white tracking-tight">Recurso Premium</h3>
            <p className="text-sm text-gray-400 mt-3 mb-6 leading-relaxed">
              Para veres quem tem o que procuras, iniciares conversas e propões trocas no Mercado Global, desbloqueia o WheelTrack PRO.
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