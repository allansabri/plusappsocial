import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, Challenge, LeaderboardEntry } from '@/types';
import { ALL_BADGES, MOCK_CHALLENGES, MOCK_LEADERBOARD, calculateLevel, xpForNextLevel } from '@/mocks/gamification';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const XP_KEY = 'plus_user_xp';
const BADGES_KEY = 'plus_user_badges';
const CHALLENGES_KEY = 'plus_user_challenges';
const STREAK_KEY = 'plus_user_streak';

export const [GamificationProvider, useGamification] = createContextHook(() => {
  const { user } = useAuth();
  const [xp, setXp] = useState<number>(1250);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>(['b1', 'b6']);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [streak, setStreak] = useState<number>(3);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (isSupabaseConfigured && user?.id) {
      await loadFromSupabase();
    } else {
      await loadFromLocal();
    }
    setIsLoaded(true);
  };

  const loadFromSupabase = async () => {
    try {
      const { data: gamData } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (gamData) {
        setXp(gamData.xp);
        setStreak(gamData.streak);
        setEarnedBadgeIds(gamData.earned_badge_ids || ['b1', 'b6']);
        console.log('[Gamification] Loaded from Supabase, XP:', gamData.xp);
      } else {
        try {
          await supabase.from('user_gamification').insert({
            user_id: user!.id,
            xp: 1250,
            streak: 3,
            earned_badge_ids: ['b1', 'b6'],
          });
          console.log('[Gamification] Created initial record in Supabase');
        } catch (insertError) {
          console.log('[Gamification] Init insert error:', insertError);
        }
      }

      const { data: challengesData } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user!.id);

      if (challengesData && challengesData.length > 0) {
        const updatedChallenges = MOCK_CHALLENGES.map(ch => {
          const saved = challengesData.find((c: any) => c.challenge_id === ch.id);
          if (saved) {
            return { ...ch, progress: saved.progress, completed: saved.completed };
          }
          return ch;
        });
        setChallenges(updatedChallenges);
      }
    } catch (e) {
      console.error('[Gamification] Supabase load error, falling back to local:', e);
      await loadFromLocal();
    }
  };

  const loadFromLocal = async () => {
    try {
      const [xpData, badgesData, challengesData, streakData] = await Promise.all([
        AsyncStorage.getItem(XP_KEY),
        AsyncStorage.getItem(BADGES_KEY),
        AsyncStorage.getItem(CHALLENGES_KEY),
        AsyncStorage.getItem(STREAK_KEY),
      ]);
      if (xpData) setXp(JSON.parse(xpData));
      if (badgesData) setEarnedBadgeIds(JSON.parse(badgesData));
      if (challengesData) setChallenges(JSON.parse(challengesData));
      if (streakData) setStreak(JSON.parse(streakData));
      console.log('[Gamification] Loaded from local storage');
    } catch (e) {
      console.log('[Gamification] Local load error:', e);
    }
  };

  const persistXp = useCallback(async (val: number) => {
    try { await AsyncStorage.setItem(XP_KEY, JSON.stringify(val)); } catch (e) { console.log('[Gamification] XP persist error:', e); }
  }, []);

  const persistBadges = useCallback(async (ids: string[]) => {
    try { await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(ids)); } catch (e) { console.log('[Gamification] Badges persist error:', e); }
  }, []);

  const persistChallenges = useCallback(async (ch: Challenge[]) => {
    try { await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(ch)); } catch (e) { console.log('[Gamification] Challenges persist error:', e); }
  }, []);

  const syncGamificationToSupabase = useCallback(async (newXp: number, newBadgeIds?: string[], newStreak?: number) => {
    if (!isSupabaseConfigured || !user?.id) return;
    try {
      const updates: Record<string, any> = { xp: newXp, updated_at: new Date().toISOString() };
      if (newBadgeIds) updates.earned_badge_ids = newBadgeIds;
      if (newStreak !== undefined) updates.streak = newStreak;

      await supabase
        .from('user_gamification')
        .update(updates)
        .eq('user_id', user.id);
    } catch (e) {
      console.error('[Gamification] Supabase sync error:', e);
    }
  }, [user?.id]);

  const level = useMemo(() => calculateLevel(xp), [xp]);
  const levelProgress = useMemo(() => xpForNextLevel(xp), [xp]);

  const badges = useMemo((): Badge[] => {
    return ALL_BADGES.map(b => ({
      ...b,
      unlockedAt: earnedBadgeIds.includes(b.id) ? new Date().toISOString() : undefined,
      progress: earnedBadgeIds.includes(b.id) ? b.target : b.progress,
    }));
  }, [earnedBadgeIds]);

  const earnedBadges = useMemo(() => badges.filter(b => b.unlockedAt), [badges]);

  const addXp = useCallback((amount: number, reason: string) => {
    console.log(`[Gamification] +${amount} XP (${reason})`);
    setXp(prev => {
      const newXp = prev + amount;
      persistXp(newXp);
      syncGamificationToSupabase(newXp);
      return newXp;
    });
  }, [persistXp, syncGamificationToSupabase]);

  const unlockBadge = useCallback((badgeId: string) => {
    if (earnedBadgeIds.includes(badgeId)) return;
    console.log('[Gamification] Badge unlocked:', badgeId);
    const updated = [...earnedBadgeIds, badgeId];
    setEarnedBadgeIds(updated);
    persistBadges(updated);
    syncGamificationToSupabase(xp, updated);
    addXp(100, 'badge_unlocked');
  }, [earnedBadgeIds, persistBadges, addXp, xp, syncGamificationToSupabase]);

  const updateChallengeProgress = useCallback((challengeId: string, increment: number = 1) => {
    setChallenges(prev => {
      const updated = prev.map(ch => {
        if (ch.id === challengeId && !ch.completed) {
          const newProgress = Math.min(ch.progress + increment, ch.target);
          const completed = newProgress >= ch.target;
          if (completed) {
            addXp(ch.reward_xp, `challenge_${ch.id}`);
          }

          if (isSupabaseConfigured && user?.id) {
            supabase.from('user_challenges').upsert({
              user_id: user.id,
              challenge_id: challengeId,
              progress: newProgress,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            }, { onConflict: 'user_id,challenge_id' }).then(({ error }: { error: any }) => {
              if (error) console.error('[Gamification] Challenge sync error:', error);
            });
          }

          return { ...ch, progress: newProgress, completed };
        }
        return ch;
      });
      persistChallenges(updated);
      return updated;
    });
  }, [addXp, persistChallenges, user?.id]);

  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const userEntry: LeaderboardEntry = {
      id: 'current-user',
      username: 'vous',
      display_name: 'Vous',
      avatar_url: null,
      xp,
      level,
      rank: 0,
    };
    const all = [...MOCK_LEADERBOARD, userEntry].sort((a, b) => b.xp - a.xp);
    return all.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [xp, level]);

  const activeChallenges = useMemo(() => challenges.filter(c => !c.completed), [challenges]);
  const completedChallenges = useMemo(() => challenges.filter(c => c.completed), [challenges]);

  return {
    xp,
    level,
    levelProgress,
    badges,
    earnedBadges,
    challenges,
    activeChallenges,
    completedChallenges,
    leaderboard,
    streak,
    isLoaded,
    addXp,
    unlockBadge,
    updateChallengeProgress,
  };
});