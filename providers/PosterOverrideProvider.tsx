import { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PosterOverride } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const STORAGE_KEY = 'plus_poster_overrides';

export const [PosterOverrideProvider, usePosterOverride] = createContextHook(() => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<PosterOverride[]>([]);

  const loadOverrides = useCallback(async () => {
    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('user_poster_overrides')
          .select('*')
          .eq('user_id', user.id);
        if (!error && data) {
          const items: PosterOverride[] = data.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            media_type: r.media_type,
            tmdb_id: r.tmdb_id,
            source: r.source,
            custom_url: r.custom_url,
            tmdb_poster_path: r.tmdb_poster_path,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }));
          setOverrides(items);
          console.log('[PosterOverride] Loaded from Supabase:', items.length);
          return;
        }
      } catch (e) {
        console.log('[PosterOverride] Supabase load failed, using local:', e);
      }
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setOverrides(JSON.parse(stored));
    } catch (e) {
      console.log('[PosterOverride] Local load error:', e);
    }
  }, [user?.id]);

  const saveLocalOverrides = useCallback(async (items: PosterOverride[]) => {
    setOverrides(items);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const getPosterUrl = useCallback((tmdbId: number, mediaType: 'movie' | 'tv'): string | null => {
    const override = overrides.find(o => o.tmdb_id === tmdbId && o.media_type === mediaType);
    if (!override) return null;
    if (override.source === 'upload' && override.custom_url) return override.custom_url;
    if (override.source === 'tmdb' && override.tmdb_poster_path) {
      return `https://image.tmdb.org/t/p/w342${override.tmdb_poster_path}`;
    }
    return null;
  }, [overrides]);

  const setUploadPoster = useCallback(async (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    localUri: string,
    supabaseUrl?: string
  ) => {
    const finalUrl = supabaseUrl ?? localUri;
    const now = new Date().toISOString();
    const existing = overrides.find(o => o.tmdb_id === tmdbId && o.media_type === mediaType);

    if (isSupabaseConfigured && user?.id) {
      try {
        if (existing) {
          const { error } = await supabase
            .from('user_poster_overrides')
            .update({ source: 'upload', custom_url: finalUrl, tmdb_poster_path: null, updated_at: now })
            .eq('user_id', user.id)
            .eq('tmdb_id', tmdbId)
            .eq('media_type', mediaType);
          if (!error) {
            const updated = overrides.map(o =>
              o.tmdb_id === tmdbId && o.media_type === mediaType
                ? { ...o, source: 'upload' as const, custom_url: finalUrl, tmdb_poster_path: null, updated_at: now }
                : o
            );
            await saveLocalOverrides(updated);
            console.log('[PosterOverride] Upload updated in Supabase');
            return;
          }
        } else {
          const { data, error } = await supabase
            .from('user_poster_overrides')
            .insert({
              user_id: user.id,
              media_type: mediaType,
              tmdb_id: tmdbId,
              source: 'upload',
              custom_url: finalUrl,
              tmdb_poster_path: null,
            })
            .select()
            .single();
          if (!error && data) {
            const newItem: PosterOverride = {
              id: data.id,
              user_id: data.user_id,
              media_type: data.media_type,
              tmdb_id: data.tmdb_id,
              source: 'upload',
              custom_url: finalUrl,
              tmdb_poster_path: null,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
            await saveLocalOverrides([...overrides, newItem]);
            console.log('[PosterOverride] Upload saved to Supabase');
            return;
          }
        }
      } catch (e) {
        console.log('[PosterOverride] Supabase save failed, using local:', e);
      }
    }

    if (existing) {
      const updated = overrides.map(o =>
        o.tmdb_id === tmdbId && o.media_type === mediaType
          ? { ...o, source: 'upload' as const, custom_url: finalUrl, tmdb_poster_path: null, updated_at: now }
          : o
      );
      await saveLocalOverrides(updated);
    } else {
      const newItem: PosterOverride = {
        id: `po-${Date.now()}`,
        user_id: user?.id ?? 'local',
        media_type: mediaType,
        tmdb_id: tmdbId,
        source: 'upload',
        custom_url: finalUrl,
        tmdb_poster_path: null,
        created_at: now,
        updated_at: now,
      };
      await saveLocalOverrides([...overrides, newItem]);
    }
  }, [overrides, user?.id, saveLocalOverrides]);

  const setTMDBPoster = useCallback(async (
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    posterPath: string
  ) => {
    const now = new Date().toISOString();
    const existing = overrides.find(o => o.tmdb_id === tmdbId && o.media_type === mediaType);

    if (isSupabaseConfigured && user?.id) {
      try {
        if (existing) {
          const { error } = await supabase
            .from('user_poster_overrides')
            .update({ source: 'tmdb', tmdb_poster_path: posterPath, custom_url: null, updated_at: now })
            .eq('user_id', user.id)
            .eq('tmdb_id', tmdbId)
            .eq('media_type', mediaType);
          if (!error) {
            const updated = overrides.map(o =>
              o.tmdb_id === tmdbId && o.media_type === mediaType
                ? { ...o, source: 'tmdb' as const, tmdb_poster_path: posterPath, custom_url: null, updated_at: now }
                : o
            );
            await saveLocalOverrides(updated);
            return;
          }
        } else {
          const { data, error } = await supabase
            .from('user_poster_overrides')
            .insert({
              user_id: user.id,
              media_type: mediaType,
              tmdb_id: tmdbId,
              source: 'tmdb',
              custom_url: null,
              tmdb_poster_path: posterPath,
            })
            .select()
            .single();
          if (!error && data) {
            const newItem: PosterOverride = {
              id: data.id,
              user_id: data.user_id,
              media_type: data.media_type,
              tmdb_id: data.tmdb_id,
              source: 'tmdb',
              custom_url: null,
              tmdb_poster_path: posterPath,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
            await saveLocalOverrides([...overrides, newItem]);
            return;
          }
        }
      } catch (e) {
        console.log('[PosterOverride] Supabase TMDB save failed, using local:', e);
      }
    }

    if (existing) {
      const updated = overrides.map(o =>
        o.tmdb_id === tmdbId && o.media_type === mediaType
          ? { ...o, source: 'tmdb' as const, tmdb_poster_path: posterPath, custom_url: null, updated_at: now }
          : o
      );
      await saveLocalOverrides(updated);
    } else {
      const newItem: PosterOverride = {
        id: `po-${Date.now()}`,
        user_id: user?.id ?? 'local',
        media_type: mediaType,
        tmdb_id: tmdbId,
        source: 'tmdb',
        custom_url: null,
        tmdb_poster_path: posterPath,
        created_at: now,
        updated_at: now,
      };
      await saveLocalOverrides([...overrides, newItem]);
    }
  }, [overrides, user?.id, saveLocalOverrides]);

  const resetPoster = useCallback(async (tmdbId: number, mediaType: 'movie' | 'tv') => {
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase
          .from('user_poster_overrides')
          .delete()
          .eq('user_id', user.id)
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType);
      } catch (e) {
        console.log('[PosterOverride] Supabase reset failed:', e);
      }
    }
    const updated = overrides.filter(o => !(o.tmdb_id === tmdbId && o.media_type === mediaType));
    await saveLocalOverrides(updated);
  }, [overrides, user?.id, saveLocalOverrides]);

  return {
    overrides,
    loadOverrides,
    getPosterUrl,
    setUploadPoster,
    setTMDBPoster,
    resetPoster,
  };
});