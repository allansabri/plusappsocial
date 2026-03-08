import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MessageCircle, Repeat2, BarChart3, Bookmark, Share2, Star, Send, X, ThumbsUp, AlertTriangle, Eye, MoreHorizontal, Trash2, Pencil, Pin, PinOff } from 'lucide-react-native';
import HashtagText from '@/components/HashtagText';
import PhotoGrid from '@/components/PhotoGrid';
import PhotoViewer from '@/components/PhotoViewer';
import VideoPlayer from '@/components/VideoPlayer';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Post } from '@/types';
import { getImageUrl } from '@/services/tmdb';
import * as Haptics from 'expo-haptics';
import { usePosts } from '@/providers/PostProvider';
import { useAuth } from '@/providers/AuthProvider';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
}

interface MockComment {
  id: string;
  user: string;
  handle: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: MockComment[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${day} ${months[date.getMonth()]}`;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    const val = count / 1000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return String(count);
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getMediaLabel(post: Post): string {
  if (post.tmdb_season != null && post.tmdb_episode != null) {
    return `S${post.tmdb_season} E${post.tmdb_episode}`;
  }
  if (post.tmdb_type === 'tv') return 'Série';
  return 'Film';
}

function renderStars(rating: number): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.25;
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} size={13} color={Colors.dark.gold} fill={Colors.dark.gold} />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<Star key={i} size={13} color={Colors.dark.gold} fill={Colors.dark.gold} />);
    } else {
      stars.push(<Star key={i} size={13} color={Colors.dark.textTertiary} fill="transparent" />);
    }
  }
  return stars;
}

const MOCK_COMMENTS: MockComment[] = [
  {
    id: 'c1',
    user: 'Sophie L.',
    handle: '@sophie_l',
    content: 'Tellement d\'accord ! Un film incroyable.',
    timestamp: 'Il y a 2h',
    likes: 5,
    isLiked: false,
    replies: [
      { id: 'c1r1', user: 'Alex M.', handle: '@alex_m', content: 'Pareil, je l\'ai revu 3 fois !', timestamp: 'Il y a 1h', likes: 2, isLiked: false, replies: [] },
    ],
  },
  {
    id: 'c2',
    user: 'Thomas R.',
    handle: '@thomas_r',
    content: 'La réalisation est magistrale.',
    timestamp: 'Il y a 5h',
    likes: 3,
    isLiked: false,
    replies: [],
  },
];

const CommentsModal = React.memo(({ visible, onClose, commentsCount }: { visible: boolean; onClose: () => void; commentsCount: number }) => {
  const [comments, setComments] = useState<MockComment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSend = useCallback(() => {
    if (!newComment.trim()) return;
    const comment: MockComment = {
      id: `c-${Date.now()}`,
      user: 'Moi',
      handle: '@moi',
      content: newComment.trim(),
      timestamp: 'À l\'instant',
      likes: 0,
      isLiked: false,
      replies: [],
    };
    if (replyTo) {
      setComments(prev => prev.map(c => c.id === replyTo ? { ...c, replies: [...c.replies, comment] } : c));
    } else {
      setComments(prev => [...prev, comment]);
    }
    setNewComment('');
    setReplyTo(null);
  }, [newComment, replyTo]);

  const toggleCommentLike = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments(prev => prev.map(c => {
      if (c.id === id) return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      return { ...c, replies: c.replies.map(r => r.id === id ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) };
    }));
  }, []);

  const renderComment = useCallback((comment: MockComment, isReply = false) => (
    <View key={comment.id} style={[commentStyles.item, isReply && commentStyles.reply]}>
      <View style={commentStyles.avatar}>
        <Text style={commentStyles.avatarText}>{getInitial(comment.user)}</Text>
      </View>
      <View style={commentStyles.body}>
        <View style={commentStyles.nameRow}>
          <Text style={commentStyles.name}>{comment.user}</Text>
          <Text style={commentStyles.time}>{comment.timestamp}</Text>
        </View>
        <Text style={commentStyles.text}>{comment.content}</Text>
        <View style={commentStyles.commentActions}>
          <TouchableOpacity onPress={() => toggleCommentLike(comment.id)} style={commentStyles.likeBtn}>
            <ThumbsUp size={12} color={comment.isLiked ? Colors.dark.primary : Colors.dark.textTertiary} fill={comment.isLiked ? Colors.dark.primary : 'transparent'} />
            {comment.likes > 0 && <Text style={[commentStyles.likeCount, comment.isLiked && { color: Colors.dark.primary }]}>{comment.likes}</Text>}
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyTo(comment.id)}>
              <Text style={commentStyles.replyBtn}>Répondre</Text>
            </TouchableOpacity>
          )}
        </View>
        {comment.replies.map(r => renderComment(r, true))}
      </View>
    </View>
  ), [toggleCommentLike]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={commentStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={commentStyles.container}>
          <View style={commentStyles.header}>
            <Text style={commentStyles.title}>Commentaires ({commentsCount})</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={c => c.id}
            renderItem={({ item }) => renderComment(item)}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
          <View style={commentStyles.inputRow}>
            {replyTo && (
              <TouchableOpacity onPress={() => setReplyTo(null)} style={commentStyles.replyIndicator}>
                <Text style={commentStyles.replyIndicatorText}>Réponse à un commentaire</Text>
                <X size={14} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            )}
            <View style={commentStyles.inputContainer}>
              <TextInput
                style={commentStyles.input}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor={Colors.dark.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity onPress={handleSend} disabled={!newComment.trim()}>
                <Send size={20} color={newComment.trim() ? Colors.dark.primary : Colors.dark.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});
CommentsModal.displayName = 'CommentsModal';

const RepostModal = React.memo(({ visible, onClose, post }: { visible: boolean; onClose: () => void; post: Post }) => {
  const [mode, setMode] = useState<'select' | 'quote'>('select');
  const [quoteText, setQuoteText] = useState('');
  const posterUrl = getImageUrl(post.tmdb_poster, 'w92');

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[Repost] Simple repost:', post.id);
    onClose();
  }, [post.id, onClose]);

  const handleQuote = useCallback(() => {
    if (!quoteText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[Repost] Quote:', post.id, quoteText);
    onClose();
    setQuoteText('');
    setMode('select');
  }, [post.id, quoteText, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={repostStyles.overlay}>
        <View style={repostStyles.container}>
          <View style={repostStyles.header}>
            <Text style={repostStyles.title}>{mode === 'select' ? 'Reposter' : 'Citer le post'}</Text>
            <TouchableOpacity onPress={() => { onClose(); setMode('select'); setQuoteText(''); }} hitSlop={8}>
              <X size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
          {mode === 'select' ? (
            <View style={repostStyles.options}>
              <TouchableOpacity style={repostStyles.optionBtn} onPress={handleRepost}>
                <Repeat2 size={20} color={Colors.dark.success} />
                <Text style={[repostStyles.optionText, { color: Colors.dark.success }]}>Reposter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={repostStyles.optionBtn} onPress={() => setMode('quote')}>
                <MessageCircle size={20} color={Colors.dark.primary} />
                <Text style={[repostStyles.optionText, { color: Colors.dark.primary }]}>Citer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={repostStyles.quoteBody}>
              <TextInput
                style={repostStyles.quoteInput}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor={Colors.dark.textTertiary}
                value={quoteText}
                onChangeText={setQuoteText}
                multiline
                autoFocus
              />
              {post.tmdb_title && (
                <View style={repostStyles.quotePreview}>
                  {posterUrl && <Image source={{ uri: posterUrl }} style={repostStyles.quotePreviewPoster} contentFit="cover" />}
                  <View style={{ flex: 1 }}>
                    <Text style={repostStyles.quotePreviewTitle} numberOfLines={1}>{post.tmdb_title}</Text>
                    {post.rating && <View style={repostStyles.quotePreviewStars}>{renderStars(post.rating)}</View>}
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={[repostStyles.publishBtn, !quoteText.trim() && repostStyles.publishBtnDisabled]}
                onPress={handleQuote}
                disabled={!quoteText.trim()}
              >
                <Text style={repostStyles.publishBtnText}>Publier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});
RepostModal.displayName = 'RepostModal';

const SpoilerOverlay = React.memo(({ onReveal }: { onReveal: () => void }) => {
  return (
    <View style={spoilerStyles.overlay}>
      <View style={spoilerStyles.blurContent}>
        <View style={spoilerStyles.iconCircle}>
          <AlertTriangle size={22} color={Colors.dark.warning} />
        </View>
        <Text style={spoilerStyles.title}>Attention : Spoiler</Text>
        <Text style={spoilerStyles.subtitle}>Ce post peut contenir des informations révélant l'intrigue</Text>
        <TouchableOpacity style={spoilerStyles.revealBtn} onPress={onReveal} activeOpacity={0.7}>
          <Eye size={16} color={Colors.dark.text} />
          <Text style={spoilerStyles.revealText}>Voir le post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
SpoilerOverlay.displayName = 'SpoilerOverlay';

interface EditPostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onSave: (updates: { content?: string; has_spoiler?: boolean; rating?: number }) => void;
}

const EditPostModal = React.memo(({ visible, onClose, post, onSave }: EditPostModalProps) => {
  const [editContent, setEditContent] = useState(post.content);
  const [editSpoiler, setEditSpoiler] = useState(post.has_spoiler);
  const [editRating, setEditRating] = useState(post.rating ?? 0);

  const handleSave = useCallback(() => {
    onSave({
      content: editContent,
      has_spoiler: editSpoiler,
      rating: editRating,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }, [editContent, editSpoiler, editRating, onSave, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={editModalStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={editModalStyles.container}>
          <View style={editModalStyles.handle} />
          <View style={editModalStyles.header}>
            <Text style={editModalStyles.title}>Modifier le post</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={editModalStyles.body} showsVerticalScrollIndicator={false}>
            <TextInput
              style={editModalStyles.textInput}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Votre texte..."
              placeholderTextColor={Colors.dark.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <View style={editModalStyles.optionRow}>
              <AlertTriangle size={16} color={Colors.dark.warning} />
              <Text style={editModalStyles.optionLabel}>Contient un spoiler</Text>
              <TouchableOpacity
                style={[editModalStyles.toggle, editSpoiler && editModalStyles.toggleActive]}
                onPress={() => setEditSpoiler(!editSpoiler)}
              >
                <View style={[editModalStyles.toggleThumb, editSpoiler && editModalStyles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            {post.tmdb_title && (
              <View style={editModalStyles.ratingSection}>
                <Text style={editModalStyles.ratingLabel}>Note</Text>
                <View style={editModalStyles.starsRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TouchableOpacity key={i} onPress={() => setEditRating(i === editRating ? 0 : i)} activeOpacity={0.6}>
                      <Star size={30} color={i <= editRating ? Colors.dark.gold : Colors.dark.textTertiary} fill={i <= editRating ? Colors.dark.gold : 'transparent'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity style={editModalStyles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={editModalStyles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});
EditPostModal.displayName = 'EditPostModal';

const PostCard = React.memo(({ post, onLike }: PostCardProps) => {
  const router = useRouter();
  const { profile } = useAuth();
  const { editPost, deletePost, pinPost, pinnedPostId, incrementViews } = usePosts();
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked ?? false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [repostVisible, setRepostVisible] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const viewTracked = useRef(false);

  const isOwnPost = profile?.id === post.user_id;
  const isPinned = pinnedPostId === post.id;

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(post.id);
  }, [liked, onLike, post.id, scaleAnim]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked(prev => !prev);
  }, []);

  const navigateToMedia = useCallback(() => {
    if (post.tmdb_id && post.tmdb_type) {
      router.push(`/media/${post.tmdb_id}?type=${post.tmdb_type}` as any);
    }
  }, [post.tmdb_id, post.tmdb_type, router]);

  const navigateToUser = useCallback(() => {
    if (post.user_id && post.profiles) {
      router.push(`/user/${post.user_id}` as any);
    }
  }, [post.user_id, post.profiles, router]);

  const handleDelete = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Supprimer le post',
      'Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deletePost(post.id);
          },
        },
      ]
    );
  }, [post.id, deletePost]);

  const handlePin = useCallback(() => {
    setMenuVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pinPost(post.id);
  }, [post.id, pinPost]);

  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    setEditVisible(true);
  }, []);

  const handleSaveEdit = useCallback((updates: { content?: string; has_spoiler?: boolean; rating?: number }) => {
    editPost(post.id, updates);
  }, [post.id, editPost]);

  const handlePhotoPress = useCallback((index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerVisible(true);
  }, []);

  React.useEffect(() => {
    if (!viewTracked.current && isOwnPost) {
      viewTracked.current = true;
    }
  }, [isOwnPost]);

  const posterUrl = getImageUrl(post.tmdb_poster, 'w154');
  const initial = getInitial(post.profiles?.display_name ?? 'U');
  const mediaLabel = getMediaLabel(post);
  const avatarUrl = post.profiles?.avatar_url;

  const followText = post.is_following === true ? 'Suivi' : post.is_following === false ? 'S\'abonner' : null;

  const showSpoiler = post.has_spoiler && !spoilerRevealed;

  const navigateToDetail = useCallback(() => {
    router.push(`/post/${post.id}` as any);
  }, [post.id, router]);

  return (
    <View style={styles.card}>
      {isPinned && (
        <View style={styles.pinnedBanner}>
          <Pin size={12} color={Colors.dark.primary} />
          <Text style={styles.pinnedText}>Épinglé</Text>
        </View>
      )}
      {post.updated_at && post.updated_at !== post.created_at && (
        <View style={styles.editedBanner}>
          <Text style={styles.editedText}>Modifié</Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarSquare} onPress={navigateToUser} activeOpacity={0.7}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={navigateToUser} activeOpacity={0.7}>
          <Text style={styles.headerLine} numberOfLines={1}>
            <Text style={styles.displayName}>{post.profiles?.display_name}</Text>
            <Text style={styles.headerMeta}> @{post.profiles?.username} · {formatDate(post.created_at)}</Text>
          </Text>
        </TouchableOpacity>
        {isOwnPost ? (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.6} hitSlop={8}>
            <MoreHorizontal size={18} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        ) : followText != null ? (
          <TouchableOpacity style={styles.followBtn} activeOpacity={0.7}>
            <Text style={[styles.followBtnText, post.is_following && styles.followBtnTextActive]}>{followText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showSpoiler ? (
        <SpoilerOverlay onReveal={() => setSpoilerRevealed(true)} />
      ) : (
        <TouchableOpacity onPress={navigateToDetail} activeOpacity={0.9}>
          {post.content ? <HashtagText text={post.content} style={styles.content} /> : null}
        </TouchableOpacity>
      )}

      {!showSpoiler && post.photos && post.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <PhotoGrid photos={post.photos} onPhotoPress={handlePhotoPress} />
        </View>
      )}

      {!showSpoiler && post.video_url && (
        <VideoPlayer
          uri={post.video_url}
          postInfo={{
            id: post.id,
            userName: post.profiles?.display_name,
            userHandle: post.profiles?.username,
            userAvatar: post.profiles?.avatar_url,
            content: post.content,
            likesCount: likesCount,
            commentsCount: post.comments_count,
            repostsCount: post.reposts_count,
            viewsCount: post.views_count,
            createdAt: post.created_at,
            isLiked: liked,
          }}
        />
      )}

      {!showSpoiler && post.tmdb_title && (
        <TouchableOpacity style={styles.mediaCard} onPress={navigateToMedia} activeOpacity={0.7}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.mediaPoster} contentFit="cover" />
          ) : (
            <View style={[styles.mediaPoster, styles.mediaPosterPlaceholder]} />
          )}
          <View style={styles.mediaBody}>
            <Text style={styles.mediaTitle} numberOfLines={1}>{post.tmdb_title}</Text>
            <Text style={styles.mediaLabel}>{mediaLabel}</Text>
          </View>
          {post.rating != null && post.rating > 0 && (
            <View style={styles.mediaStars}>
              {renderStars(post.rating)}
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentsVisible(true)} activeOpacity={0.6}>
          <MessageCircle size={16} color={Colors.dark.textTertiary} />
          {post.comments_count > 0 && <Text style={styles.actionCount}>{post.comments_count}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setRepostVisible(true)} activeOpacity={0.6}>
          <Repeat2 size={16} color={post.is_reposted ? Colors.dark.success : Colors.dark.textTertiary} />
          {post.reposts_count > 0 && <Text style={[styles.actionCount, post.is_reposted && { color: Colors.dark.success }]}>{post.reposts_count}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.6}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Heart
              size={16}
              color={liked ? Colors.dark.accent : Colors.dark.textTertiary}
              fill={liked ? Colors.dark.accent : 'transparent'}
            />
          </Animated.View>
          {likesCount > 0 && (
            <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
              {likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
          <BarChart3 size={16} color={Colors.dark.textTertiary} />
          {(post.views_count ?? 0) > 0 && (
            <Text style={styles.actionCount}>{formatCount(post.views_count ?? 0)}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.actionSpacer} />

        <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark} activeOpacity={0.6}>
          <Bookmark
            size={16}
            color={bookmarked ? Colors.dark.primary : Colors.dark.textTertiary}
            fill={bookmarked ? Colors.dark.primary : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnLast} activeOpacity={0.6}>
          <Share2 size={15} color={Colors.dark.textTertiary} />
        </TouchableOpacity>
      </View>

      <CommentsModal visible={commentsVisible} onClose={() => setCommentsVisible(false)} commentsCount={post.comments_count} />
      <RepostModal visible={repostVisible} onClose={() => setRepostVisible(false)} post={post} />

      {post.photos && post.photos.length > 0 && (
        <PhotoViewer
          visible={photoViewerVisible}
          photos={post.photos}
          initialIndex={photoViewerIndex}
          onClose={() => setPhotoViewerVisible(false)}
        />
      )}

      <Modal visible={menuVisible} animationType="fade" transparent>
        <TouchableOpacity style={menuStyles.overlay} onPress={() => setMenuVisible(false)} activeOpacity={1}>
          <View style={menuStyles.container}>
            <View style={menuStyles.handle} />
            <TouchableOpacity style={menuStyles.item} onPress={handleEdit} activeOpacity={0.7}>
              <Pencil size={18} color={Colors.dark.text} />
              <Text style={menuStyles.itemText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={menuStyles.item} onPress={handlePin} activeOpacity={0.7}>
              {isPinned ? <PinOff size={18} color={Colors.dark.primary} /> : <Pin size={18} color={Colors.dark.primary} />}
              <Text style={[menuStyles.itemText, { color: Colors.dark.primary }]}>
                {isPinned ? 'Désépingler' : 'Épingler en haut du profil'}
              </Text>
            </TouchableOpacity>
            <View style={menuStyles.separator} />
            <TouchableOpacity style={menuStyles.item} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={18} color={Colors.dark.danger} />
              <Text style={[menuStyles.itemText, { color: Colors.dark.danger }]}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={menuStyles.cancelBtn} onPress={() => setMenuVisible(false)} activeOpacity={0.7}>
              <Text style={menuStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <EditPostModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        post={post}
        onSave={handleSaveEdit}
      />
    </View>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    paddingLeft: 40,
  },
  pinnedText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  editedBanner: {
    marginBottom: 4,
    paddingLeft: 40,
  },
  editedText: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    fontStyle: 'italic' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 34,
    height: 34,
  },
  avatarText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerLine: {
    fontSize: 14,
  },
  displayName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  headerMeta: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '400' as const,
  },
  moreBtn: {
    marginLeft: 8,
    padding: 4,
  },
  followBtn: {
    marginLeft: 8,
  },
  followBtnText: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  followBtnTextActive: {
    color: Colors.dark.textSecondary,
  },
  content: {
    color: Colors.dark.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
  photosContainer: {
    marginBottom: 10,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    marginBottom: 10,
    overflow: 'hidden',
  },
  mediaPoster: {
    width: 48,
    height: 68,
  },
  mediaPosterPlaceholder: {
    backgroundColor: Colors.dark.cardElevated,
  },
  mediaBody: {
    flex: 1,
    paddingHorizontal: 10,
  },
  mediaTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  mediaLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  mediaStars: {
    flexDirection: 'row',
    gap: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 18,
  },
  actionBtnLast: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  actionCountLiked: {
    color: Colors.dark.accent,
  },
  actionSpacer: {
    flex: 1,
  },
});

const spoilerStyles = StyleSheet.create({
  overlay: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  blurContent: {
    padding: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: Colors.dark.warning,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  revealText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textTertiary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 20,
    marginVertical: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

const editModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textTertiary,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  body: {
    paddingHorizontal: 20,
  },
  textInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top' as const,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  optionLabel: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.dark.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(255, 159, 10, 0.4)',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.textTertiary,
  },
  toggleThumbActive: {
    backgroundColor: Colors.dark.warning,
    alignSelf: 'flex-end',
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  saveBtn: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

const commentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reply: {
    marginLeft: 20,
    paddingLeft: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.dark.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  body: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  time: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  text: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  replyBtn: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  inputRow: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.dark.border,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  replyIndicatorText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    maxHeight: 80,
  },
});

const repostStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  options: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.card,
    paddingVertical: 14,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  quoteBody: {
    padding: 16,
  },
  quoteInput: {
    color: Colors.dark.text,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  quotePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 10,
    marginTop: 10,
    gap: 10,
  },
  quotePreviewPoster: {
    width: 36,
    height: 52,
  },
  quotePreviewTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  quotePreviewStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 4,
  },
  publishBtn: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  publishBtnDisabled: {
    opacity: 0.4,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});