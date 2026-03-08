import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  ScrollView, Animated, Modal, TextInput, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Plus, X, Heart, Shield, ShieldAlert, ShieldOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { Post } from '@/types';
import { mockStories } from '@/mocks/feed';
import PostCard from '@/components/PostCard';
import { getImageUrl } from '@/services/tmdb';
import UpcomingEpisodes from '@/components/UpcomingEpisodes';
import { usePosts } from '@/providers/PostProvider';
import { useSocial } from '@/providers/SocialProvider';
import FloatingCreateButton from '@/components/FloatingCreateButton';
import * as Haptics from 'expo-haptics';
import { feedTabBarVisible } from '@/stores/feedScrollStore';

type FeedTab = 'pour_vous' | 'activite' | 'clubs' | 'a_venir';

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'pour_vous', label: 'Pour vous' },
  { key: 'activite', label: 'Activité' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'a_venir', label: 'À venir' },
];

const QUICK_EMOJIS = ['❤️', '😂', '😮'];

interface StoryViewerProps {
  visible: boolean;
  onClose: () => void;
  storyIndex: number;
  onReaction: (storyId: string, emoji: string) => void;
}

const StoryViewer = React.memo(({ visible, onClose, storyIndex, onReaction }: StoryViewerProps) => {
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const userStories = React.useMemo(() => mockStories.filter(s => s.type === 'user'), []);
  const [currentIndex, setCurrentIndex] = useState(storyIndex);
  const [messageText, setMessageText] = useState('');
  const [liked, setLiked] = useState(false);
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const reactionAnim = useRef(new Animated.Value(0)).current;
  const story = userStories[currentIndex];

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(storyIndex);
      setSentReaction(null);
      setLiked(false);
      setMessageText('');
    }
  }, [visible, storyIndex]);

  React.useEffect(() => {
    if (visible && story) {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          if (currentIndex < userStories.length - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            onClose();
          }
        }
      });
    }
  }, [visible, story, currentIndex, onClose, progressAnim, userStories.length]);

  if (!story) return null;

  const handleTap = (side: 'left' | 'right') => {
    if (side === 'right') {
      if (currentIndex < userStories.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSentReaction(null);
      } else {
        onClose();
      }
    } else {
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setSentReaction(null);
      }
    }
  };

  const handleQuickReaction = (emoji: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReaction(story.id, emoji);
    setSentReaction(emoji);
    reactionAnim.setValue(0);
    Animated.sequence([
      Animated.spring(reactionAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 15 }),
      Animated.delay(1500),
      Animated.timing(reactionAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSentReaction(null));
  };

  const handleLikeStory = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked(prev => !prev);
    if (!liked) {
      onReaction(story.id, '❤️');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={storyStyles.container}>
        {story.posterPath && (
          <Image
            source={{ uri: getImageUrl(story.posterPath, 'w780') ?? '' }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        )}
        <View style={storyStyles.overlay} />

        <View style={[storyStyles.progressBar, { paddingTop: insets.top + 8 }]}>
          {userStories.map((_, i) => (
            <View key={i} style={storyStyles.progressTrack}>
              <Animated.View
                style={[
                  storyStyles.progressFill,
                  i < currentIndex ? { flex: 1 } : i === currentIndex ? {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  } : { width: 0 },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={storyStyles.header}>
          <View style={storyStyles.headerLeft}>
            <View style={storyStyles.storyAvatar}>
              {story.avatar ? (
                <Image
                  source={{ uri: story.avatar }}
                  style={storyStyles.storyAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={storyStyles.storyAvatarText}>{story.initial}</Text>
              )}
            </View>
            <Text style={storyStyles.storyUser}>{story.name}</Text>
            <Text style={storyStyles.storyTime}>22m</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={storyStyles.closeBtn}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={storyStyles.tapAreas}>
          <TouchableOpacity style={storyStyles.tapLeft} onPress={() => handleTap('left')} activeOpacity={1} />
          <TouchableOpacity style={storyStyles.tapRight} onPress={() => handleTap('right')} activeOpacity={1} />
        </View>

        {sentReaction && (
          <Animated.View style={[storyStyles.sentReaction, {
            opacity: reactionAnim,
            transform: [{ scale: reactionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }]}>
            <Text style={storyStyles.sentReactionEmoji}>{sentReaction}</Text>
          </Animated.View>
        )}

        <View style={[storyStyles.bottomArea, { paddingBottom: insets.bottom + 12 }]}>
          <View style={storyStyles.messageRow}>
            <View style={storyStyles.messageInputWrap}>
              <TextInput
                style={storyStyles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Envoyer un message..."
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <View style={storyStyles.quickEmojis}>
                {QUICK_EMOJIS.map(emoji => (
                  <TouchableOpacity key={emoji} onPress={() => handleQuickReaction(emoji)} activeOpacity={0.7}>
                    <Text style={storyStyles.quickEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={storyStyles.likeBtn} onPress={handleLikeStory} activeOpacity={0.7}>
              <Heart size={24} color={liked ? Colors.dark.accent : '#fff'} fill={liked ? Colors.dark.accent : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});
StoryViewer.displayName = 'StoryViewer';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allFeedPosts } = usePosts();
  const { unreadNotifCount, markNotificationsRead, spoilerMode, updateSpoilerMode, addStoryReaction } = useSocial();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('pour_vous');
  const [storyVisible, setStoryVisible] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [spoilerModalVisible, setSpoilerModalVisible] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(insets.top + 90);

  const headerVisible = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);

  useEffect(() => {
    if (activeTab !== 'pour_vous' && isHeaderHidden.current) {
      isHeaderHidden.current = false;
      setHeaderHidden(false);
      Animated.timing(headerVisible, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(feedTabBarVisible, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [activeTab, headerVisible]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleLike = useCallback((postId: string) => {
    console.log('[Feed] Like post:', postId);
  }, []);

  const openStory = useCallback((index: number) => {
    setStoryIndex(index);
    setStoryVisible(true);
  }, []);

  const openNotifications = useCallback(() => {
    router.push('/(tabs)/notifications' as any);
    markNotificationsRead();
  }, [markNotificationsRead, router]);

  const handleStoryReaction = useCallback((storyId: string, emoji: string) => {
    void addStoryReaction({ storyId, emoji, userId: 'current-user', username: 'vous' });
  }, [addStoryReaction]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onLike={handleLike} />
  ), [handleLike]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 0) {
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        setHeaderHidden(false);
        Animated.timing(headerVisible, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        Animated.timing(feedTabBarVisible, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      }
    } else if (diff > 8 && !isHeaderHidden.current && currentY > 50) {
      isHeaderHidden.current = true;
      setHeaderHidden(true);
      Animated.timing(headerVisible, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      Animated.timing(feedTabBarVisible, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } else if (diff < -8 && isHeaderHidden.current) {
      isHeaderHidden.current = false;
      setHeaderHidden(false);
      Animated.timing(headerVisible, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      Animated.timing(feedTabBarVisible, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }

    lastScrollY.current = currentY;
  }, [headerVisible]);

  const handleHeaderLayout = useCallback((e: any) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setHeaderHeight(h);
  }, []);

  const renderStoriesBar = useCallback(() => (
    <View style={styles.storiesSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
        <TouchableOpacity
          style={styles.storyItem}
          activeOpacity={0.7}
          onPress={() => router.push('/story/create' as any)}
        >
          <View style={styles.storyAddCircle}>
            <Plus size={24} color={Colors.dark.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.storyName}>Ajouter</Text>
        </TouchableOpacity>

        {mockStories.filter(s => s.type === 'user').map((story, index) => (
          <TouchableOpacity key={story.id} style={styles.storyItem} activeOpacity={0.7} onPress={() => openStory(index)}>
            <View style={styles.storyRing}>
              <View style={styles.storySquare}>
                {story.avatar ? (
                  <Image source={{ uri: story.avatar }} style={styles.storyImage} contentFit="cover" />
                ) : story.posterPath ? (
                  <Image source={{ uri: getImageUrl(story.posterPath, 'w92') ?? '' }} style={styles.storyImage} contentFit="cover" />
                ) : (
                  <Text style={styles.storyInitial}>{story.initial}</Text>
                )}
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  ), [openStory, router]);

  return (
    <View style={styles.container}>
      {activeTab === 'pour_vous' && (
        <FlatList
          data={allFeedPosts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 100 }}
          ListHeaderComponent={renderStoriesBar}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} progressViewOffset={headerHeight} />
          }
        />
      )}

      {activeTab === 'activite' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingTop: headerHeight + 16, paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Activité récente</Text>
            <Text style={styles.activitySubtitle}>Interactions de vos abonnements</Text>
          </View>
          {[
            { user: 'Marie Dupont', action: 'a noté', target: 'Interstellar', rating: '5/5', time: 'Il y a 2h' },
            { user: 'Lucas Martin', action: 'a commencé', target: 'The Bear S3', time: 'Il y a 4h' },
            { user: 'Emma Bernard', action: 'a ajouté à sa watchlist', target: 'Dune 3', time: 'Il y a 6h' },
            { user: 'Hugo Petit', action: 'a terminé', target: 'Breaking Bad', time: 'Il y a 8h' },
          ].map((item, i) => (
            <View key={i} style={styles.activityItem}>
              <View style={styles.activityAvatar}>
                <Text style={styles.activityAvatarText}>{item.user.charAt(0)}</Text>
              </View>
              <View style={styles.activityItemInfo}>
                <Text style={styles.activityItemText}>
                  <Text style={styles.activityItemUser}>{item.user}</Text> {item.action}{' '}
                  <Text style={styles.activityItemTarget}>{item.target}</Text>
                  {item.rating ? ` — ${item.rating}` : ''}
                </Text>
                <Text style={styles.activityItemTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'clubs' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingTop: headerHeight + 16, paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Clubs</Text>
            <Text style={styles.activitySubtitle}>Rejoignez des communautés de passionnés</Text>
          </View>
          {[
            { name: 'Cinéma Français', members: 1240, emoji: '🇫🇷', desc: 'Pour les fans du cinéma français' },
            { name: 'Marvel Universe', members: 8500, emoji: '🦸', desc: 'Discussion sur le MCU' },
            { name: 'Horreur Club', members: 3200, emoji: '👻', desc: "Les meilleurs films d'horreur" },
            { name: 'Anime & Manga', members: 5600, emoji: '🎌', desc: 'Anime, manga et culture japonaise' },
            { name: 'Séries Netflix', members: 4100, emoji: '📺', desc: 'Toutes les séries Netflix' },
          ].map((club, i) => (
            <View key={i} style={styles.clubCard}>
              <Text style={styles.clubEmoji}>{club.emoji}</Text>
              <View style={styles.clubInfo}>
                <Text style={styles.clubName}>{club.name}</Text>
                <Text style={styles.clubDesc}>{club.desc}</Text>
                <Text style={styles.clubMembers}>{club.members.toLocaleString()} membres</Text>
              </View>
              <TouchableOpacity style={styles.clubJoinBtn} activeOpacity={0.7}>
                <Text style={styles.clubJoinText}>Rejoindre</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'a_venir' && (
        <View style={[styles.flex, { paddingTop: headerHeight }]}>
          <UpcomingEpisodes />
        </View>
      )}

      <Animated.View
        onLayout={handleHeaderLayout}
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + 6, opacity: headerVisible },
        ]}
        pointerEvents={headerHidden ? 'none' : 'auto'}
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Accueil</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.spoilerBtn} onPress={() => setSpoilerModalVisible(true)} activeOpacity={0.7}>
              {spoilerMode === 'strict' ? <ShieldAlert size={20} color={Colors.dark.warning} /> : spoilerMode === 'off' ? <ShieldOff size={20} color={Colors.dark.textTertiary} /> : <Shield size={20} color={Colors.dark.textSecondary} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn} onPress={openNotifications} activeOpacity={0.7}>
              <Bell size={22} color={Colors.dark.text} />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabBar}>
          {FEED_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <FloatingCreateButton bottomOffset={0} />

      <StoryViewer
        visible={storyVisible}
        onClose={() => setStoryVisible(false)}
        storyIndex={storyIndex}
        onReaction={handleStoryReaction}
      />

      <Modal visible={spoilerModalVisible} animationType="slide" transparent>
        <View style={spoilerStyles.overlay}>
          <View style={[spoilerStyles.container, { paddingBottom: insets.bottom + 20 }]}>
            <View style={spoilerStyles.handle} />
            <Text style={spoilerStyles.title}>Mode Spoiler</Text>
            <Text style={spoilerStyles.subtitle}>Contrôlez comment les spoilers s'affichent</Text>
            {([
              { key: 'normal' as const, icon: <Shield size={22} color={Colors.dark.primary} />, label: 'Normal', desc: 'Les posts marqués spoiler sont floutés' },
              { key: 'strict' as const, icon: <ShieldAlert size={22} color={Colors.dark.warning} />, label: 'Strict', desc: 'Masquer tout contenu potentiellement spoiler' },
              { key: 'off' as const, icon: <ShieldOff size={22} color={Colors.dark.textTertiary} />, label: 'Désactivé', desc: 'Afficher tous les contenus sans filtre' },
            ]).map(option => (
              <TouchableOpacity
                key={option.key}
                style={[spoilerStyles.option, spoilerMode === option.key && spoilerStyles.optionActive]}
                onPress={() => { void updateSpoilerMode(option.key); setSpoilerModalVisible(false); }}
                activeOpacity={0.7}
              >
                {option.icon}
                <View style={spoilerStyles.optionInfo}>
                  <Text style={spoilerStyles.optionLabel}>{option.label}</Text>
                  <Text style={spoilerStyles.optionDesc}>{option.desc}</Text>
                </View>
                {spoilerMode === option.key && <View style={spoilerStyles.optionCheck} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  flex: { flex: 1 },
  headerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.background,
    zIndex: 10,
  },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { color: Colors.dark.text, fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spoilerBtn: { padding: 4 },
  notifBtn: { position: 'relative' as const, padding: 4 },
  notifBadge: { position: 'absolute', top: -2, right: -4, backgroundColor: Colors.dark.accent, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: Colors.dark.background },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' as const },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border, paddingHorizontal: 16, gap: 4 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: Colors.dark.text },
  tabLabel: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '500' as const, textAlign: 'center' as const },
  tabLabelActive: { color: Colors.dark.text, fontWeight: '600' as const },
  storiesSection: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border },
  storiesContainer: { paddingHorizontal: 12, paddingVertical: 14, gap: 14 },
  storyItem: { alignItems: 'center', width: 78 },
  storyAddCircle: { width: 66, height: 66, borderRadius: 14, backgroundColor: Colors.dark.surface, borderWidth: 1.5, borderColor: Colors.dark.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  storyRing: { width: 70, height: 70, borderRadius: 16, borderWidth: 2.5, borderColor: Colors.dark.primary, alignItems: 'center', justifyContent: 'center' },
  storySquare: { width: 62, height: 62, borderRadius: 12, backgroundColor: Colors.dark.cardElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storyImage: { width: 62, height: 62, borderRadius: 12 },
  storyInitial: { color: Colors.dark.text, fontSize: 20, fontWeight: '600' as const },
  storyName: { color: Colors.dark.textSecondary, fontSize: 11, marginTop: 6, textAlign: 'center' as const },
  activityHeader: { marginBottom: 16 },
  activityTitle: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' as const },
  activitySubtitle: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 4 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  activityAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  activityItemInfo: { flex: 1 },
  activityItemText: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 20 },
  activityItemUser: { color: Colors.dark.text, fontWeight: '600' as const },
  activityItemTarget: { color: Colors.dark.primary, fontWeight: '600' as const },
  activityItemTime: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 4 },
  clubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: Colors.dark.borderLight },
  clubEmoji: { fontSize: 32 },
  clubInfo: { flex: 1 },
  clubName: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  clubDesc: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  clubMembers: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 4 },
  clubJoinBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  clubJoinText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
});

const storyStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 12 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  storyAvatar: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.dark.cardElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  storyAvatarImage: { width: '100%', height: '100%' },
  storyAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  storyUser: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  storyTime: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400' as const },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tapAreas: { flex: 1, flexDirection: 'row' },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  sentReaction: { position: 'absolute', bottom: 140, alignSelf: 'center' },
  sentReactionEmoji: { fontSize: 64 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  messageInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, height: 44 },
  messageInput: { flex: 1, color: '#fff', fontSize: 14 },
  quickEmojis: { flexDirection: 'row', gap: 6 },
  quickEmoji: { fontSize: 20 },
  likeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

const spoilerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 16 },
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' as const },
  subtitle: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.dark.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.dark.borderLight },
  optionActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryLight },
  optionInfo: { flex: 1 },
  optionLabel: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  optionDesc: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  optionCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.dark.primary },
});