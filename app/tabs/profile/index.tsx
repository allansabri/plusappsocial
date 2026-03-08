import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, FlatList, Modal, TextInput, Alert,
} from 'react-native';
import {
  LogOut, Film, Tv, ChevronRight, Settings, Pencil,
  MessageCircle, ArrowLeft, Check, BookmarkPlus, Play, Image as ImageIcon,
  Video, MessageSquare, Clock, Camera, X, FileText,
  BookOpen, BarChart3, Trophy, Flame, Target, Crown,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { useWatchlist } from '@/providers/WatchlistProvider';
import { usePosts } from '@/providers/PostProvider';
import { useGamification } from '@/providers/GamificationProvider';
import { useSocial } from '@/providers/SocialProvider';
import { usePosterOverride } from '@/providers/PosterOverrideProvider';
import { useRouter } from 'expo-router';
import { getImageUrl } from '@/services/tmdb';
import * as Haptics from 'expo-haptics';
import PostCard from '@/components/PostCard';
import PosterPickerSheet from '@/components/PosterPickerSheet';
import TMDBPosterPicker from '@/components/TMDBPosterPicker';
import { Post, WatchlistItem } from '@/types';
import { MOOD_OPTIONS } from '@/mocks/social';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

type ProfileTab = 'posts' | 'watched' | 'watchlist' | 'in_progress' | 'replies' | 'videos' | 'photos';

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'watched', label: 'Regardé' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'replies', label: 'Réponses' },
  { key: 'videos', label: 'Vidéos' },
  { key: 'photos', label: 'Photos' },
];

interface PosterPickerTarget {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut, isAuthenticated, updateProfile } = useAuth();
  const { wantToWatch, watched, watchedEpisodes, watchlist } = useWatchlist();
  const { myPosts: userPosts, myVideoPosts: videoPosts, myPhotoPosts: photoPosts, drafts } = usePosts();
  const { level, levelProgress, earnedBadges, streak } = useGamification();
  const { mood, updateMood, clearMood } = useSocial();
  const { getPosterUrl, loadOverrides } = usePosterOverride();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [expandedInProgress, setExpandedInProgress] = useState<number | null>(null);

  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [editBannerUri, setEditBannerUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [posterPickerTarget, setPosterPickerTarget] = useState<PosterPickerTarget | null>(null);
  const [tmdbPickerTarget, setTmdbPickerTarget] = useState<PosterPickerTarget | null>(null);

  useEffect(() => {
    void loadOverrides();
  }, [loadOverrides]);

  const handleSignOut = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/auth/login' as any);
  }, [signOut, router]);

  const toggleFollow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFollowing(prev => !prev);
  }, []);

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? '?';
  const movieCount = watched.filter(w => w.tmdb_type === 'movie').length;
  const seriesCount = watched.filter(w => w.tmdb_type === 'tv').length;
  const totalHours = movieCount * 2 + seriesCount * 12;

  const inProgressSeries = useMemo(() => {
    const seriesWithWatchedEps = new Map<number, WatchlistItem>();
    for (const item of watchlist) {
      if (item.tmdb_type === 'tv') {
        const hasWatchedEps = watchedEpisodes.some(e => e.seriesId === item.tmdb_id);
        const isFullyWatched = item.status === 'watched';
        if (hasWatchedEps && !isFullyWatched) {
          seriesWithWatchedEps.set(item.tmdb_id, item);
        }
      }
    }
    const seriesInWatchlist = watchlist.filter(w => w.tmdb_type === 'tv' && w.status === 'watching');
    for (const item of seriesInWatchlist) {
      seriesWithWatchedEps.set(item.tmdb_id, item);
    }
    return Array.from(seriesWithWatchedEps.values());
  }, [watchlist, watchedEpisodes]);

  const navigateToMedia = useCallback((tmdbId: number, tmdbType: 'movie' | 'tv') => {
    router.push(`/media/${tmdbId}?type=${tmdbType}` as any);
  }, [router]);

  const openEditModal = useCallback(() => {
    if (!profile) return;
    setEditDisplayName(profile.display_name);
    setEditBio(profile.bio ?? '');
    setEditAvatarUri(profile.avatar_url);
    setEditBannerUri(profile.banner_url ?? null);
    setEditModalVisible(true);
  }, [profile]);

  const pickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setEditAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[Profile] Avatar pick error:', e);
    }
  }, []);

  const pickBanner = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setEditBannerUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[Profile] Banner pick error:', e);
    }
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: editDisplayName.trim() || profile.display_name,
        bio: editBio.trim() || null,
        avatar_url: editAvatarUri,
        banner_url: editBannerUri,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    } catch (e) {
      console.error('[Profile] Save error:', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setIsSaving(false);
    }
  }, [profile, editDisplayName, editBio, editAvatarUri, editBannerUri, updateProfile]);

  const toggleInProgressExpand = useCallback((tmdbId: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedInProgress(prev => prev === tmdbId ? null : tmdbId);
  }, []);

  const handleMoodSelect = useCallback((option: { emoji: string; label: string }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void updateMood({
      emoji: option.emoji,
      label: option.label,
      updatedAt: new Date().toISOString(),
    });
    setMoodModalVisible(false);
  }, [updateMood]);

  const handleLongPressItem = useCallback((item: WatchlistItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosterPickerTarget({
      tmdbId: item.tmdb_id,
      mediaType: item.tmdb_type,
      title: item.tmdb_title,
    });
  }, []);

  const getPosterSource = useCallback((item: WatchlistItem): string | null => {
    const override = getPosterUrl(item.tmdb_id, item.tmdb_type);
    if (override) return override;
    return item.tmdb_poster ? getImageUrl(item.tmdb_poster, 'w342') : null;
  }, [getPosterUrl]);

  const renderWatchedItem = useCallback(({ item }: { item: WatchlistItem }) => {
    const posterSource = getPosterSource(item);
    return (
      <TouchableOpacity
        style={styles.mediaGridItem}
        activeOpacity={0.7}
        onPress={() => navigateToMedia(item.tmdb_id, item.tmdb_type)}
        onLongPress={() => handleLongPressItem(item)}
        delayLongPress={400}
        testID={`watched-item-${item.tmdb_id}`}
      >
        {posterSource ? (
          <Image
            source={{ uri: posterSource }}
            style={styles.mediaGridPoster}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.mediaGridPoster, styles.mediaGridPlaceholder]}>
            <Film size={24} color={Colors.dark.textTertiary} />
          </View>
        )}
        <View style={styles.mediaGridInfo}>
          <Text style={styles.mediaGridTitle} numberOfLines={2}>{item.tmdb_title}</Text>
          <View style={styles.mediaGridBadge}>
            <Text style={styles.mediaGridBadgeText}>
              {item.tmdb_type === 'movie' ? 'Film' : 'Série'}
            </Text>
          </View>
        </View>
        <View style={styles.watchedCheckBadge}>
          <Check size={12} color="#fff" strokeWidth={3} />
        </View>
        {getPosterUrl(item.tmdb_id, item.tmdb_type) && (
          <View style={styles.customPosterBadge}>
            <ImageIcon size={9} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigateToMedia, handleLongPressItem, getPosterSource, getPosterUrl]);

  const renderWatchlistItem = useCallback(({ item }: { item: WatchlistItem }) => {
    const posterSource = getPosterSource(item);
    return (
      <TouchableOpacity
        style={styles.mediaGridItem}
        activeOpacity={0.7}
        onPress={() => navigateToMedia(item.tmdb_id, item.tmdb_type)}
        onLongPress={() => handleLongPressItem(item)}
        delayLongPress={400}
        testID={`watchlist-item-${item.tmdb_id}`}
      >
        {posterSource ? (
          <Image
            source={{ uri: posterSource }}
            style={styles.mediaGridPoster}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.mediaGridPoster, styles.mediaGridPlaceholder]}>
            <Film size={24} color={Colors.dark.textTertiary} />
          </View>
        )}
        <View style={styles.mediaGridInfo}>
          <Text style={styles.mediaGridTitle} numberOfLines={2}>{item.tmdb_title}</Text>
          <View style={[styles.mediaGridBadge, item.tmdb_type === 'tv' && styles.mediaGridBadgeTv]}>
            <Text style={styles.mediaGridBadgeText}>
              {item.tmdb_type === 'movie' ? 'Film' : 'Série'}
            </Text>
          </View>
        </View>
        {getPosterUrl(item.tmdb_id, item.tmdb_type) && (
          <View style={styles.customPosterBadge}>
            <ImageIcon size={9} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigateToMedia, handleLongPressItem, getPosterSource, getPosterUrl]);

  const renderInProgressItem = useCallback(({ item }: { item: WatchlistItem }) => {
    const epsWatched = watchedEpisodes.filter(e => e.seriesId === item.tmdb_id).length;
    const isExpanded = expandedInProgress === item.tmdb_id;
    const epsForSeries = watchedEpisodes.filter(e => e.seriesId === item.tmdb_id);
    const lastWatchedSeason = epsForSeries.length > 0
      ? Math.max(...epsForSeries.map(e => e.seasonNumber))
      : 1;
    const lastWatchedEp = epsForSeries.length > 0
      ? Math.max(...epsForSeries.filter(e => e.seasonNumber === lastWatchedSeason).map(e => e.episodeNumber))
      : 0;
    const posterSource = getPosterSource(item);

    return (
      <View>
        <TouchableOpacity
          style={styles.inProgressCard}
          activeOpacity={0.7}
          onPress={() => toggleInProgressExpand(item.tmdb_id)}
          onLongPress={() => handleLongPressItem(item)}
          delayLongPress={400}
        >
          {posterSource ? (
            <Image
              source={{ uri: posterSource }}
              style={styles.inProgressPoster}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.inProgressPoster, styles.mediaGridPlaceholder]}>
              <Tv size={20} color={Colors.dark.textTertiary} />
            </View>
          )}
          <View style={styles.inProgressInfo}>
            <Text style={styles.inProgressTitle} numberOfLines={1}>{item.tmdb_title}</Text>
            <Text style={styles.inProgressEps}>
              {epsWatched} épisode{epsWatched > 1 ? 's' : ''} vu{epsWatched > 1 ? 's' : ''}
            </Text>
            <Text style={styles.inProgressRemaining}>
              Dernier vu : S{lastWatchedSeason} E{lastWatchedEp}
            </Text>
            <View style={styles.inProgressBar}>
              <View style={[styles.inProgressFill, { width: `${Math.min(epsWatched * 10, 90)}%` }]} />
            </View>
          </View>
          <ChevronRight size={18} color={Colors.dark.textTertiary} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.inProgressExpandedPanel}>
            <View style={styles.inProgressExpandedRow}>
              <Clock size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.inProgressExpandedText}>Il vous reste des épisodes à regarder</Text>
            </View>
            <TouchableOpacity
              style={styles.inProgressDetailBtn}
              activeOpacity={0.7}
              onPress={() => navigateToMedia(item.tmdb_id, 'tv')}
            >
              <Text style={styles.inProgressDetailBtnText}>Voir la série</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [watchedEpisodes, expandedInProgress, toggleInProgressExpand, navigateToMedia, handleLongPressItem, getPosterSource]);

  const renderPostItem = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} />
  ), []);

  const renderEmptyState = useCallback((icon: React.ReactNode, title: string, subtitle: string) => (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  ), []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts.length > 0 ? (
          <FlatList data={userPosts} renderItem={renderPostItem} keyExtractor={item => item.id} scrollEnabled={false} />
        ) : renderEmptyState(<MessageCircle size={40} color={Colors.dark.textTertiary} />, 'Aucun post', 'Vos publications apparaîtront ici');

      case 'watched':
        return watched.length > 0 ? (
          <>
            <View style={styles.longPressHint}>
              <ImageIcon size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.longPressHintText}>{"Appui long pour changer l'affiche"}</Text>
            </View>
            <FlatList data={watched} renderItem={renderWatchedItem} keyExtractor={item => item.id} numColumns={3} scrollEnabled={false} columnWrapperStyle={styles.mediaGridRow} contentContainerStyle={styles.mediaGridContainer} />
          </>
        ) : renderEmptyState(<Check size={40} color={Colors.dark.textTertiary} />, "Rien de regardé", "Les films et séries que vous marquez comme vus apparaîtront ici");

      case 'watchlist':
        return wantToWatch.length > 0 ? (
          <>
            <View style={styles.longPressHint}>
              <ImageIcon size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.longPressHintText}>{"Appui long pour changer l'affiche"}</Text>
            </View>
            <FlatList data={wantToWatch} renderItem={renderWatchlistItem} keyExtractor={item => item.id} numColumns={3} scrollEnabled={false} columnWrapperStyle={styles.mediaGridRow} contentContainerStyle={styles.mediaGridContainer} />
          </>
        ) : renderEmptyState(<BookmarkPlus size={40} color={Colors.dark.textTertiary} />, "Watchlist vide", "Ajoutez des films et séries à votre watchlist");

      case 'in_progress':
        return inProgressSeries.length > 0 ? (
          <>
            <View style={[styles.longPressHint, { marginHorizontal: 16, marginTop: 12 }]}>
              <ImageIcon size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.longPressHintText}>{"Appui long pour changer l'affiche"}</Text>
            </View>
            <View style={styles.inProgressList}>{inProgressSeries.map(item => <View key={item.id}>{renderInProgressItem({ item })}</View>)}</View>
          </>
        ) : renderEmptyState(<Play size={40} color={Colors.dark.textTertiary} />, "Aucune série en cours", "Les séries dont vous n'avez pas terminé tous les épisodes apparaîtront ici");

      case 'replies':
        return renderEmptyState(<MessageSquare size={40} color={Colors.dark.textTertiary} />, 'Aucune réponse', 'Vos réponses aux publications apparaîtront ici');

      case 'videos':
        return videoPosts.length > 0 ? (
          <FlatList data={videoPosts} renderItem={renderPostItem} keyExtractor={item => item.id} scrollEnabled={false} />
        ) : renderEmptyState(<Video size={40} color={Colors.dark.textTertiary} />, 'Aucune vidéo', 'Les publications contenant des vidéos apparaîtront ici');

      case 'photos':
        return photoPosts.length > 0 ? (
          <FlatList data={photoPosts} renderItem={renderPostItem} keyExtractor={item => item.id} scrollEnabled={false} />
        ) : renderEmptyState(<ImageIcon size={40} color={Colors.dark.textTertiary} />, 'Aucune photo', 'Les publications contenant des photos apparaîtront ici');

      default:
        return null;
    }
  };

  if (!isAuthenticated || !profile) {
    return (
      <View style={[styles.notAuthContainer, { paddingTop: insets.top }]}>
        <Film size={48} color={Colors.dark.textTertiary} />
        <Text style={styles.notAuthTitle}>Connectez-vous à PLUS</Text>
        <Text style={styles.notAuthSub}>Suivez vos films, partagez vos avis et connectez-vous avec les cinéphiles</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login' as any)} activeOpacity={0.8}>
          <Text style={styles.signInBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bannerSource = profile.banner_url
    ? { uri: profile.banner_url }
    : { uri: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80' };

  const xpPercent = (levelProgress.current / levelProgress.needed) * 100;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={true} contentContainerStyle={styles.scrollContent}>
        <View style={styles.bannerContainer}>
          <Image source={bannerSource} style={styles.bannerImage} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(10,10,15,0.6)', Colors.dark.background]} style={styles.bannerGradient} />
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarSquare}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>

            <View style={styles.avatarRowRight}>
              <TouchableOpacity style={styles.messageIconBtn} activeOpacity={0.7}>
                <MessageCircle size={18} color={Colors.dark.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={toggleFollow} activeOpacity={0.7}>
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? 'Suivi' : 'Suivre'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editIconBtn} onPress={openEditModal} activeOpacity={0.7}>
                <Pencil size={16} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>

          <View style={styles.levelMoodRow}>
            <View style={styles.levelBadge}>
              <Crown size={12} color={Colors.dark.gold} />
              <Text style={styles.levelBadgeText}>Niv. {level}</Text>
              <View style={styles.levelBarMini}>
                <View style={[styles.levelBarMiniFill, { width: `${xpPercent}%` }]} />
              </View>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={12} color={Colors.dark.accent} />
                <Text style={styles.streakBadgeText}>{streak}j</Text>
              </View>
            )}
            {earnedBadges.length > 0 && (
              <View style={styles.badgeCountChip}>
                <Trophy size={12} color={Colors.dark.gold} />
                <Text style={styles.badgeCountText}>{earnedBadges.length}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.moodChip} onPress={() => setMoodModalVisible(true)} activeOpacity={0.7}>
              {mood ? (
                <>
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </>
              ) : (
                <Text style={styles.moodPlaceholder}>+ Mood</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.followStats}>
            <TouchableOpacity style={styles.followStatItem} activeOpacity={0.6}>
              <Text style={styles.followNumber}>567</Text>
              <Text style={styles.followLabel}> Suivi</Text>
            </TouchableOpacity>
            <View style={styles.followStatDot} />
            <TouchableOpacity style={styles.followStatItem} activeOpacity={0.6}>
              <Text style={styles.followNumber}>1 234</Text>
              <Text style={styles.followLabel}> Abonnés</Text>
            </TouchableOpacity>
          </View>

          {profile.bio ? (
            <Text style={styles.bioText}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>{"Aucune bio. Appuyez sur le stylo pour en ajouter une."}</Text>
          )}

          <View style={styles.mediaStatsRow}>
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{movieCount || 0}</Text>
              <Text style={styles.mediaStatLabel}>Films</Text>
            </View>
            <View style={styles.mediaStatDivider} />
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{seriesCount || 0}</Text>
              <Text style={styles.mediaStatLabel}>Séries</Text>
            </View>
            <View style={styles.mediaStatDivider} />
            <View style={styles.mediaStatItem}>
              <Text style={styles.mediaStatValue}>{totalHours}h</Text>
              <Text style={styles.mediaStatLabel}>Total</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/journal' as any)} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.primaryLight }]}>
              <BookOpen size={18} color={Colors.dark.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Journal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/stats' as any)} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.successLight }]}>
              <BarChart3 size={18} color={Colors.dark.success} />
            </View>
            <Text style={styles.quickActionLabel}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/gamification' as any)} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.goldLight }]}>
              <Trophy size={18} color={Colors.dark.gold} />
            </View>
            <Text style={styles.quickActionLabel}>Badges</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/gamification' as any)} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dark.accentLight }]}>
              <Target size={18} color={Colors.dark.accent} />
            </View>
            <Text style={styles.quickActionLabel}>Défis</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContainer} style={styles.tabsScroll}>
          {PROFILE_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'posts' ? userPosts.length
              : tab.key === 'watched' ? watched.length
              : tab.key === 'watchlist' ? wantToWatch.length
              : tab.key === 'in_progress' ? inProgressSeries.length
              : tab.key === 'replies' ? 0
              : tab.key === 'videos' ? videoPosts.length
              : tab.key === 'photos' ? photoPosts.length
              : 0;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tabItem, isActive && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab.label}
                  <Text style={[styles.tabItemCount, isActive && styles.tabItemCountActive]}>{` (${count})`}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        <View style={styles.menuSection}>
          {drafts.length > 0 && (
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
              <FileText size={20} color={Colors.dark.primary} />
              <Text style={styles.menuLabel}>Brouillons ({drafts.length})</Text>
              <ChevronRight size={16} color={Colors.dark.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/journal' as any)} activeOpacity={0.6}>
            <BookOpen size={20} color={Colors.dark.primary} />
            <Text style={styles.menuLabel}>Journal de visionnage</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/stats' as any)} activeOpacity={0.6}>
            <BarChart3 size={20} color={Colors.dark.success} />
            <Text style={styles.menuLabel}>Statistiques avancées</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/gamification' as any)} activeOpacity={0.6}>
            <Trophy size={20} color={Colors.dark.gold} />
            <Text style={styles.menuLabel}>Gamification & Défis</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
            <Settings size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.menuLabel}>Paramètres</Text>
            <ChevronRight size={16} color={Colors.dark.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.6}>
            <LogOut size={20} color={Colors.dark.danger} />
            <Text style={[styles.menuLabel, { color: Colors.dark.danger }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={editStyles.overlay}>
          <View style={[editStyles.container, { paddingBottom: insets.bottom + 20 }]}>
            <View style={editStyles.handle} />
            <View style={editStyles.header}>
              <Text style={editStyles.title}>Modifier le profil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={editStyles.scrollContent}>
              <TouchableOpacity style={editStyles.bannerPicker} onPress={pickBanner} activeOpacity={0.8}>
                {editBannerUri ? (
                  <Image source={{ uri: editBannerUri }} style={editStyles.bannerPreview} contentFit="cover" />
                ) : (
                  <View style={editStyles.bannerPlaceholder}>
                    <Camera size={24} color={Colors.dark.textTertiary} />
                    <Text style={editStyles.bannerPlaceholderText}>Changer la bannière</Text>
                  </View>
                )}
                <View style={editStyles.bannerOverlay}>
                  <Camera size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={editStyles.avatarPickerRow}>
                <TouchableOpacity style={editStyles.avatarPicker} onPress={pickAvatar} activeOpacity={0.8}>
                  {editAvatarUri ? (
                    <Image source={{ uri: editAvatarUri }} style={editStyles.avatarPreview} contentFit="cover" />
                  ) : (
                    <View style={editStyles.avatarPlaceholder}>
                      <Camera size={22} color={Colors.dark.textTertiary} />
                    </View>
                  )}
                  <View style={editStyles.avatarOverlay}>
                    <Camera size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={editStyles.avatarHint}>Changer la photo</Text>
              </View>
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>{"Nom d'affichage"}</Text>
                <TextInput style={editStyles.fieldInput} placeholderTextColor={Colors.dark.textTertiary} value={editDisplayName} onChangeText={setEditDisplayName} placeholder="Votre nom" />
              </View>
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>Bio</Text>
                <TextInput style={[editStyles.fieldInput, editStyles.fieldInputMulti]} placeholderTextColor={Colors.dark.textTertiary} value={editBio} onChangeText={setEditBio} placeholder="Décrivez-vous en quelques mots..." multiline numberOfLines={4} maxLength={200} />
                <Text style={editStyles.charCount}>{editBio.length}/200</Text>
              </View>
              <TouchableOpacity style={[editStyles.saveBtn, isSaving && editStyles.saveBtnDisabled]} activeOpacity={0.8} onPress={saveProfile} disabled={isSaving}>
                <Text style={editStyles.saveBtnText}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={moodModalVisible} animationType="slide" transparent>
        <View style={moodStyles.overlay}>
          <View style={[moodStyles.container, { paddingBottom: insets.bottom + 20 }]}>
            <View style={moodStyles.handle} />
            <Text style={moodStyles.title}>Comment vous sentez-vous ?</Text>
            <Text style={moodStyles.subtitle}>Partagez votre mood avec vos amis</Text>
            <View style={moodStyles.grid}>
              {MOOD_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.emoji}
                  style={[moodStyles.moodItem, mood?.emoji === option.emoji && moodStyles.moodItemActive]}
                  onPress={() => handleMoodSelect(option)}
                  activeOpacity={0.7}
                >
                  <Text style={moodStyles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[moodStyles.moodLabel, mood?.emoji === option.emoji && moodStyles.moodLabelActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {mood && (
              <TouchableOpacity style={moodStyles.clearBtn} onPress={() => { void clearMood(); setMoodModalVisible(false); }}>
                <Text style={moodStyles.clearBtnText}>Supprimer le mood</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={moodStyles.cancelBtn} onPress={() => setMoodModalVisible(false)}>
              <Text style={moodStyles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {posterPickerTarget && (
        <PosterPickerSheet
          visible={Boolean(posterPickerTarget)}
          onClose={() => setPosterPickerTarget(null)}
          tmdbId={posterPickerTarget.tmdbId}
          mediaType={posterPickerTarget.mediaType}
          title={posterPickerTarget.title}
          onOpenTMDBPicker={() => setTmdbPickerTarget(posterPickerTarget)}
        />
      )}

      {tmdbPickerTarget && (
        <TMDBPosterPicker
          visible={Boolean(tmdbPickerTarget)}
          onClose={() => setTmdbPickerTarget(null)}
          tmdbId={tmdbPickerTarget.tmdbId}
          mediaType={tmdbPickerTarget.mediaType}
          title={tmdbPickerTarget.title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { paddingBottom: 120 },
  notAuthContainer: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  notAuthTitle: { color: Colors.dark.text, fontSize: 22, fontWeight: '700' as const, marginTop: 8 },
  notAuthSub: { color: Colors.dark.textSecondary, fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  signInBtn: { backgroundColor: Colors.dark.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 12 },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  bannerContainer: { height: BANNER_HEIGHT, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_HEIGHT * 0.6 },
  backBtn: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  profileSection: { paddingHorizontal: 16, marginTop: -40 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  avatarSquare: { width: 80, height: 80, borderRadius: 14, backgroundColor: Colors.dark.cardElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.dark.background, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' as const },
  avatarRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  messageIconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  followBtn: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.dark.primary },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.dark.border },
  followBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  followBtnTextActive: { color: Colors.dark.text },
  editIconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  nameSection: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  displayName: { color: Colors.dark.text, fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
  username: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '400' as const },
  levelMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.dark.goldLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  levelBadgeText: { color: Colors.dark.gold, fontSize: 11, fontWeight: '700' as const },
  levelBarMini: { width: 30, height: 3, backgroundColor: 'rgba(245,197,24,0.2)', borderRadius: 2, overflow: 'hidden', marginLeft: 2 },
  levelBarMiniFill: { height: '100%', backgroundColor: Colors.dark.gold, borderRadius: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.dark.accentLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  streakBadgeText: { color: Colors.dark.accent, fontSize: 11, fontWeight: '700' as const },
  badgeCountChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.dark.goldLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  badgeCountText: { color: Colors.dark.gold, fontSize: 11, fontWeight: '700' as const },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.dark.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.borderLight },
  moodEmoji: { fontSize: 14 },
  moodLabel: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: '600' as const },
  moodPlaceholder: { color: Colors.dark.textTertiary, fontSize: 11, fontWeight: '600' as const },
  followStats: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  followStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  followNumber: { color: Colors.dark.text, fontSize: 14, fontWeight: '700' as const },
  followLabel: { color: Colors.dark.textSecondary, fontSize: 14 },
  followStatDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.dark.textTertiary },
  bioText: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  bioPlaceholder: { color: Colors.dark.textTertiary, fontSize: 14, lineHeight: 20, marginTop: 8, fontStyle: 'italic' as const },
  mediaStatsRow: { flexDirection: 'row', marginTop: 16, paddingVertical: 4 },
  mediaStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  mediaStatValue: { color: Colors.dark.text, fontSize: 18, fontWeight: '800' as const },
  mediaStatLabel: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: '500' as const },
  mediaStatDivider: { width: 1, backgroundColor: Colors.dark.border, marginVertical: 4 },
  quickActions: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  quickActionBtn: { flex: 1, alignItems: 'center', gap: 6 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: '600' as const },
  tabsScroll: { marginTop: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border },
  tabsScrollContainer: { paddingHorizontal: 16, gap: 0 },
  tabItem: { paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: Colors.dark.primary },
  tabItemText: { color: Colors.dark.textTertiary, fontSize: 13, fontWeight: '500' as const },
  tabItemTextActive: { color: Colors.dark.text, fontWeight: '700' as const },
  tabItemCount: { color: Colors.dark.textTertiary, fontSize: 13, fontWeight: '400' as const },
  tabItemCountActive: { color: Colors.dark.textSecondary },
  tabContent: { minHeight: 300 },
  longPressHint: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  longPressHintText: { color: Colors.dark.textTertiary, fontSize: 11 },
  mediaGridContainer: { padding: 4 },
  mediaGridRow: { gap: 2 },
  mediaGridItem: { flex: 1, maxWidth: (SCREEN_WIDTH - 12) / 3, marginBottom: 2, position: 'relative' },
  mediaGridPoster: { width: '100%', aspectRatio: 2 / 3 },
  mediaGridPlaceholder: { backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  mediaGridInfo: { padding: 6, backgroundColor: Colors.dark.card },
  mediaGridTitle: { color: Colors.dark.text, fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
  mediaGridBadge: { marginTop: 3, backgroundColor: Colors.dark.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  mediaGridBadgeTv: { backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  mediaGridBadgeText: { color: Colors.dark.primary, fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  watchedCheckBadge: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.dark.success, alignItems: 'center', justifyContent: 'center' },
  customPosterBadge: { position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  inProgressList: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  inProgressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: Colors.dark.borderLight },
  inProgressPoster: { width: 48, height: 72 },
  inProgressInfo: { flex: 1, gap: 4 },
  inProgressTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  inProgressEps: { color: Colors.dark.textSecondary, fontSize: 12 },
  inProgressRemaining: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },
  inProgressBar: { height: 4, backgroundColor: Colors.dark.borderLight, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  inProgressFill: { height: '100%', backgroundColor: Colors.dark.primary, borderRadius: 2 },
  inProgressExpandedPanel: { backgroundColor: Colors.dark.card, marginHorizontal: 0, marginTop: -2, paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: Colors.dark.borderLight, gap: 8 },
  inProgressExpandedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inProgressExpandedText: { color: Colors.dark.textSecondary, fontSize: 13 },
  inProgressDetailBtn: { marginTop: 4, backgroundColor: Colors.dark.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  inProgressDetailBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '600' as const, marginTop: 4 },
  emptySubtitle: { color: Colors.dark.textSecondary, fontSize: 13, textAlign: 'center' as const, lineHeight: 18 },
  menuSection: { marginTop: 24, marginHorizontal: 16, backgroundColor: Colors.dark.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.dark.borderLight },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  menuLabel: { flex: 1, color: Colors.dark.text, fontSize: 15, fontWeight: '500' as const },
});

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' as const },
  scrollContent: { paddingHorizontal: 20 },
  bannerPicker: { height: 120, backgroundColor: Colors.dark.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  bannerPreview: { width: '100%', height: '100%' },
  bannerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  bannerPlaceholderText: { color: Colors.dark.textTertiary, fontSize: 13 },
  bannerOverlay: { position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarPickerRow: { alignItems: 'center', marginBottom: 20, gap: 8 },
  avatarPicker: { width: 80, height: 80, borderRadius: 14, backgroundColor: Colors.dark.card, overflow: 'hidden', position: 'relative' },
  avatarPreview: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarHint: { color: Colors.dark.primary, fontSize: 13, fontWeight: '500' as const },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '500' as const, marginBottom: 8 },
  fieldInput: { backgroundColor: Colors.dark.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.dark.text, fontSize: 15, borderWidth: 1, borderColor: Colors.dark.borderLight },
  fieldInputMulti: { minHeight: 100, textAlignVertical: 'top' as const },
  charCount: { color: Colors.dark.textTertiary, fontSize: 11, textAlign: 'right' as const, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.dark.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
});

const moodStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 16 },
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' as const },
  subtitle: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  moodItem: { width: (SCREEN_WIDTH - 70) / 4, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.borderLight },
  moodItemActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryLight },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  moodLabel: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: '600' as const },
  moodLabelActive: { color: Colors.dark.primary },
  clearBtn: { alignSelf: 'center', paddingVertical: 10 },
  clearBtnText: { color: Colors.dark.danger, fontSize: 14, fontWeight: '600' as const },
  cancelBtn: { alignSelf: 'center', paddingVertical: 10, marginBottom: 8 },
  cancelBtnText: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '600' as const },
});