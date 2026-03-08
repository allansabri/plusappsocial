import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, FlatList,
} from 'react-native';
import {
  ArrowLeft, MessageCircle, Crown, Flame,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { usePosts } from '@/providers/PostProvider';
import { useAuth } from '@/providers/AuthProvider';
import PostCard from '@/components/PostCard';
import { Post } from '@/types';
import * as Haptics from 'expo-haptics';

const BANNER_HEIGHT = 180;

type UserTab = 'posts' | 'media' | 'likes';

const USER_TABS: { key: UserTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'media', label: 'Médias' },
  { key: 'likes', label: 'J\'aime' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allFeedPosts } = usePosts();
  const { profile: myProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<UserTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = myProfile?.id === id;

  const userPosts = useMemo(() =>
    allFeedPosts.filter(p => p.user_id === id),
    [allFeedPosts, id]
  );

  const userProfile = useMemo(() => {
    if (isOwnProfile && myProfile) return myProfile;
    const postWithProfile = allFeedPosts.find(p => p.user_id === id && p.profiles);
    return postWithProfile?.profiles ?? null;
  }, [allFeedPosts, id, isOwnProfile, myProfile]);

  const mediaPosts = useMemo(() =>
    userPosts.filter(p => (p.photos && p.photos.length > 0) || p.video_url),
    [userPosts]
  );

  const toggleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFollowing(prev => !prev);
  }, []);

  const initial = userProfile?.display_name?.charAt(0)?.toUpperCase() ?? '?';

  const mockStats = useMemo(() => {
    const seed = (id ?? '').length;
    return {
      following: 120 + seed * 37,
      followers: 890 + seed * 113,
      posts: userPosts.length,
      films: 25 + seed * 7,
      series: 12 + seed * 3,
    };
  }, [userPosts.length, id]);

  const bannerSource = userProfile?.banner_url
    ? { uri: userProfile.banner_url }
    : { uri: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80' };

  const renderPostItem = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} />
  ), []);

  const renderEmptyState = useCallback((title: string, subtitle: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  ), []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts.length > 0 ? (
          <FlatList
            data={userPosts}
            renderItem={renderPostItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : renderEmptyState('Aucun post', 'Cet utilisateur n\'a pas encore publié');

      case 'media':
        return mediaPosts.length > 0 ? (
          <FlatList
            data={mediaPosts}
            renderItem={renderPostItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : renderEmptyState('Aucun média', 'Aucune photo ou vidéo publiée');

      case 'likes':
        return renderEmptyState('J\'aime', 'Les posts aimés par cet utilisateur');

      default:
        return null;
    }
  };

  if (!userProfile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBackBtn} hitSlop={12}>
            <ArrowLeft size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Profil</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Utilisateur introuvable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        <View style={styles.bannerContainer}>
          <Image source={bannerSource} style={styles.bannerImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.6)', Colors.dark.background]}
            style={styles.bannerGradient}
          />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarSquare}>
              {userProfile.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>

            {!isOwnProfile && (
              <View style={styles.avatarRowRight}>
                <TouchableOpacity style={styles.messageIconBtn} activeOpacity={0.7}>
                  <MessageCircle size={18} color={Colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.followActionBtn, isFollowing && styles.followActionBtnActive]}
                  onPress={toggleFollow}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.followActionBtnText, isFollowing && styles.followActionBtnTextActive]}>
                    {isFollowing ? 'Suivi' : 'Suivre'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isOwnProfile && (
              <View style={styles.avatarRowRight}>
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => router.push('/(tabs)/profile' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editProfileBtnText}>Modifier</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.displayName}>{userProfile.display_name}</Text>
            <Text style={styles.username}>@{userProfile.username}</Text>
          </View>

          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Crown size={12} color={Colors.dark.gold} />
              <Text style={styles.levelBadgeText}>Niv. {5 + ((id ?? '').length % 15)}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Flame size={12} color={Colors.dark.accent} />
              <Text style={styles.streakBadgeText}>{3 + ((id ?? '').length % 25)}j</Text>
            </View>
          </View>

          <View style={styles.followStats}>
            <TouchableOpacity style={styles.followStatItem} activeOpacity={0.6}>
              <Text style={styles.followNumber}>{mockStats.following}</Text>
              <Text style={styles.followLabel}> Suivi</Text>
            </TouchableOpacity>
            <View style={styles.followStatDot} />
            <TouchableOpacity style={styles.followStatItem} activeOpacity={0.6}>
              <Text style={styles.followNumber}>{mockStats.followers.toLocaleString()}</Text>
              <Text style={styles.followLabel}> Abonnés</Text>
            </TouchableOpacity>
          </View>

          {userProfile.bio ? (
            <Text style={styles.bioText}>{userProfile.bio}</Text>
          ) : null}

          <View style={styles.mediaStatsRow}>
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{mockStats.films}</Text>
              <Text style={styles.mediaStatLabel}>Films</Text>
            </View>
            <View style={styles.mediaStatDivider} />
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{mockStats.series}</Text>
              <Text style={styles.mediaStatLabel}>Séries</Text>
            </View>
            <View style={styles.mediaStatDivider} />
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{mockStats.posts}</Text>
              <Text style={styles.mediaStatLabel}>Posts</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}
        >
          {USER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabItemText, activeTab === tab.key && styles.tabItemTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
  },
  navBackBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  navTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: Colors.dark.textSecondary, fontSize: 15 },

  bannerContainer: { height: BANNER_HEIGHT, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_HEIGHT * 0.6 },
  backBtn: {
    position: 'absolute', left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  profileSection: { paddingHorizontal: 16, marginTop: -40 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatarSquare: {
    width: 80, height: 80, borderRadius: 14,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.dark.background, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' as const },
  avatarRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  messageIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.dark.border,
    alignItems: 'center', justifyContent: 'center',
  },
  followActionBtn: {
    paddingHorizontal: 22, paddingVertical: 9,
    borderRadius: 20, backgroundColor: Colors.dark.primary,
  },
  followActionBtnActive: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.dark.border,
  },
  followActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  followActionBtnTextActive: { color: Colors.dark.text },
  editProfileBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.border,
  },
  editProfileBtnText: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },

  nameSection: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  displayName: { color: Colors.dark.text, fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
  username: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '400' as const },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.dark.goldLight,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  levelBadgeText: { color: Colors.dark.gold, fontSize: 11, fontWeight: '700' as const },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.dark.accentLight,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14,
  },
  streakBadgeText: { color: Colors.dark.accent, fontSize: 11, fontWeight: '700' as const },

  followStats: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  followStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  followNumber: { color: Colors.dark.text, fontSize: 14, fontWeight: '700' as const },
  followLabel: { color: Colors.dark.textSecondary, fontSize: 14 },
  followStatDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.dark.textTertiary },

  bioText: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },

  mediaStatsRow: { flexDirection: 'row', marginTop: 16, paddingVertical: 4 },
  mediaStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  mediaStatValue: { color: Colors.dark.text, fontSize: 18, fontWeight: '800' as const },
  mediaStatLabel: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: '500' as const },
  mediaStatDivider: { width: 1, backgroundColor: Colors.dark.border, marginVertical: 4 },

  tabsScroll: { marginTop: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border },
  tabsContainer: { paddingHorizontal: 16, gap: 0 },
  tabItem: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Colors.dark.primary },
  tabItemText: { color: Colors.dark.textTertiary, fontSize: 14, fontWeight: '500' as const },
  tabItemTextActive: { color: Colors.dark.text, fontWeight: '700' as const },

  tabContent: { minHeight: 300 },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 40, gap: 8,
  },
  emptyTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '600' as const },
  emptySubtitle: { color: Colors.dark.textSecondary, fontSize: 13, textAlign: 'center' as const, lineHeight: 18 },
});