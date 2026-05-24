import React, { useState } from 'react';

const ICON_TH = 'https://collecthw.com/images/th.png';
const ICON_STH = 'https://collecthw.com/images/sth.png';

interface DashboardProps {
  allMiniatures: any[];
  displaysList: any[];
  subscriptionStatus: 'free' | 'premium';
  onSelectDisplay: (display: any) => void;
  onDeleteDisplay: (e: React.MouseEvent, displayId: string, displayName: string) => void;
  onCreateNewClick: () => void;
  onLogout: () => void;
}

export default function Dashboard({
  allMiniatures, displaysList, subscriptionStatus, onSelectDisplay, onDeleteDisplay, onCreateNewClick, onLogout
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'expositores' | 'trocas'>('expositores');

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
      
      {/* CABEÇALHO DINÂMICO */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-4">
          
          {/* TÍTULO MAVICUT CONDICIONAL */}
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
            WHEELTRACK MAVICUT{' '}
            {subscriptionStatus === 'premium' ? (
              <span className="text-yellow-500">PREMIUM</span>
            ) : (
              <span className="text-gray-400">FREE</span>
            )}
          </h1>
          
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs w-fit shadow-inner">
            <button onClick={() => setActiveTab('expositores')} className={`px-5 py-2 rounded-lg font-extrabold transition-all duration-150 ${activeTab === 'expositores' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🔲 Meus Expositores
            </button>
            
            {/* A ABA APARECE SEMPRE, MAS COM UM AVISO 'PRO' SE FOR FREE */}
            <button onClick={() => setActiveTab('trocas')} className={`px-5 py-2 rounded-lg font-extrabold transition-all duration-150 flex items-center gap-2 ${activeTab === 'trocas' ? 'bg-yellow-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              🔄 Central de Matches
              {subscriptionStatus === 'free' && (
                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-black animate-pulse shadow-sm">
                  Pro
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

      {/* ABA: TROCAS (COM PAYWALL) */}
      {activeTab === 'trocas' && (
        <div className="pt-2 animate-fade-in">
          {subscriptionStatus === 'premium' ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="border-b border-gray-800 pb-3">
                <h3 className="text-lg font-black text-yellow-500">Radar de Conexões Ativo</h3>
                <p className="text-xs text-gray-400 font-light mt-0.5">O sistema está a cruzar os teus itens repetidos com outros colecionadores.</p>
              </div>
              <div className="bg-gray-950 p-8 rounded-xl border border-gray-850 text-center space-y-2">
                <span className="text-4xl block mb-4 animate-bounce">📡</span>
                <h4 className="text-sm font-bold text-white">À procura de conexões automáticas...</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">Tens atualmente {allMiniatures.filter(m => m.is_for_trade).length} miniaturas expostas para troca. Assim que houver um match na rede, os dados de contacto abrem aqui.</p>
              </div>
            </div>
          ) : (
            /* PAYWALL PARA UTILIZADORES FREE */
            <div className="relative w-full border border-gray-800 rounded-2xl overflow-hidden bg-gray-950 min-h-[400px] flex items-center justify-center shadow-2xl">
              
              {/* Fundo Desfocado (Efeito Psicológico) */}
              <div className="absolute inset-0 p-6 space-y-3 opacity-40 blur-sm pointer-events-none select-none">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-20 bg-gray-900 rounded-xl border border-gray-800 flex items-center px-4 justify-between">
                     <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-gray-800 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-3 bg-gray-700 rounded"></div>
                          <div className="w-20 h-2 bg-gray-800 rounded"></div>
                        </div>
                     </div>
                     <div className="w-24 h-8 bg-yellow-500/20 rounded-lg"></div>
                  </div>
                ))}
              </div>

              {/* Caixa de Conversão */}
              <div className="relative z-10 bg-gray-900/90 backdrop-blur-xl border border-gray-700 p-8 rounded-2xl max-w-md text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(234,179,8,0.15)] mb-4">🔒</div>
                <h3 className="text-2xl font-black text-white tracking-tight">Central de Matches Bloqueada</h3>
                <p className="text-sm text-gray-400 mt-3 mb-6 leading-relaxed">
                  Existem colecionadores na rede à procura das tuas miniaturas. Desbloqueia o WheelTrack PRO para veres quem tem o que procuras e iniciares trocas diretas.
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
      )}
    </div>
  );
}