import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function SocialFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, { count: number; userReacted: boolean }>>({});

  useEffect(() => {
    async function inicializarFeed() {
      try {
        setLoading(true);
        
        // 1. Obter o utilizador atual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        // 2. Calcular a data de corte (há precisamente 48 horas atrás)
        const haDoisDias = new Date();
        haDoisDias.setHours(haDoisDias.getHours() - 48);
        const dataCorteISO = haDoisDias.toISOString();

        // 3. Buscar miniaturas adicionadas nas últimas 48 horas (Oculta o histórico antigo)
        const { data: mins, error: minsError } = await supabase
          .from('miniatures')
          .select('*')
          .gt('created_at', dataCorteISO)
          .order('created_at', { ascending: false });

        if (minsError) throw minsError;
        const listaCarros = mins || [];
        setActivities(listaCarros);

        if (listaCarros.length === 0) {
          setLoading(false);
          return;
        }

        // 4. Mapear os perfis dos utilizadores que publicaram
        const userIds = Array.from(new Set(listaCarros.map(c => c.user_id)));
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profMap: Record<string, string> = {};
        profiles?.forEach(p => profMap[p.id] = p.full_name || 'Colecionador');
        setUserProfiles(profMap);

        // 5. Buscar as reações das rodas (🛞) para estes carros
        const carIds = listaCarros.map(c => c.id);
        const { data: reacs } = await supabase
          .from('miniature_reactions')
          .select('miniature_id, user_id')
          .in('miniature_id', carIds);

        const reacMap: Record<string, { count: number; userReacted: boolean }> = {};
        carIds.forEach(id => {
          const itemReactions = reacs?.filter(r => r.miniature_id === id) || [];
          reacMap[id] = {
            count: itemReactions.length,
            userReacted: itemReactions.some(r => r.user_id === user?.id)
          };
        });
        setReactionsMap(reacMap);

      } catch (err) {
        console.error("Erro ao carregar o feed social:", err);
      } finally {
        setLoading(false);
      }
    }

    inicializarFeed();
  }, [currentUserId]);

  const handleToggleWheel = async (miniatureId: string, alreadyLiked: boolean) => {
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
      
      // Atualiza o contador local instantaneamente
      setReactionsMap(prev => {
        const current = prev[miniatureId] || { count: 0, userReacted: false };
        return {
          ...prev,
          [miniatureId]: {
            count: current.userReacted ? current.count - 1 : current.count + 1,
            userReacted: !current.userReacted
          }
        };
      });
    } catch (err) {
      console.error("Erro ao clicar na roda:", err);
    }
  };

  const formatTempoTratado = (dataString: string) => {
    const diffMs = new Date().getTime() - new Date(dataString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHoras < 24) return `Há ${diffHoras} h`;
    return 'Há 1 dia';
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-xs font-bold text-sky-400 animate-pulse uppercase tracking-widest">
        A carregar a Linha do Tempo...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-2 animate-fade-in pb-12">
      
      {/* IDENTIFICADOR SUPERIOR DO FEED */}
      <div className="text-left border-b border-sky-500/10 pb-2">
        <h3 className="text-lg font-black text-sky-400 uppercase tracking-tight">Novidades da Rede</h3>
        <p className="text-[11px] text-gray-400 font-normal">Últimas 48 horas de caçadas na comunidade.</p>
      </div>

      {activities.length === 0 ? (
        <div className="bg-sky-950/20 border border-sky-900/40 rounded-2xl p-8 text-center text-sky-400/60 text-xs font-bold uppercase tracking-wider">
          📭 Sem publicações recentes nas últimas 48h.
        </div>
      ) : (
        activities.map((car) => {
          const userName = userProfiles[car.user_id] || 'Colecionador';
          const reacInfo = reactionsMap[car.id] || { count: 0, userReacted: false };

          return (
            /* POST ESTILO FACEBOOK - DESIGN CERÚLEO E CLARO */
            <div key={car.id} className="bg-slate-900/40 border border-sky-500/20 rounded-2xl p-4 shadow-xl space-y-4 text-left backdrop-blur-md">
              
              {/* CABEÇALHO DO POST: USUÁRIO E TEMPO */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center font-black text-xs text-gray-950 uppercase shadow-md">
                  {userName.substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                    {userName}
                  </h4>
                  <span className="text-[10px] text-sky-400/70 font-medium block">
                    🚀 Adicionou à coleção • {formatTempoTratado(car.created_at)}
                  </span>
                </div>
              </div>

              {/* CONTEÚDO / PREVIEW DO MODELO ADICIONADO */}
              <div className="bg-gradient-to-b from-sky-950/20 to-slate-950/80 rounded-xl border border-sky-500/10 overflow-hidden group">
                
                {/* Imagem do Post */}
                <div className="h-48 bg-slate-950 flex items-center justify-center relative overflow-hidden border-b border-sky-500/5">
                  {car.photo_url ? (
                    <img src={car.photo_url} alt={car.name} className="w-full h-full object-cover opacity-95 group-hover:scale-102 transition duration-300" />
                  ) : (
                    <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">🚗</span>
                  )}
                  <span className="absolute top-3 right-3 bg-sky-400/20 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-sky-300 font-black uppercase tracking-wider border border-sky-400/20">
                    {car.rarity_type || 'Regular'}
                  </span>
                </div>

                {/* Dados da Miniatura */}
                <div className="p-3 bg-slate-950/40">
                  <h5 className="text-sm font-black text-white uppercase tracking-tight">{car.name}</h5>
                  <div className="flex gap-3 items-center mt-1 text-[10px] text-gray-400">
                    <span>🎬 {car.series || 'Série Geral'}</span>
                    {car.toy_code && <span className="font-mono text-sky-400">#{car.toy_code}</span>}
                  </div>
                </div>

              </div>

              {/* BOTÕES DE REAÇÃO ESTILO TIMELINE */}
              <div className="pt-2 border-t border-sky-500/10 flex items-center justify-between gap-4">
                
                {/* BOTÃO DA RODA (LIKE) */}
                <button
                  onClick={() => handleToggleWheel(car.id, reacInfo.userReacted)}
                  className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    reacInfo.userReacted
                      ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-black'
                      : 'bg-sky-400/5 border border-sky-500/5 text-sky-300 hover:bg-sky-400/10 hover:text-white'
                  }`}
                >
                  <span className={`text-base transition-transform duration-500 ${reacInfo.userReacted ? 'rotate-180 scale-110' : ''}`}>
                    🛞
                  </span>
                  <span>Girar Roda ({reacInfo.count})</span>
                </button>

                {/* BOTÃO DE INTERESSE / PROPÔR NEGÓCIO */}
                {car.is_for_trade && (
                  <button
                    onClick={() => {
                      // Dispara um clique simulado no sistema de propostas do Dashboard
                      const ev = new CustomEvent('propor-troca-feed', { detail: car });
                      window.dispatchEvent(ev);
                    }}
                    className="flex items-center justify-center gap-2 flex-1 py-2 bg-sky-400/10 border border-sky-400/20 hover:bg-sky-400 hover:text-gray-950 text-xs font-black rounded-xl text-sky-200 uppercase tracking-wider transition shadow-md"
                  >
                    💬 Tenho Interesse
                  </button>
                )}

              </div>

            </div>
          );
        })
      )}
    </div>
  );
}