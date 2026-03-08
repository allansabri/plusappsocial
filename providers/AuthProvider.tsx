import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Profile } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured) {
      initSupabaseAuth();
    } else {
      loadLocalSession();
    }
  }, []);

  const initSupabaseAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id });
        await fetchProfile(session.user.id);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
        console.log('[Auth] State changed:', _event);
        if (session?.user) {
          setUser({ id: session.user.id });
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    } catch (e) {
      console.error('[Auth] Supabase init error:', e);
      await loadLocalSession();
    } finally {
      setIsLoading(false);
    }
  };

  const ensureProfile = async (userId: string, username: string, displayName: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      const p: Profile = {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        banner_url: data.banner_url ?? null,
        bio: data.bio,
        created_at: data.created_at,
      };
      setProfile(p);
      console.log('[Auth] Profile created by trigger:', p.username);
      return;
    }

    console.log('[Auth] Trigger did not create profile, inserting manually...');
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 30) || 'user_' + userId.substring(0, 8);
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: safeUsername,
        display_name: displayName || 'New User',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Auth] Manual profile insert error:', insertError);
      const fallbackUsername = 'user_' + userId.substring(0, 12);
      const { data: fallback } = await supabase
        .from('profiles')
        .insert({ id: userId, username: fallbackUsername, display_name: displayName || 'New User' })
        .select()
        .single();
      if (fallback) {
        setProfile({ id: fallback.id, username: fallback.username, display_name: fallback.display_name, avatar_url: fallback.avatar_url, banner_url: fallback.banner_url ?? null, bio: fallback.bio, created_at: fallback.created_at });
      }
      return;
    }

    if (inserted) {
      setProfile({ id: inserted.id, username: inserted.username, display_name: inserted.display_name, avatar_url: inserted.avatar_url, banner_url: inserted.banner_url ?? null, bio: inserted.bio, created_at: inserted.created_at });
      console.log('[Auth] Profile manually created:', inserted.username);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return;
      }

      if (data) {
        const p: Profile = {
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          banner_url: data.banner_url ?? null,
          bio: data.bio,
          created_at: data.created_at,
        };
        setProfile(p);
        console.log('[Auth] Profile loaded:', p.username);
      }
    } catch (e) {
      console.error('[Auth] Profile fetch exception:', e);
    }
  };

  const loadLocalSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('plus_demo_user');
      if (stored) {
        const demoProfile = JSON.parse(stored) as Profile;
        setProfile(demoProfile);
        setUser({ id: demoProfile.id });
      }
    } catch (_e) {
      console.log('[Auth] No local session found');
    }
    setIsLoading(false);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('[Auth] Sign in error:', error.message);
          return { error: error.message };
        }
        if (data.user) {
          setUser({ id: data.user.id });
          await fetchProfile(data.user.id);
        }
        return { error: null };
      } catch (e: any) {
        console.error('[Auth] Sign in exception:', e);
        return { error: e.message || 'Erreur de connexion' };
      }
    }

    const demoProfile: Profile = {
      id: 'demo-user',
      username: 'demo',
      display_name: 'Demo User',
      avatar_url: null,
      banner_url: null,
      bio: 'Exploring PLUS in demo mode',
      created_at: new Date().toISOString(),
    };
    setProfile(demoProfile);
    setUser({ id: demoProfile.id });
    await AsyncStorage.setItem('plus_demo_user', JSON.stringify(demoProfile));
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string, displayName: string) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName,
            },
          },
        });
        if (error) {
          console.error('[Auth] Sign up error:', error.message);
          return { error: error.message };
        }
        if (data.user) {
          setUser({ id: data.user.id });
          await ensureProfile(data.user.id, username, displayName);
        }
        return { error: null };
      } catch (e: any) {
        console.error('[Auth] Sign up exception:', e);
        return { error: e.message || 'Erreur d\'inscription' };
      }
    }

    const demoProfile: Profile = {
      id: `demo-${Date.now()}`,
      username,
      display_name: displayName,
      avatar_url: null,
      banner_url: null,
      bio: null,
      created_at: new Date().toISOString(),
    };
    setProfile(demoProfile);
    setUser({ id: demoProfile.id });
    await AsyncStorage.setItem('plus_demo_user', JSON.stringify(demoProfile));
    return { error: null };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return;

    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);

    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            username: updatedProfile.username,
            display_name: updatedProfile.display_name,
            avatar_url: updatedProfile.avatar_url,
            banner_url: updatedProfile.banner_url,
            bio: updatedProfile.bio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('[Auth] Profile update error:', error);
        } else {
          console.log('[Auth] Profile updated in Supabase');
        }
      } catch (e) {
        console.error('[Auth] Profile update exception:', e);
      }
    }

    await AsyncStorage.setItem('plus_demo_user', JSON.stringify(updatedProfile));
  }, [profile, user]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
        console.log('[Auth] Signed out from Supabase');
      } catch (e) {
        console.error('[Auth] Sign out error:', e);
      }
    }

    setUser(null);
    setProfile(null);
    await AsyncStorage.removeItem('plus_demo_user');
  }, []);

  return {
    session: null,
    user,
    profile,
    isLoading,
    isAuthenticated: Boolean(user),
    isDemoMode: !isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
});