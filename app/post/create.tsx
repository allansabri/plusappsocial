import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Switch, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { X, Send, Search, AlertTriangle } from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { searchMulti, getImageUrl, isTMDBConfigured } from '@/services/tmdb';
import * as Haptics from 'expo-haptics';

interface LinkedMedia {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [linkedMedia, setLinkedMedia] = useState<LinkedMedia | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const sendScale = useRef(new Animated.Value(1)).current;

  const handleSearchMedia = useCallback(async (query: string) => {
    setMediaSearch(query);
    if (query.length < 2 || !isTMDBConfigured) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await searchMulti(query);
      setSearchResults(
        result.results
          .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
          .slice(0, 8)
      );
    } catch (e) {
      console.error('[Post] Search error:', e);
    }
    setSearching(false);
  }, []);

  const handleSelectMedia = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLinkedMedia({
      id: item.id,
      type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
    });
    setShowMediaSearch(false);
    setMediaSearch('');
    setSearchResults([]);
  }, []);

  const handlePost = useCallback(async () => {
    if (!content.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setPosting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setPosting(false);
    console.log('[Post] Created:', { content, hasSpoiler, linkedMedia });
    router.back();
  }, [content, hasSpoiler, linkedMedia, router, sendScale]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerShadowVisible: false,
          title: 'New Post',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                style={[styles.postBtn, !content.trim() && styles.postBtnDisabled]}
                onPress={handlePost}
                disabled={!content.trim() || posting}
                activeOpacity={0.7}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={Colors.dark.background} />
                ) : (
                  <Send size={16} color={Colors.dark.background} />
                )}
                <Text style={styles.postBtnText}>Post</Text>
              </TouchableOpacity>
            </Animated.View>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={100}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <View style={styles.composerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.composerName}>{profile?.display_name ?? 'User'}</Text>
              <Text style={styles.composerHandle}>@{profile?.username ?? 'user'}</Text>
            </View>
          </View>

          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What are you watching?"
            placeholderTextColor={Colors.dark.textTertiary}
            multiline
            maxLength={500}
            autoFocus
            textAlignVertical="top"
            testID="post-content"
          />

          <Text style={styles.charCount}>{content.length}/500</Text>

          {linkedMedia && (
            <View style={styles.linkedMedia}>
              {linkedMedia.poster_path ? (
                <Image
                  source={{ uri: getImageUrl(linkedMedia.poster_path, 'w92') ?? '' }}
                  style={styles.linkedPoster}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.linkedPoster, styles.linkedPosterPlaceholder]}>
                  <Text>🎬</Text>
                </View>
              )}
              <View style={styles.linkedInfo}>
                <Text style={styles.linkedTitle} numberOfLines={1}>{linkedMedia.title}</Text>
                <Text style={styles.linkedType}>{linkedMedia.type === 'tv' ? 'TV Series' : 'Movie'}</Text>
              </View>
              <TouchableOpacity onPress={() => setLinkedMedia(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={16} color={Colors.dark.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionsSection}>
            {isTMDBConfigured && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowMediaSearch(!showMediaSearch)}
                activeOpacity={0.7}
              >
                <Search size={18} color={Colors.dark.blue} />
                <Text style={styles.optionText}>Link a movie or series</Text>
              </TouchableOpacity>
            )}

            {showMediaSearch && (
              <View style={styles.mediaSearchContainer}>
                <TextInput
                  style={styles.mediaSearchInput}
                  value={mediaSearch}
                  onChangeText={handleSearchMedia}
                  placeholder="Search title..."
                  placeholderTextColor={Colors.dark.textTertiary}
                  autoFocus
                />
                {searching && <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 8 }} />}
                {searchResults.map((item: any) => (
                  <TouchableOpacity
                    key={`${item.media_type}-${item.id}`}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectMedia(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                    <Text style={styles.searchResultType}>
                      {item.media_type === 'tv' ? 'TV' : 'Movie'} · {(item.release_date || item.first_air_date || '').substring(0, 4)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.spoilerRow}>
              <AlertTriangle size={18} color={Colors.dark.warning} />
              <Text style={styles.optionText}>Contains spoilers</Text>
              <Switch
                value={hasSpoiler}
                onValueChange={setHasSpoiler}
                trackColor={{ false: Colors.dark.border, true: Colors.dark.primaryDim }}
                thumbColor={hasSpoiler ? Colors.dark.primary : Colors.dark.textTertiary}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  flex: {
    flex: 1,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  composerName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  composerHandle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  textInput: {
    color: Colors.dark.text,
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    minHeight: 120,
  },
  charCount: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  linkedMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    gap: 10,
  },
  linkedPoster: {
    width: 36,
    height: 52,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardElevated,
  },
  linkedPosterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedInfo: {
    flex: 1,
  },
  linkedTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  linkedType: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  optionsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
    paddingTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  optionText: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
  },
  spoilerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  mediaSearchContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  mediaSearchInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderLight,
  },
  searchResultTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  searchResultType: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});