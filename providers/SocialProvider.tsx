import { useState, useCallback, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserMood, StoryReaction, ReleaseReminder, GroupedNotification, JournalEntry } from '@/types';
import { MOCK_JOURNAL, MOCK_GROUPED_NOTIFICATIONS } from '@/mocks/social';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const MOOD_KEY = 'plus_user_mood';
const JOURNAL_KEY = 'plus_user_journal';
const REMINDERS_KEY = 'plus_user_reminders';
const REACTIONS_KEY = 'plus_story_reactions';
const SPOILER_KEY = 'plus_spoiler_mode';

export type SpoilerMode = 'normal' | 'strict' | 'off';

export const [SocialProvider, useSocial] = createContextHook(() => {
  const { user } = useAuth();
  const [mood, setMood] = useState<UserMood | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>(MOCK_JOURNAL);
  const [reminders, setReminders] = useState<ReleaseReminder[]>([]);
  const [storyReactions, setStoryReactions] = useState<StoryReaction[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>(MOCK_GROUPED_NOTIFICATIONS);
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>('normal');
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
      const [moodRes, journalRes, remindersRes, reactionsRes] = await Promise.all([
        supabase.from('user_moods').select('*').eq('user_id', user!.id).single(),
        supabase.from('journal_entries').select('*').eq('user_id', user!.id).order('watched_at', { ascending: false }),
        supabase.from('release_reminders').select('*').eq('user_id', user!.id),
        supabase.from('story_reactions').select('*').limit(100),
      ]);

      if (moodRes.data) {
        const m: UserMood = {
          emoji: moodRes.data.emoji,
          label: moodRes.data.label,
          mediaId: moodRes.data.media_id,
          mediaType: moodRes.data.media_type,
          mediaTitle: moodRes.data.media_title,
          updatedAt: moodRes.data.updated_at,
        };
        setMood(m);
      }

      if (journalRes.data && journalRes.data.length > 0) {
        const entries: JournalEntry[] = journalRes.data.map((j: any) => ({
          id: j.id,
          tmdb_id: j.tmdb_id,
          tmdb_type: j.tmdb_type,
          tmdb_title: j.tmdb_title,
          tmdb_poster: j.tmdb_poster,
          watched_at: j.watched_at,
          rating: j.rating ? Number(j.rating) : undefined,
          season: j.season,
          episode: j.episode,
          note: j.note,
        }));
        setJournal(entries);
        console.log('[Social] Journal loaded from Supabase:', entries.length);
      }

      if (remindersRes.data) {
        const items: ReleaseReminder[] = remindersRes.data.map((r: any) => ({
          id: r.id,
          tmdb_id: r.tmdb_id,
          tmdb_type: r.tmdb_type,
          tmdb_title: r.tmdb_title,
          tmdb_poster: r.tmdb_poster,
          release_date: r.release_date,
          reminded: r.reminded,
        }));
        setReminders(items);
      }

      if (reactionsRes.data) {
        const items: StoryReaction[] = reactionsRes.data.map((r: any) => ({
          storyId: r.story_id,
          emoji: r.emoji,
          userId: r.user_id,
          username: r.username,
          timestamp: r.created_at,
        }));
        setStoryReactions(items);
      }

      const spoilerData = await AsyncStorage.getItem(SPOILER_KEY);
      if (spoilerData) setSpoilerMode(spoilerData as SpoilerMode);

      console.log('[Social] Loaded from Supabase');
    } catch (e) {
      console.error('[Social] Supabase load error, falling back to local:', e);
      await loadFromLocal();
    }
  };

  const loadFromLocal = async () => {
    try {
      const [moodData, journalData, remindersData, reactionsData, spoilerData] = await Promise.all([
        AsyncStorage.getItem(MOOD_KEY),
        AsyncStorage.getItem(JOURNAL_KEY),
        AsyncStorage.getItem(REMINDERS_KEY),
        AsyncStorage.getItem(REACTIONS_KEY),
        AsyncStorage.getItem(SPOILER_KEY),
      ]);
      if (moodData) setMood(JSON.parse(moodData));
      if (journalData) setJournal(JSON.parse(journalData));
      if (remindersData) setReminders(JSON.parse(remindersData));
      if (reactionsData) setStoryReactions(JSON.parse(reactionsData));
      if (spoilerData) setSpoilerMode(spoilerData as SpoilerMode);
      console.log('[Social] Loaded from local storage');
    } catch (e) {
      console.log('[Social] Local load error:', e);
    }
  };

  const updateMood = useCallback(async (newMood: UserMood) => {
    setMood(newMood);

    if (isSupabaseConfigured && user?.id) {
      try {
        const { error } = await supabase
          .from('user_moods')
          .upsert({
            user_id: user.id,
            emoji: newMood.emoji,
            label: newMood.label,
            media_id: newMood.mediaId,
            media_type: newMood.mediaType,
            media_title: newMood.mediaTitle,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        if (error) console.error('[Social] Supabase mood update error:', error);
        else console.log('[Social] Mood synced to Supabase');
      } catch (e) {
        console.error('[Social] Mood sync error:', e);
      }
    }

    try { await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(newMood)); } catch (e) { console.log('[Social] Mood persist error:', e); }
  }, [user?.id]);

  const clearMood = useCallback(async () => {
    setMood(null);

    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('user_moods').delete().eq('user_id', user.id);
      } catch (e) {
        console.error('[Social] Mood clear error:', e);
      }
    }

    try { await AsyncStorage.removeItem(MOOD_KEY); } catch (e) { console.log('[Social] Mood clear error:', e); }
  }, [user?.id]);

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id'>) => {
    const localId = `j-${Date.now()}`;
    const newEntry: JournalEntry = { ...entry, id: localId };

    const updated = [newEntry, ...journal];
    setJournal(updated);

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            tmdb_id: entry.tmdb_id,
            tmdb_type: entry.tmdb_type,
            tmdb_title: entry.tmdb_title,
            tmdb_poster: entry.tmdb_poster,
            watched_at: entry.watched_at,
            rating: entry.rating,
            season: entry.season,
            episode: entry.episode,
            note: entry.note,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setJournal(prev => prev.map(j => j.id === localId ? { ...j, id: data.id } : j));
          console.log('[Social] Journal entry synced to Supabase');
        }
      } catch (e) {
        console.error('[Social] Journal sync error:', e);
      }
    }

    try { await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(updated)); } catch (e) { console.log('[Social] Journal persist error:', e); }
    console.log('[Social] Journal entry added:', entry.tmdb_title);
    return newEntry;
  }, [journal, user?.id]);

  const removeJournalEntry = useCallback(async (entryId: string) => {
    const updated = journal.filter(j => j.id !== entryId);
    setJournal(updated);

    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('journal_entries').delete().eq('id', entryId);
      } catch (e) {
        console.error('[Social] Journal remove error:', e);
      }
    }

    try { await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(updated)); } catch (e) { console.log('[Social] Journal remove error:', e); }
  }, [journal, user?.id]);

  const addReminder = useCallback(async (reminder: Omit<ReleaseReminder, 'id' | 'reminded'>) => {
    const existing = reminders.find(r => r.tmdb_id === reminder.tmdb_id);
    if (existing) return;

    const localId = `rem-${Date.now()}`;
    const newReminder: ReleaseReminder = { ...reminder, id: localId, reminded: false };
    const updated = [...reminders, newReminder];
    setReminders(updated);

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('release_reminders')
          .insert({
            user_id: user.id,
            tmdb_id: reminder.tmdb_id,
            tmdb_type: reminder.tmdb_type,
            tmdb_title: reminder.tmdb_title,
            tmdb_poster: reminder.tmdb_poster,
            release_date: reminder.release_date,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setReminders(prev => prev.map(r => r.id === localId ? { ...r, id: data.id } : r));
        }
      } catch (e) {
        console.error('[Social] Reminder sync error:', e);
      }
    }

    try { await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated)); } catch (e) { console.log('[Social] Reminder persist error:', e); }
    console.log('[Social] Reminder added:', reminder.tmdb_title);
  }, [reminders, user?.id]);

  const removeReminder = useCallback(async (tmdbId: number) => {
    const item = reminders.find(r => r.tmdb_id === tmdbId);
    const updated = reminders.filter(r => r.tmdb_id !== tmdbId);
    setReminders(updated);

    if (isSupabaseConfigured && user?.id && item) {
      try {
        await supabase.from('release_reminders').delete().eq('id', item.id);
      } catch (e) {
        console.error('[Social] Reminder remove error:', e);
      }
    }

    try { await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated)); } catch (e) { console.log('[Social] Reminder remove error:', e); }
  }, [reminders, user?.id]);

  const hasReminder = useCallback((tmdbId: number) => {
    return reminders.some(r => r.tmdb_id === tmdbId);
  }, [reminders]);

  const addStoryReaction = useCallback(async (reaction: Omit<StoryReaction, 'timestamp'>) => {
    const newReaction: StoryReaction = { ...reaction, timestamp: new Date().toISOString() };
    const updated = [...storyReactions, newReaction];
    setStoryReactions(updated);

    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('story_reactions').insert({
          story_id: reaction.storyId,
          emoji: reaction.emoji,
          user_id: reaction.userId,
          username: reaction.username,
        });
      } catch (e) {
        console.error('[Social] Reaction sync error:', e);
      }
    }

    try { await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(updated)); } catch (e) { console.log('[Social] Reaction persist error:', e); }
  }, [storyReactions, user?.id]);

  const getStoryReactions = useCallback((storyId: string) => {
    return storyReactions.filter(r => r.storyId === storyId);
  }, [storyReactions]);

  const markNotificationsRead = useCallback(() => {
    setGroupedNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadNotifCount = groupedNotifications.filter(n => !n.read).reduce((sum, n) => sum + n.count, 0);

  const updateSpoilerMode = useCallback(async (mode: SpoilerMode) => {
    setSpoilerMode(mode);
    try { await AsyncStorage.setItem(SPOILER_KEY, mode); } catch (e) { console.log('[Social] Spoiler persist error:', e); }
  }, []);

  const parseMentions = useCallback((text: string): string[] => {
    const regex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }, []);

  const journalByDate = useCallback((date: string): JournalEntry[] => {
    return journal.filter(j => j.watched_at.startsWith(date));
  }, [journal]);

  const journalDates = journal.map(j => j.watched_at.split('T')[0]);

  const totalWatchTime = journal.reduce((sum, j) => {
    return sum + (j.tmdb_type === 'movie' ? 120 : 45);
  }, 0);

  return {
    mood,
    journal,
    reminders,
    storyReactions,
    groupedNotifications,
    spoilerMode,
    unreadNotifCount,
    journalDates,
    totalWatchTime,
    isLoaded,
    updateMood,
    clearMood,
    addJournalEntry,
    removeJournalEntry,
    addReminder,
    removeReminder,
    hasReminder,
    addStoryReaction,
    getStoryReactions,
    markNotificationsRead,
    updateSpoilerMode,
    parseMentions,
    journalByDate,
  };
});