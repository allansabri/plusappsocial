import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchlistItem, Rating } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const WATCHLIST_KEY = 'plus_watchlist';
const RATINGS_KEY = 'plus_ratings';
const EPISODES_KEY = 'plus_watched_episodes';

export interface WatchedEpisode {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
}

export const [WatchlistProvider, useWatchlist] = createContextHook(() => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (isSupabaseConfigured && user?.id) {
      await loadFromSupabase();
    } else {
      await loadFromLocal();
    }
    setIsLoading(false);
  };

  const loadFromSupabase = async () => {
    try {
      const [wlRes, rtRes, epRes] = await Promise.all([
        supabase.from('watchlist').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('ratings').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('watched_episodes').select('*').eq('user_id', user!.id),
      ]);

      if (wlRes.data) {
        const items: WatchlistItem[] = wlRes.data.map((w: any) => ({
          id: w.id,
          user_id: w.user_id,
          tmdb_id: w.tmdb_id,
          tmdb_type: w.tmdb_type,
          tmdb_title: w.tmdb_title,
          tmdb_poster: w.tmdb_poster,
          status: w.status,
          created_at: w.created_at,
        }));
        setWatchlist(items);
        console.log('[Watchlist] Loaded from Supabase:', items.length);
      }

      if (rtRes.data) {
        const items: Rating[] = rtRes.data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          tmdb_id: r.tmdb_id,
          tmdb_type: r.tmdb_type,
          score: Number(r.score),
          review: r.review,
          created_at: r.created_at,
        }));
        setRatings(items);
        console.log('[Watchlist] Ratings loaded from Supabase:', items.length);
      }

      if (epRes.data) {
        const items: WatchedEpisode[] = epRes.data.map((e: any) => ({
          seriesId: e.series_id,
          seasonNumber: e.season_number,
          episodeNumber: e.episode_number,
        }));
        setWatchedEpisodes(items);
        console.log('[Watchlist] Watched episodes loaded from Supabase:', items.length);
      }

      if (wlRes.error) console.error('[Watchlist] Supabase watchlist error:', wlRes.error);
      if (rtRes.error) console.error('[Watchlist] Supabase ratings error:', rtRes.error);
      if (epRes.error) console.error('[Watchlist] Supabase episodes error:', epRes.error);
    } catch (e) {
      console.error('[Watchlist] Supabase load error, falling back to local:', e);
      await loadFromLocal();
    }
  };

  const loadFromLocal = async () => {
    try {
      const [wlData, rtData, epData] = await Promise.all([
        AsyncStorage.getItem(WATCHLIST_KEY),
        AsyncStorage.getItem(RATINGS_KEY),
        AsyncStorage.getItem(EPISODES_KEY),
      ]);
      if (wlData) setWatchlist(JSON.parse(wlData));
      if (rtData) setRatings(JSON.parse(rtData));
      if (epData) setWatchedEpisodes(JSON.parse(epData));
    } catch (e) {
      console.error('[Watchlist] Local load error:', e);
    }
  };

  const saveWatchlistLocal = async (items: WatchlistItem[]) => {
    setWatchlist(items);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  };

  const saveRatingsLocal = async (items: Rating[]) => {
    setRatings(items);
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(items));
  };

  const saveWatchedEpisodesLocal = async (items: WatchedEpisode[]) => {
    setWatchedEpisodes(items);
    await AsyncStorage.setItem(EPISODES_KEY, JSON.stringify(items));
  };

  const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'id' | 'user_id' | 'created_at'>) => {
    const existing = watchlist.find(w => w.tmdb_id === item.tmdb_id && w.tmdb_type === item.tmdb_type);

    if (isSupabaseConfigured && user?.id) {
      try {
        if (existing) {
          const { error } = await supabase
            .from('watchlist')
            .update({ status: item.status, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
          const updated = watchlist.map(w => w.id === existing.id ? { ...w, status: item.status } : w);
          setWatchlist(updated);
          console.log('[Watchlist] Updated in Supabase:', item.tmdb_title);
        } else {
          const { data, error } = await supabase
            .from('watchlist')
            .insert({
              user_id: user.id,
              tmdb_id: item.tmdb_id,
              tmdb_type: item.tmdb_type,
              tmdb_title: item.tmdb_title,
              tmdb_poster: item.tmdb_poster,
              status: item.status,
            })
            .select()
            .single();
          if (error) throw error;
          if (data) {
            const newItem: WatchlistItem = {
              id: data.id,
              user_id: data.user_id,
              tmdb_id: data.tmdb_id,
              tmdb_type: data.tmdb_type,
              tmdb_title: data.tmdb_title,
              tmdb_poster: data.tmdb_poster,
              status: data.status,
              created_at: data.created_at,
            };
            setWatchlist(prev => [newItem, ...prev]);
            console.log('[Watchlist] Added to Supabase:', item.tmdb_title);
          }
        }
        return;
      } catch (e) {
        console.error('[Watchlist] Supabase add error, falling back to local:', e);
      }
    }

    if (existing) {
      const updated = watchlist.map(w => w.id === existing.id ? { ...w, status: item.status } : w);
      await saveWatchlistLocal(updated);
    } else {
      const newItem: WatchlistItem = {
        ...item,
        id: `wl-${Date.now()}`,
        user_id: user?.id ?? 'anonymous',
        created_at: new Date().toISOString(),
      };
      await saveWatchlistLocal([newItem, ...watchlist]);
    }
  }, [watchlist, user?.id]);

  const removeFromWatchlist = useCallback(async (tmdbId: number, tmdbType: 'movie' | 'tv') => {
    const item = watchlist.find(w => w.tmdb_id === tmdbId && w.tmdb_type === tmdbType);

    if (isSupabaseConfigured && user?.id && item) {
      try {
        const { error } = await supabase.from('watchlist').delete().eq('id', item.id);
        if (error) throw error;
        setWatchlist(prev => prev.filter(w => w.id !== item.id));
        console.log('[Watchlist] Removed from Supabase');
        return;
      } catch (e) {
        console.error('[Watchlist] Supabase remove error:', e);
      }
    }

    const updated = watchlist.filter(w => !(w.tmdb_id === tmdbId && w.tmdb_type === tmdbType));
    await saveWatchlistLocal(updated);
  }, [watchlist, user?.id]);

  const getWatchlistStatus = useCallback((tmdbId: number, tmdbType: 'movie' | 'tv') => {
    return watchlist.find(w => w.tmdb_id === tmdbId && w.tmdb_type === tmdbType)?.status ?? null;
  }, [watchlist]);

  const rateItem = useCallback(async (tmdbId: number, tmdbType: 'movie' | 'tv', score: number) => {
    const existing = ratings.find(r => r.tmdb_id === tmdbId && r.tmdb_type === tmdbType);

    if (isSupabaseConfigured && user?.id) {
      try {
        if (existing) {
          const { error } = await supabase
            .from('ratings')
            .update({ score, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
          setRatings(prev => prev.map(r => r.id === existing.id ? { ...r, score } : r));
          console.log('[Watchlist] Rating updated in Supabase');
        } else {
          const { data, error } = await supabase
            .from('ratings')
            .insert({
              user_id: user.id,
              tmdb_id: tmdbId,
              tmdb_type: tmdbType,
              score,
            })
            .select()
            .single();
          if (error) throw error;
          if (data) {
            const newRating: Rating = {
              id: data.id,
              user_id: data.user_id,
              tmdb_id: data.tmdb_id,
              tmdb_type: data.tmdb_type,
              score: Number(data.score),
              review: data.review,
              created_at: data.created_at,
            };
            setRatings(prev => [newRating, ...prev]);
            console.log('[Watchlist] Rating added to Supabase');
          }
        }
        return;
      } catch (e) {
        console.error('[Watchlist] Supabase rate error:', e);
      }
    }

    if (existing) {
      const updated = ratings.map(r => r.id === existing.id ? { ...r, score } : r);
      await saveRatingsLocal(updated);
    } else {
      const newRating: Rating = {
        id: `rt-${Date.now()}`,
        user_id: user?.id ?? 'anonymous',
        tmdb_id: tmdbId,
        tmdb_type: tmdbType,
        score,
        review: null,
        created_at: new Date().toISOString(),
      };
      await saveRatingsLocal([newRating, ...ratings]);
    }
  }, [ratings, user?.id]);

  const getRating = useCallback((tmdbId: number, tmdbType: 'movie' | 'tv') => {
    return ratings.find(r => r.tmdb_id === tmdbId && r.tmdb_type === tmdbType)?.score ?? null;
  }, [ratings]);

  const toggleEpisodeWatched = useCallback(async (seriesId: number, seasonNumber: number, episodeNumber: number) => {
    const exists = watchedEpisodes.find(
      e => e.seriesId === seriesId && e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber
    );

    if (isSupabaseConfigured && user?.id) {
      try {
        if (exists) {
          const { error } = await supabase
            .from('watched_episodes')
            .delete()
            .eq('user_id', user.id)
            .eq('series_id', seriesId)
            .eq('season_number', seasonNumber)
            .eq('episode_number', episodeNumber);
          if (error) throw error;
          setWatchedEpisodes(prev => prev.filter(
            e => !(e.seriesId === seriesId && e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber)
          ));
        } else {
          const { error } = await supabase
            .from('watched_episodes')
            .insert({
              user_id: user.id,
              series_id: seriesId,
              season_number: seasonNumber,
              episode_number: episodeNumber,
            });
          if (error) throw error;
          setWatchedEpisodes(prev => [...prev, { seriesId, seasonNumber, episodeNumber }]);
        }
        console.log('[Watchlist] Episode toggle synced to Supabase');
        return;
      } catch (e) {
        console.error('[Watchlist] Supabase episode toggle error:', e);
      }
    }

    if (exists) {
      const updated = watchedEpisodes.filter(
        e => !(e.seriesId === seriesId && e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber)
      );
      await saveWatchedEpisodesLocal(updated);
    } else {
      await saveWatchedEpisodesLocal([...watchedEpisodes, { seriesId, seasonNumber, episodeNumber }]);
    }
  }, [watchedEpisodes, user?.id]);

  const markSeasonWatched = useCallback(async (seriesId: number, seasonNumber: number, episodeNumbers: number[]) => {
    const otherEpisodes = watchedEpisodes.filter(
      e => !(e.seriesId === seriesId && e.seasonNumber === seasonNumber)
    );
    const allSeasonWatched = episodeNumbers.every(ep =>
      watchedEpisodes.some(e => e.seriesId === seriesId && e.seasonNumber === seasonNumber && e.episodeNumber === ep)
    );

    if (isSupabaseConfigured && user?.id) {
      try {
        if (allSeasonWatched) {
          const { error } = await supabase
            .from('watched_episodes')
            .delete()
            .eq('user_id', user.id)
            .eq('series_id', seriesId)
            .eq('season_number', seasonNumber);
          if (error) throw error;
          setWatchedEpisodes(otherEpisodes);
        } else {
          await supabase
            .from('watched_episodes')
            .delete()
            .eq('user_id', user.id)
            .eq('series_id', seriesId)
            .eq('season_number', seasonNumber);

          const inserts = episodeNumbers.map(ep => ({
            user_id: user.id,
            series_id: seriesId,
            season_number: seasonNumber,
            episode_number: ep,
          }));
          const { error } = await supabase.from('watched_episodes').insert(inserts);
          if (error) throw error;
          const newEps = episodeNumbers.map(ep => ({ seriesId, seasonNumber, episodeNumber: ep }));
          setWatchedEpisodes([...otherEpisodes, ...newEps]);
        }
        console.log('[Watchlist] Season marked synced to Supabase');
        return;
      } catch (e) {
        console.error('[Watchlist] Supabase season mark error:', e);
      }
    }

    if (allSeasonWatched) {
      await saveWatchedEpisodesLocal(otherEpisodes);
    } else {
      const newEps = episodeNumbers.map(ep => ({ seriesId, seasonNumber, episodeNumber: ep }));
      await saveWatchedEpisodesLocal([...otherEpisodes, ...newEps]);
    }
  }, [watchedEpisodes, user?.id]);

  const isEpisodeWatched = useCallback((seriesId: number, seasonNumber: number, episodeNumber: number) => {
    return watchedEpisodes.some(
      e => e.seriesId === seriesId && e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber
    );
  }, [watchedEpisodes]);

  const getWatchedEpisodeCount = useCallback((seriesId: number, seasonNumber: number) => {
    return watchedEpisodes.filter(
      e => e.seriesId === seriesId && e.seasonNumber === seasonNumber
    ).length;
  }, [watchedEpisodes]);

  const wantToWatch = useMemo(() => watchlist.filter(w => w.status === 'want_to_watch'), [watchlist]);
  const watching = useMemo(() => watchlist.filter(w => w.status === 'watching'), [watchlist]);
  const watched = useMemo(() => watchlist.filter(w => w.status === 'watched'), [watchlist]);

  return {
    watchlist,
    ratings,
    watchedEpisodes,
    isLoading,
    wantToWatch,
    watching,
    watched,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistStatus,
    rateItem,
    getRating,
    toggleEpisodeWatched,
    markSeasonWatched,
    isEpisodeWatched,
    getWatchedEpisodeCount,
  };
});