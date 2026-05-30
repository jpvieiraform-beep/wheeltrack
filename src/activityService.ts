import { supabase } from './supabaseClient';

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: 'car_added' | 'car_trade_enabled' | 'collection_milestone';
  description: string;
  miniature_id?: string;
  metadata?: any;
  created_at: string;
  likes_count: number;
  user_email?: string;
  user_full_name?: string;
  current_user_liked?: boolean;
}

// 📝 REGISTAR UMA ATIVIDADE NO FEED
export const logActivity = async (
  activityType: 'car_added' | 'car_trade_enabled' | 'collection_milestone',
  description: string,
  miniatureId?: string,
  metadata?: any
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('activity_feed').insert([{
    user_id: user.id,
    activity_type: activityType,
    description,
    miniature_id: miniatureId || null,
    metadata: metadata || null
  }]).select();

  if (error) console.error('Erro ao registar atividade:', error);
  return data?.[0];
};

// 📡 BUSCAR FEED (Com dados do utilizador e se o utilizador atual deu like)
export const fetchActivityFeed = async (limit: number = 20) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar as atividades ordenadas por data (mais recentes primeiro)
  const { data: activities, error } = await supabase
    .from('activity_feed')
    .select(`
      id,
      user_id,
      activity_type,
      description,
      miniature_id,
      metadata,
      created_at,
      likes_count
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar feed:', error);
    return [];
  }

  // Buscar dados dos utilizadores (nomes, emails)
  const userIds = [...new Set(activities?.map(a => a.user_id) || [])];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap: Record<string, any> = {};
  profiles?.forEach(p => {
    profileMap[p.id] = p;
  });

  // Buscar likes do utilizador atual
  const likedActivityIds = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from('activity_likes')
      .select('activity_id')
      .eq('user_id', user.id)
      .in('activity_id', activities?.map(a => a.id) || []);

    likes?.forEach(l => likedActivityIds.add(l.activity_id));
  }

  // Enriquecer com dados do utilizador
  return (activities || []).map(activity => ({
    ...activity,
    user_full_name: profileMap[activity.user_id]?.full_name || 'Colecionador',
    current_user_liked: likedActivityIds.has(activity.id)
  }));
};

// ❤️ DAR/REMOVER LIKE
export const toggleActivityLike = async (activityId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Verificar se já deu like
  const { data: existingLike } = await supabase
    .from('activity_likes')
    .select('id')
    .eq('activity_id', activityId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    // REMOVER like
    await supabase
      .from('activity_likes')
      .delete()
      .eq('id', existingLike.id);

    // Decrementar contador
    await supabase.rpc('decrement_likes', { activity_id: activityId });
    return false;
  } else {
    // ADICIONAR like
    const { error } = await supabase
      .from('activity_likes')
      .insert([{ activity_id: activityId, user_id: user.id }]);

    if (!error) {
      // Incrementar contador
      await supabase.rpc('increment_likes', { activity_id: activityId });
      return true;
    }
  }
};
