import { useState, useEffect } from 'react';
import { fetchActivityFeed, toggleActivityLike } from './activityService';
import type { ActivityFeedItem } from './activityService';

export default function SocialFeed() {
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    // Atualizar a cada 10 segundos
    const interval = setInterval(loadFeed, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadFeed = async () => {
    const activities = await fetchActivityFeed(50);
    setFeed(activities);
    setLoading(false);
  };

  const handleLike = async (activityId: string) => {
    setLiking(activityId);
    await toggleActivityLike(activityId);
    await loadFeed();
    setLiking(null);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'car_added': return '🚗';
      case 'car_trade_enabled': return '🔄';
      case 'collection_milestone': return '🏆';
      default: return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-sky-400 font-bold animate-pulse">
        A carregar Feed da Comunidade...
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-3 max-w-2xl mx-auto">
      <h3 className="text-lg font-black text-white uppercase tracking-wider text-yellow-400 border-b border-sky-900/40 pb-3">
        📡 Atividade da Rede WheelTrack
      </h3>

      {feed.length === 0 ? (
        <div className="text-center py-12 text-sky-400/60 italic">
          Ainda não há atividades. Sê o primeiro a adicionar um carro! 🚗
        </div>
      ) : (
        feed.map((activity) => (
          <div
            key={activity.id}
            className="bg-sky-950/40 border border-sky-900/40 p-4 rounded-xl backdrop-blur-sm hover:border-sky-600 transition shadow-md"
          >
            {/* CABEÇALHO */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getActivityIcon(activity.activity_type)}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-white uppercase tracking-tight">
                    {activity.user_full_name}
                  </p>
                  <span className="text-[10px] text-sky-400">
                    {new Date(activity.created_at).toLocaleDateString('pt-PT', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO */}
            <p className="text-sm text-sky-200 mb-3 text-left">
              {activity.description}
            </p>

            {/* LIKES */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLike(activity.id)}
                disabled={liking === activity.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                  activity.current_user_liked
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-sky-950/50 border border-sky-800 text-sky-300 hover:border-red-500'
                }`}
              >
                <span className={liking === activity.id ? 'animate-spin' : ''}>
                  {activity.current_user_liked ? '❤️' : '🤍'}
                </span>
                <span>{activity.likes_count}</span>
              </button>

              <span className="text-[10px] text-sky-400 ml-auto">
                {activity.likes_count === 1 ? '1 pessoa gostou' : `${activity.likes_count} pessoas gostaram`}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
