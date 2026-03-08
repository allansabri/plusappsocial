import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import {
  Heart, MessageCircle, Repeat2, BarChart3, Bookmark, Share2, Star,
  Send, ArrowLeft, ThumbsUp, MoreHorizontal,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Post } from '@/types';
import { usePosts } from '@/providers/PostProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getImageUrl } from '@/services/tmdb';
import HashtagText from '@/components/HashtagText';
import PhotoGrid from '@/components/PhotoGrid';
import PhotoViewer from '@/components/PhotoViewer';
import VideoPlayer from '@/components/VideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MockComment {
  id: string;
  user: string;
  handle: string;
  avatar_url: string | null;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: MockComment[];
}

const MOCK_COMMENTS: MockComment[] = [
  {
    id: 'dc1', user: 'Sophie L.', handle: '@sophie_l', avatar_url: null,
    content: 'Tellement d\'accord ! Un film incroyable. La réalisation est vraiment au-dessus du lot.',
    timestamp: 'Il y a 2h', likes: 12, isLiked: false,
    replies: [
      { id: 'dc1r1', user: 'Alex M.', handle: '@alex_m', avatar_url: null, content: 'Pareil, je l\'ai revu 3 fois ! Toujours aussi bon.', timestamp: 'Il y a 1h', likes: 4, isLiked: false, replies: [] },
      { id: 'dc1r2', user: 'Léa K.', handle: '@lea_k', avatar_url: null, content: 'La bande son est incroyable aussi 🎵', timestamp: 'Il y a 45min', likes: 2, isLiked: false, replies: [] },
    ],
  },
  {
    id: 'dc2', user: 'Thomas R.', handle: '@thomas_r', avatar_url: null,
    content: 'La cinématographie est magistrale. Chaque plan est une œuvre d\'art.',
    timestamp: 'Il y a 5h', likes: 8, isLiked: false, replies: [],
  },
  {
    id: 'dc3', user: 'Emma B.', handle: '@emma_b', avatar_url: null,
    content: 'Je recommande à tout le monde ! Un must-see de cette année.',
    timestamp: 'Il y a 8h', likes: 15, isLiked: true, replies: [
      { id: 'dc3r1', user: 'Hugo P.', handle: '@hugo_p', avatar_url: null, content: 'Clairement dans mon top 5 all time', timestamp: 'Il y a 6h', likes: 3, isLiked: false, replies: [] },
    ],
  },
  {
    id: 'dc4', user: 'Marie D.', handle: '@marie_d', avatar_url: null,
    content: 'Les acteurs sont tous excellents, mention spéciale pour le rôle principal.',
    timestamp: 'Il y a 12h', likes: 6, isLiked: false, replies: [],
  },
];

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'À l\'instant';
  if (diffH < 24) return `Il y a ${diffH}h`;
  const day = date.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${hours}:${mins} · ${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function renderStars(rating: number): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.25;
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} size={15} color={Colors.dark.gold} fill={Colors.dark.gold} />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<Star key={i} size={15} color={Colors.dark.gold} fill={Colors.dark.gold} />);
    } else {
      stars.push(<Star key={i} size={15} color={Colors.dark.textTertiary} fill="transparent" />);
    }
  }
  return stars;
}

function getMediaLabel(post: Post): string {
  if (post.tmdb_season != null && post.tmdb_episode != null) {
    return `S${post.tmdb_season} E${post.tmdb_episode}`;
  }
  if (post.tmdb_type === 'tv') return 'Série';
  return 'Film';
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { allFeedPosts } = usePosts();
  const { profile } = useAuth();

  const post = allFeedPosts.find(p => p.id === id);

  const [liked, setLiked] = useState(post?.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post?.likes_count ?? 0);
  const [bookmarked, setBookmarked] = useState(post?.is_bookmarked ?? false);
  const [comments, setComments] = useState<MockComment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setLiked(prev => !prev);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  }, [liked, scaleAnim]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked(prev => !prev);
  }, []);

  const handleSendComment = useCallback(() => {
    if (!newComment.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const comment: MockComment = {
      id: `dc-${Date.now()}`,
      user: profile?.display_name ?? 'Moi',
      handle: `@${profile?.username ?? 'moi'}`,
      avatar_url: profile?.avatar_url ?? null,
      content: newComment.trim(),
      timestamp: 'À l\'instant',
      likes: 0,
      isLiked: false,
      replies: [],
    };
    if (replyTo) {
      setComments(prev => prev.map(c =>
        c.id === replyTo.id ? { ...c, replies: [...c.replies, comment] } : c
      ));
    } else {
      setComments(prev => [comment, ...prev]);
    }
    setNewComment('');
    setReplyTo(null);
  }, [newComment, replyTo, profile]);

  const toggleCommentLike = useCallback((commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments(prev => prev.map(c => {
      if (c.id === commentId) return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) };
    }));
  }, []);

  const navigateToMedia = useCallback(() => {
    if (post?.tmdb_id && post?.tmdb_type) {
      router.push(`/media/${post.tmdb_id}?type=${post.tmdb_type}` as any);
    }
  }, [post, router]);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Post</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Post introuvable</Text>
        </View>
      </View>
    );
  }

  const posterUrl = getImageUrl(post.tmdb_poster, 'w185');
  const initial = getInitial(post.profiles?.display_name ?? 'U');
  const avatarUrl = post.profiles?.avatar_url;
  const totalComments = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  const renderComment = (comment: MockComment, isReply = false) => (
    <View key={comment.id} style={[styles.commentItem, isReply && styles.commentReply]}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{getInitial(comment.user)}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentNameRow}>
          <Text style={styles.commentName}>{comment.user}</Text>
          <Text style={styles.commentHandle}>{comment.handle}</Text>
          <Text style={styles.commentDot}>·</Text>
          <Text style={styles.commentTime}>{comment.timestamp}</Text>
        </View>
        <HashtagText text={comment.content} style={styles.commentText} />
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => toggleCommentLike(comment.id)} style={styles.commentAction}>
            <ThumbsUp size={13} color={comment.isLiked ? Colors.dark.primary : Colors.dark.textTertiary} fill={comment.isLiked ? Colors.dark.primary : 'transparent'} />
            {comment.likes > 0 && <Text style={[styles.commentActionCount, comment.isLiked && { color: Colors.dark.primary }]}>{comment.likes}</Text>}
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyTo({ id: comment.id, user: comment.user })} style={styles.commentAction}>
              <MessageCircle size={13} color={Colors.dark.textTertiary} />
              <Text style={styles.commentReplyText}>Répondre</Text>
            </TouchableOpacity>
          )}
        </View>
        {comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(r => renderComment(r, true))}
          </View>
        )}
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.postSection}>
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.postAvatar} activeOpacity={0.7} onPress={() => router.push(`/user/${post.user_id}` as any)}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.postAvatarImg} contentFit="cover" />
          ) : (
            <Text style={styles.postAvatarText}>{initial}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.postHeaderInfo} activeOpacity={0.7} onPress={() => router.push(`/user/${post.user_id}` as any)}>
          <Text style={styles.postDisplayName}>{post.profiles?.display_name}</Text>
          <Text style={styles.postUsername}>@{post.profiles?.username}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postMoreBtn} hitSlop={8}>
          <MoreHorizontal size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      {post.content ? (
        <HashtagText text={post.content} style={styles.postContent} />
      ) : null}

      {post.photos && post.photos.length > 0 && (
        <View style={styles.postPhotos}>
          <PhotoGrid photos={post.photos} onPhotoPress={(idx) => { setPhotoViewerIndex(idx); setPhotoViewerVisible(true); }} />
        </View>
      )}

      {post.video_url && (
        <View style={styles.postPhotos}>
          <VideoPlayer uri={post.video_url} />
        </View>
      )}

      {post.tmdb_title && (
        <TouchableOpacity style={styles.mediaCard} onPress={navigateToMedia} activeOpacity={0.7}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.mediaPoster} contentFit="cover" />
          ) : (
            <View style={[styles.mediaPoster, styles.mediaPosterPlaceholder]} />
          )}
          <View style={styles.mediaBody}>
            <Text style={styles.mediaTitle}>{post.tmdb_title}</Text>
            <Text style={styles.mediaLabel}>{getMediaLabel(post)}</Text>
          </View>
          {post.rating != null && post.rating > 0 && (
            <View style={styles.mediaStars}>
              {renderStars(post.rating)}
            </View>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.postDate}>{formatFullDate(post.created_at)}</Text>

      <View style={styles.statsRow}>
        {(post.reposts_count ?? 0) > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatCount(post.reposts_count)}</Text>
            <Text style={styles.statLabel}>Reposts</Text>
          </View>
        )}
        {likesCount > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatCount(likesCount)}</Text>
            <Text style={styles.statLabel}>J'aime</Text>
          </View>
        )}
        {(post.views_count ?? 0) > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatCount(post.views_count ?? 0)}</Text>
            <Text style={styles.statLabel}>Vues</Text>
          </View>
        )}
        {(post.comments_count > 0 || totalComments > 0) && (
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{formatCount(Math.max(post.comments_count, totalComments))}</Text>
            <Text style={styles.statLabel}>Commentaires</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <MessageCircle size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Repeat2 size={20} color={post.is_reposted ? Colors.dark.success : Colors.dark.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.6}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Heart size={20} color={liked ? Colors.dark.accent : Colors.dark.textSecondary} fill={liked ? Colors.dark.accent : 'transparent'} />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <BarChart3 size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark} activeOpacity={0.6}>
          <Bookmark size={20} color={bookmarked ? Colors.dark.primary : Colors.dark.textSecondary} fill={bookmarked ? Colors.dark.primary : 'transparent'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <Share2 size={19} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.commentsSectionHeader}>
        <Text style={styles.commentsSectionTitle}>Commentaires</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Post</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={c => c.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => renderComment(item)}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + 8 }]}>
          {replyTo && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>Réponse à {replyTo.user}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Text style={styles.replyIndicatorCancel}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <View style={styles.commentInputAvatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.commentInputAvatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.commentInputAvatarText}>
                  {profile?.display_name?.charAt(0).toUpperCase() ?? 'U'}
                </Text>
              )}
            </View>
            <View style={styles.commentInputWrap}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder={replyTo ? `Répondre à ${replyTo.user}...` : 'Publier un commentaire...'}
                placeholderTextColor={Colors.dark.textTertiary}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={!newComment.trim()}
                style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
              >
                <Send size={18} color={newComment.trim() ? Colors.dark.primary : Colors.dark.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {post.photos && post.photos.length > 0 && (
        <PhotoViewer
          visible={photoViewerVisible}
          photos={post.photos}
          initialIndex={photoViewerIndex}
          onClose={() => setPhotoViewerVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  flex: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  navTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: Colors.dark.textSecondary, fontSize: 15 },

  postSection: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  postAvatar: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  postAvatarImg: { width: 44, height: 44 },
  postAvatarText: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const },
  postHeaderInfo: { flex: 1, marginLeft: 10 },
  postDisplayName: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  postUsername: { color: Colors.dark.textSecondary, fontSize: 14, marginTop: 1 },
  postMoreBtn: { padding: 4 },

  postContent: { color: Colors.dark.text, fontSize: 17, lineHeight: 24, paddingHorizontal: 16, marginBottom: 12 },
  postPhotos: { paddingHorizontal: 16, marginBottom: 12 },

  mediaCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.dark.borderLight,
  },
  mediaPoster: { width: 56, height: 80 },
  mediaPosterPlaceholder: { backgroundColor: Colors.dark.cardElevated },
  mediaBody: { flex: 1, paddingHorizontal: 12 },
  mediaTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  mediaLabel: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: 2 },
  mediaStars: { flexDirection: 'row', gap: 1, marginRight: 14 },

  postDate: { color: Colors.dark.textTertiary, fontSize: 14, paddingHorizontal: 16, marginBottom: 12 },

  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: Colors.dark.border, gap: 20,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statCount: { color: Colors.dark.text, fontSize: 14, fontWeight: '700' as const },
  statLabel: { color: Colors.dark.textSecondary, fontSize: 14 },

  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 10, paddingHorizontal: 16,
    borderTopWidth: 0.5, borderTopColor: Colors.dark.border,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
  },
  actionBtn: { padding: 8 },

  commentsSectionHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  commentsSectionTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },

  commentItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 },
  commentReply: { marginLeft: 24, paddingLeft: 0 },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  commentAvatarText: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' as const },
  commentBody: { flex: 1 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  commentName: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  commentHandle: { color: Colors.dark.textTertiary, fontSize: 13 },
  commentDot: { color: Colors.dark.textTertiary, fontSize: 13 },
  commentTime: { color: Colors.dark.textTertiary, fontSize: 12 },
  commentText: { color: Colors.dark.text, fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },
  commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionCount: { color: Colors.dark.textTertiary, fontSize: 12 },
  commentReplyText: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: '500' as const },
  repliesContainer: { marginTop: 4 },

  commentInputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 0.5, borderTopColor: Colors.dark.border,
    paddingTop: 8, paddingHorizontal: 12,
  },
  replyIndicator: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 6,
  },
  replyIndicatorText: { color: Colors.dark.textSecondary, fontSize: 12 },
  replyIndicatorCancel: { color: Colors.dark.textTertiary, fontSize: 14, padding: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  commentInputAvatar: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: 2,
  },
  commentInputAvatarImg: { width: 34, height: 34 },
  commentInputAvatarText: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  commentInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.dark.surface, borderRadius: 22,
    borderWidth: 1, borderColor: Colors.dark.borderLight,
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  commentInput: { flex: 1, color: Colors.dark.text, fontSize: 14, maxHeight: 80, paddingTop: 0, paddingBottom: 0 },
  sendBtn: { paddingBottom: 2 },
  sendBtnDisabled: { opacity: 0.4 },
});