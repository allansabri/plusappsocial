import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '@/types';
import { mockPosts } from '@/mocks/feed';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const POSTS_STORAGE_KEY = 'plus_user_posts';
const DRAFTS_STORAGE_KEY = 'plus_user_drafts';
const PINNED_STORAGE_KEY = 'plus_pinned_post';

export interface PostNotification {
  id: string;
  type: 'published' | 'draft_saved';
  message: string;
  postId: string;
  timestamp: string;
  read: boolean;
}

export const [PostProvider, usePosts] = createContextHook(() => {
  const { profile } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [postNotifications, setPostNotifications] = useState<PostNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [profile?.id]);

  const loadFromStorage = async () => {
    if (isSupabaseConfigured && profile?.id) {
      await loadFromSupabase();
    } else {
      await loadFromLocal();
    }
    setIsLoaded(true);
  };

  const loadFromSupabase = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (postsError) {
        console.error('[PostProvider] Supabase posts load error:', postsError);
        await loadFromLocal();
        return;
      }

      if (postsData) {
        const posts: Post[] = postsData.map((p: any) => mapSupabasePost(p));
        setUserPosts(posts);
        console.log('[PostProvider] Loaded posts from Supabase:', posts.length);
      }

      const { data: draftsData } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('user_id', profile!.id)
        .eq('is_draft', true)
        .order('created_at', { ascending: false });

      if (draftsData) {
        const d: Post[] = draftsData.map((p: any) => mapSupabasePost(p));
        setDrafts(d);
        console.log('[PostProvider] Loaded drafts from Supabase:', d.length);
      }
    } catch (e) {
      console.error('[PostProvider] Supabase load error, falling back to local:', e);
      await loadFromLocal();
    }
  };

  const mapSupabasePost = (p: any): Post => ({
    id: p.id,
    user_id: p.user_id,
    content: p.content || '',
    image_url: p.image_url,
    photos: p.photos || [],
    video_url: p.video_url,
    tmdb_id: p.tmdb_id,
    tmdb_type: p.tmdb_type,
    tmdb_title: p.tmdb_title,
    tmdb_poster: p.tmdb_poster,
    tmdb_season: p.tmdb_season,
    tmdb_episode: p.tmdb_episode,
    has_spoiler: p.has_spoiler,
    created_at: p.created_at,
    updated_at: p.updated_at,
    profiles: p.profiles ? {
      id: p.profiles.id,
      username: p.profiles.username,
      display_name: p.profiles.display_name,
      avatar_url: p.profiles.avatar_url,
      banner_url: p.profiles.banner_url ?? null,
      bio: p.profiles.bio,
      created_at: p.profiles.created_at,
    } : undefined,
    likes_count: p.likes_count ?? 0,
    comments_count: p.comments_count ?? 0,
    reposts_count: p.reposts_count ?? 0,
    is_liked: false,
    is_pinned: p.is_pinned ?? false,
    is_draft: p.is_draft ?? false,
    rating: p.rating ? Number(p.rating) : undefined,
    views_count: p.views_count ?? 0,
    watch_date: p.watch_date,
    quote_text: p.quote_text,
  });

  const loadFromLocal = async () => {
    try {
      const [postsJson, draftsJson, pinnedJson] = await Promise.all([
        AsyncStorage.getItem(POSTS_STORAGE_KEY),
        AsyncStorage.getItem(DRAFTS_STORAGE_KEY),
        AsyncStorage.getItem(PINNED_STORAGE_KEY),
      ]);
      if (postsJson) setUserPosts(JSON.parse(postsJson));
      if (draftsJson) setDrafts(JSON.parse(draftsJson));
      if (pinnedJson) setPinnedPostId(pinnedJson);
      console.log('[PostProvider] Loaded from local storage');
    } catch (e) {
      console.log('[PostProvider] Local load error:', e);
    }
  };

  const persistPosts = useCallback(async (posts: Post[]) => {
    try {
      await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      console.log('[PostProvider] Persist posts error:', e);
    }
  }, []);

  const persistDrafts = useCallback(async (d: Post[]) => {
    try {
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(d));
    } catch (e) {
      console.log('[PostProvider] Persist drafts error:', e);
    }
  }, []);

  const persistPinned = useCallback(async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem(PINNED_STORAGE_KEY, id);
      } else {
        await AsyncStorage.removeItem(PINNED_STORAGE_KEY);
      }
    } catch (e) {
      console.log('[PostProvider] Persist pinned error:', e);
    }
  }, []);

  const addNotification = useCallback((type: PostNotification['type'], message: string, postId: string) => {
    const notif: PostNotification = {
      id: `pn-${Date.now()}`,
      type,
      message,
      postId,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setPostNotifications(prev => [notif, ...prev]);
  }, []);

  const createPost = useCallback((postData: {
    content: string;
    photos?: string[];
    video_url?: string | null;
    tmdb_id?: number | null;
    tmdb_type?: 'movie' | 'tv' | null;
    tmdb_title?: string | null;
    tmdb_poster?: string | null;
    tmdb_season?: number | null;
    tmdb_episode?: number | null;
    has_spoiler?: boolean;
    rating?: number;
    watch_date?: string | null;
  }): Post | null => {
    if (!profile) return null;

    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: profile.id,
      content: postData.content,
      image_url: postData.photos?.[0] ?? null,
      photos: postData.photos ?? [],
      video_url: postData.video_url ?? null,
      tmdb_id: postData.tmdb_id ?? null,
      tmdb_type: postData.tmdb_type ?? null,
      tmdb_title: postData.tmdb_title ?? null,
      tmdb_poster: postData.tmdb_poster ?? null,
      tmdb_season: postData.tmdb_season ?? null,
      tmdb_episode: postData.tmdb_episode ?? null,
      has_spoiler: postData.has_spoiler ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        banner_url: profile.banner_url,
        created_at: profile.created_at,
      },
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      is_liked: false,
      is_pinned: false,
      is_draft: false,
      rating: postData.rating,
      views_count: 0,
      watch_date: postData.watch_date ?? null,
    };

    if (isSupabaseConfigured && profile.id) {
      supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          content: postData.content,
          image_url: postData.photos?.[0] ?? null,
          photos: postData.photos ?? [],
          video_url: postData.video_url ?? null,
          tmdb_id: postData.tmdb_id ?? null,
          tmdb_type: postData.tmdb_type ?? null,
          tmdb_title: postData.tmdb_title ?? null,
          tmdb_poster: postData.tmdb_poster ?? null,
          tmdb_season: postData.tmdb_season ?? null,
          tmdb_episode: postData.tmdb_episode ?? null,
          has_spoiler: postData.has_spoiler ?? false,
          is_draft: false,
          rating: postData.rating ?? null,
          watch_date: postData.watch_date ?? null,
        })
        .select('*, profiles(*)')
        .single()
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error('[PostProvider] Supabase create post error:', error);
          } else if (data) {
            const supaPost = mapSupabasePost(data);
            setUserPosts(prev => [supaPost, ...prev.filter(p => p.id !== newPost.id)]);
            console.log('[PostProvider] Post synced to Supabase:', supaPost.id);
          }
        });
    }

    const updated = [newPost, ...userPosts];
    setUserPosts(updated);
    persistPosts(updated);
    addNotification('published', `Votre publication a été partagée`, newPost.id);
    console.log('[PostProvider] Post created:', newPost.id);
    return newPost;
  }, [profile, userPosts, persistPosts, addNotification]);

  const editPost = useCallback((postId: string, updates: {
    content?: string;
    photos?: string[];
    video_url?: string | null;
    has_spoiler?: boolean;
    rating?: number;
  }) => {
    const updated = userPosts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          ...updates,
          image_url: updates.photos?.[0] ?? p.image_url,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    });
    setUserPosts(updated);
    persistPosts(updated);

    if (isSupabaseConfigured) {
      const supaUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.content !== undefined) supaUpdates.content = updates.content;
      if (updates.photos !== undefined) {
        supaUpdates.photos = updates.photos;
        supaUpdates.image_url = updates.photos[0] ?? null;
      }
      if (updates.video_url !== undefined) supaUpdates.video_url = updates.video_url;
      if (updates.has_spoiler !== undefined) supaUpdates.has_spoiler = updates.has_spoiler;
      if (updates.rating !== undefined) supaUpdates.rating = updates.rating;

      supabase.from('posts').update(supaUpdates).eq('id', postId).then(({ error }: { error: any }) => {
        if (error) console.error('[PostProvider] Supabase edit error:', error);
        else console.log('[PostProvider] Post edit synced to Supabase');
      });
    }

    console.log('[PostProvider] Post edited:', postId);
  }, [userPosts, persistPosts]);

  const deletePost = useCallback((postId: string) => {
    const updated = userPosts.filter(p => p.id !== postId);
    setUserPosts(updated);
    persistPosts(updated);
    if (pinnedPostId === postId) {
      setPinnedPostId(null);
      persistPinned(null);
    }

    if (isSupabaseConfigured) {
      supabase.from('posts').delete().eq('id', postId).then(({ error }: { error: any }) => {
        if (error) console.error('[PostProvider] Supabase delete error:', error);
        else console.log('[PostProvider] Post delete synced to Supabase');
      });
    }

    console.log('[PostProvider] Post deleted:', postId);
  }, [userPosts, persistPosts, pinnedPostId, persistPinned]);

  const pinPost = useCallback((postId: string) => {
    const newPinned = pinnedPostId === postId ? null : postId;
    setPinnedPostId(newPinned);
    persistPinned(newPinned);

    if (isSupabaseConfigured) {
      if (pinnedPostId) {
        supabase.from('posts').update({ is_pinned: false }).eq('id', pinnedPostId).then(() => { /* noop */ });
      }
      if (newPinned) {
        supabase.from('posts').update({ is_pinned: true }).eq('id', newPinned).then(() => { /* noop */ });
      }
    }

    console.log('[PostProvider] Post pinned:', newPinned);
  }, [pinnedPostId, persistPinned]);

  const saveDraft = useCallback((postData: {
    content: string;
    photos?: string[];
    video_url?: string | null;
    tmdb_id?: number | null;
    tmdb_type?: 'movie' | 'tv' | null;
    tmdb_title?: string | null;
    tmdb_poster?: string | null;
    tmdb_season?: number | null;
    tmdb_episode?: number | null;
    has_spoiler?: boolean;
    rating?: number;
  }) => {
    if (!profile) return;

    const draft: Post = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: profile.id,
      content: postData.content,
      image_url: postData.photos?.[0] ?? null,
      photos: postData.photos ?? [],
      video_url: postData.video_url ?? null,
      tmdb_id: postData.tmdb_id ?? null,
      tmdb_type: postData.tmdb_type ?? null,
      tmdb_title: postData.tmdb_title ?? null,
      tmdb_poster: postData.tmdb_poster ?? null,
      tmdb_season: postData.tmdb_season ?? null,
      tmdb_episode: postData.tmdb_episode ?? null,
      has_spoiler: postData.has_spoiler ?? false,
      created_at: new Date().toISOString(),
      profiles: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        banner_url: profile.banner_url,
        created_at: profile.created_at,
      },
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      is_liked: false,
      is_draft: true,
      rating: postData.rating,
      views_count: 0,
    };

    if (isSupabaseConfigured && profile.id) {
      supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          content: postData.content,
          image_url: postData.photos?.[0] ?? null,
          photos: postData.photos ?? [],
          video_url: postData.video_url ?? null,
          tmdb_id: postData.tmdb_id ?? null,
          tmdb_type: postData.tmdb_type ?? null,
          tmdb_title: postData.tmdb_title ?? null,
          tmdb_poster: postData.tmdb_poster ?? null,
          tmdb_season: postData.tmdb_season ?? null,
          tmdb_episode: postData.tmdb_episode ?? null,
          has_spoiler: postData.has_spoiler ?? false,
          is_draft: true,
          rating: postData.rating ?? null,
        })
        .then(({ error }: { error: any }) => {
          if (error) console.error('[PostProvider] Supabase draft save error:', error);
          else console.log('[PostProvider] Draft synced to Supabase');
        });
    }

    const updated = [draft, ...drafts];
    setDrafts(updated);
    persistDrafts(updated);
    addNotification('draft_saved', 'Brouillon enregistré', draft.id);
    console.log('[PostProvider] Draft saved:', draft.id);
  }, [profile, drafts, persistDrafts, addNotification]);

  const deleteDraft = useCallback((draftId: string) => {
    const updated = drafts.filter(d => d.id !== draftId);
    setDrafts(updated);
    persistDrafts(updated);

    if (isSupabaseConfigured) {
      supabase.from('posts').delete().eq('id', draftId).then(({ error }) => {
        if (error) console.error('[PostProvider] Supabase draft delete error:', error);
      });
    }

    console.log('[PostProvider] Draft deleted:', draftId);
  }, [drafts, persistDrafts]);

  const publishDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft || !profile) return null;

    const published: Post = {
      ...draft,
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      is_draft: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedPosts = [published, ...userPosts];
    const updatedDrafts = drafts.filter(d => d.id !== draftId);

    setUserPosts(updatedPosts);
    setDrafts(updatedDrafts);
    persistPosts(updatedPosts);
    persistDrafts(updatedDrafts);

    if (isSupabaseConfigured) {
      supabase.from('posts')
        .update({ is_draft: false, updated_at: new Date().toISOString() })
        .eq('id', draftId)
        .then(({ error }: { error: any }) => {
          if (error) console.error('[PostProvider] Supabase publish draft error:', error);
          else console.log('[PostProvider] Draft published in Supabase');
        });
    }

    addNotification('published', 'Brouillon publié avec succès', published.id);
    console.log('[PostProvider] Draft published:', published.id);
    return published;
  }, [drafts, userPosts, profile, persistPosts, persistDrafts, addNotification]);

  const incrementViews = useCallback((postId: string) => {
    setUserPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, views_count: (p.views_count ?? 0) + 1 };
      }
      return p;
    }));

    if (isSupabaseConfigured) {
      supabase.rpc('increment_post_views', { post_id: postId }).then(({ error }: { error: any }) => {
        if (error) console.log('[PostProvider] Views increment RPC not available:', error.message);
      });
    }
  }, []);

  const allFeedPosts = useMemo(() => {
    const combined = [...userPosts.filter(p => !p.is_draft), ...mockPosts];
    const pinnedPost = pinnedPostId ? combined.find(p => p.id === pinnedPostId) : null;
    const rest = combined.filter(p => p.id !== pinnedPostId);
    rest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (pinnedPost) {
      return [{ ...pinnedPost, is_pinned: true }, ...rest];
    }
    return rest;
  }, [userPosts, pinnedPostId]);

  const myPosts = useMemo(() => {
    if (!profile) return [];
    const mine = userPosts.filter(p => p.user_id === profile.id && !p.is_draft);
    const pinned = pinnedPostId ? mine.find(p => p.id === pinnedPostId) : null;
    const rest = mine.filter(p => p.id !== pinnedPostId);
    rest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (pinned) {
      return [{ ...pinned, is_pinned: true }, ...rest];
    }
    return rest;
  }, [userPosts, profile, pinnedPostId]);

  const myVideoPosts = useMemo(() => {
    if (!profile) return [];
    return userPosts.filter(p => p.user_id === profile.id && p.video_url);
  }, [userPosts, profile]);

  const myPhotoPosts = useMemo(() => {
    if (!profile) return [];
    return userPosts.filter(p => p.user_id === profile.id && p.photos && p.photos.length > 0);
  }, [userPosts, profile]);

  const markNotificationsRead = useCallback(() => {
    setPostNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return {
    allFeedPosts,
    myPosts,
    myVideoPosts,
    myPhotoPosts,
    userPosts,
    drafts,
    pinnedPostId,
    postNotifications,
    isLoaded,
    createPost,
    editPost,
    deletePost,
    pinPost,
    saveDraft,
    deleteDraft,
    publishDraft,
    incrementViews,
    markNotificationsRead,
  };
});