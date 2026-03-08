import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityRating, CommunityStats, ContentView, CommunityContentType } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const RATINGS_KEY = 'plus_community_ratings';
const VIEWS_KEY = 'plus_community_views';

function generateContentId(tmdbId: number, contentType: CommunityContentType, seasonNumber?: number): string {
  if (contentType === 'season' && seasonNumber != null) {
    return `${contentType}-${tmdbId}-s${seasonNumber}`;
  }
  return `${contentType}-${tmdbId}`;
}

export const [CommunityRatingProvider, useCommunityRating] = createContextHook(() => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<CommunityRating[]>([]);
  const [views, setViews] = useState<ContentView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (isSupabaseConfigured) {
      await loadFromSupabase();
    } else {
      await loadFromLocal();
    }
    setIsLoading(false);
  };

  const loadFromSupabase = async () => {
    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('community_ratings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (ratingsError) {
        console.error('[CommunityRating] Supabase ratings load error:', ratingsError);
        await loadFromLocal();
        return;
      }

      if (ratingsData) {
        const items: CommunityRating[] = ratingsData.map((r: any) => ({
          content_id: r.content_id,
          content_type: r.content_type,
          tmdb_id: r.tmdb_id,
          parent_id: r.parent_id,
          season_number: r.season_number,
          episode_number: r.episode_number,
          user_id: r.user_id,
          rating: Number(r.rating),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        setRatings(items);
        console.log('[CommunityRating] Loaded from Supabase:', items.length);
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: viewsData } = await supabase
        .from('content_views')
        .select('*')
        .gte('viewed_at', twentyFourHoursAgo)
        .limit(1000);

      if (viewsData) {
        const items: ContentView[] = viewsData.map((v: any) => ({
          content_id: v.content_id,
          viewer_id: v.viewer_id,
          viewed_at: v.viewed_at,
        }));
        setViews(items);
        console.log('[CommunityRating] Views loaded from Supabase:', items.length);
      }
    } catch (e) {
      console.error('[CommunityRating] Supabase load error, falling back to local:', e);
      await loadFromLocal();
    }
  };

  const loadFromLocal = async () => {
    try {
      const [rtData, vwData] = await Promise.all([
        AsyncStorage.getItem(RATINGS_KEY),
        AsyncStorage.getItem(VIEWS_KEY),
      ]);
      if (rtData) setRatings(JSON.parse(rtData));
      if (vwData) setViews(JSON.parse(vwData));
    } catch (e) {
      console.error('[CommunityRating] Local load error:', e);
    }
  };

  const saveRatingsLocal = async (items: CommunityRating[]) => {
    setRatings(items);
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(items));
  };

  const saveViewsLocal = async (items: ContentView[]) => {
    setViews(items);
    await AsyncStorage.setItem(VIEWS_KEY, JSON.stringify(items));
  };

  const rateCommunity = useCallback(async (
    tmdbId: number,
    contentType: CommunityContentType,
    score: number,
    seasonNumber?: number,
  ) => {
    const userId = user?.id ?? 'anonymous';
    const contentId = generateContentId(tmdbId, contentType, seasonNumber);
    const now = new Date().toISOString();

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data: existing } = await supabase
          .from('community_ratings')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', user.id)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('community_ratings')
            .update({ rating: score, updated_at: now })
            .eq('id', existing.id);
          if (error) throw error;
          setRatings(prev => prev.map(r =>
            r.content_id === contentId && r.user_id === user.id
              ? { ...r, rating: score, updated_at: now }
              : r
          ));
        } else {
          const { error } = await supabase
            .from('community_ratings')
            .insert({
              content_id: contentId,
              content_type: contentType,
              tmdb_id: tmdbId,
              season_number: seasonNumber,
              user_id: user.id,
              rating: score,
            });
          if (error) throw error;
          const newRating: CommunityRating = {
            content_id: contentId,
            content_type: contentType,
            tmdb_id: tmdbId,
            season_number: seasonNumber,
            user_id: user.id,
            rating: score,
            created_at: now,
            updated_at: now,
          };
          setRatings(prev => [...prev, newRating]);
        }
        console.log('[CommunityRating] Rating synced to Supabase:', contentId, score);
        return;
      } catch (e) {
        console.error('[CommunityRating] Supabase rate error:', e);
      }
    }

    const existing = ratings.find(r => r.content_id === contentId && r.user_id === userId);
    if (existing) {
      const updated = ratings.map(r =>
        r.content_id === contentId && r.user_id === userId
          ? { ...r, rating: score, updated_at: now }
          : r
      );
      await saveRatingsLocal(updated);
    } else {
      const newRating: CommunityRating = {
        content_id: contentId,
        content_type: contentType,
        tmdb_id: tmdbId,
        season_number: seasonNumber,
        user_id: userId,
        rating: score,
        created_at: now,
        updated_at: now,
      };
      await saveRatingsLocal([...ratings, newRating]);
    }
    console.log('[CommunityRating] Rating saved locally:', contentId, score);
  }, [ratings, user?.id]);

  const getUserRating = useCallback((
    tmdbId: number,
    contentType: CommunityContentType,
    seasonNumber?: number,
  ): number | null => {
    const userId = user?.id ?? 'anonymous';
    const contentId = generateContentId(tmdbId, contentType, seasonNumber);
    return ratings.find(r => r.content_id === contentId && r.user_id === userId)?.rating ?? null;
  }, [ratings, user?.id]);

  const getStats = useCallback((
    tmdbId: number,
    contentType: CommunityContentType,
    seasonNumber?: number,
  ): CommunityStats => {
    const contentId = generateContentId(tmdbId, contentType, seasonNumber);
    const contentRatings = ratings.filter(r => r.content_id === contentId);
    const count = contentRatings.length;
    const avg = count > 0
      ? contentRatings.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const recentViews = views.filter(
      v => v.content_id === contentId && new Date(v.viewed_at).getTime() > twentyFourHoursAgo
    );
    const uniqueViewers = new Set(recentViews.map(v => v.viewer_id));

    return {
      content_id: contentId,
      rating_avg: Math.round(avg * 10) / 10,
      rating_count: count,
      views_unique_24h: uniqueViewers.size,
    };
  }, [ratings, views]);

  const trackView = useCallback(async (
    tmdbId: number,
    contentType: CommunityContentType,
    seasonNumber?: number,
  ) => {
    const viewerId = user?.id ?? `device-${Math.random().toString(36).substring(2, 10)}`;
    const contentId = generateContentId(tmdbId, contentType, seasonNumber);
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const alreadyViewed = views.some(
      v => v.content_id === contentId
        && v.viewer_id === viewerId
        && new Date(v.viewed_at).getTime() > twentyFourHoursAgo
    );

    if (alreadyViewed) {
      console.log('[CommunityRating] View already tracked (24h):', contentId);
      return;
    }

    const newView: ContentView = {
      content_id: contentId,
      viewer_id: viewerId,
      viewed_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('content_views').insert({
          content_id: contentId,
          viewer_id: viewerId,
        });
        if (error) throw error;
        console.log('[CommunityRating] View tracked in Supabase:', contentId);
      } catch (e) {
        console.error('[CommunityRating] Supabase view track error:', e);
      }
    }

    const cleanedViews = views.filter(v => new Date(v.viewed_at).getTime() > twentyFourHoursAgo);
    if (isSupabaseConfigured) {
      setViews([...cleanedViews, newView]);
    } else {
      await saveViewsLocal([...cleanedViews, newView]);
    }
    console.log('[CommunityRating] View tracked:', contentId);
  }, [views, user?.id]);

  return {
    ratings,
    views,
    isLoading,
    rateCommunity,
    getUserRating,
    getStats,
    trackView,
  };
});