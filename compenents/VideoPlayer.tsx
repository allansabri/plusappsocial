import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Platform, Dimensions, Modal, Text,
  PanResponder, Animated, ScrollView, Alert, FlatList, TextInput, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import {
  Volume2, VolumeX, Play, Pause, ArrowLeft, MoreHorizontal,
  SlidersHorizontal, Download, Plus, Frown, Flag,
  RotateCcw, Tv2, FileText, MessageCircle, Heart, Repeat2, Bookmark, Share2,
  Send, X, ThumbsUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Post } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTROLS_HIDE_DELAY = 3000;
const VIEW_COUNT_THRESHOLD_MS = 3000;

type SpeedOption = 0.5 | 1 | 1.25 | 1.5 | 2;
const SPEED_OPTIONS: SpeedOption[] = [1, 1.25, 1.5, 2];

const QUALITY_OPTIONS = ['Automatique', '1080p', '720p', '480p', '360p'];

interface PostInfo {
  id?: string;
  userName?: string;
  userHandle?: string;
  userAvatar?: string | null;
  content?: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  viewsCount?: number;
  createdAt?: string;
  isLiked?: boolean;
}

interface VideoPlayerProps {
  uri: string;
  youtubeKey?: string;
  style?: any;
  onViewCounted?: () => void;
  isTrailer?: boolean;
  postInfo?: PostInfo;
}

export default function VideoPlayer({ uri, youtubeKey, style, onViewCounted, isTrailer, postInfo }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const viewCountedRef = useRef(false);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const openFullscreen = useCallback(() => {
    console.log('[VideoPlayer] Opening fullscreen');
    setFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    console.log('[VideoPlayer] Closing fullscreen');
    setFullscreen(false);
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis ?? 0);
      setPosition(status.positionMillis ?? 0);

      if (!viewCountedRef.current && onViewCounted && status.positionMillis) {
        if (status.positionMillis >= VIEW_COUNT_THRESHOLD_MS) {
          viewCountedRef.current = true;
          onViewCounted();
          console.log('[VideoPlayer] View counted after 3s watch');
        }
      }
    }
  }, [onViewCounted]);

  if (youtubeKey) {
    return (
      <>
        <TouchableOpacity
          style={[vpStyles.container, style]}
          onPress={openFullscreen}
          activeOpacity={0.95}
        >
          <Image
            source={{ uri: `https://img.youtube.com/vi/${youtubeKey}/hqdefault.jpg` }}
            style={vpStyles.video}
            contentFit="cover"
          />
          <View style={vpStyles.youtubePlayOverlay}>
            <View style={vpStyles.youtubePlayBtn}>
              <Play size={24} color="#fff" fill="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
          <YouTubeFullscreenPlayer
            youtubeKey={youtubeKey}
            onClose={closeFullscreen}
            onViewCounted={onViewCounted}
            viewAlreadyCounted={viewCountedRef.current}
            isTrailer={isTrailer}
            postInfo={postInfo}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[vpStyles.container, style]}
        onPress={openFullscreen}
        activeOpacity={0.95}
      >
        <Video
          ref={videoRef}
          source={{ uri }}
          style={vpStyles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          isMuted={isMuted}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
        <View style={vpStyles.overlay}>
          <TouchableOpacity
            style={vpStyles.muteBtn}
            onPress={(e) => { e.stopPropagation?.(); toggleMute(); }}
            activeOpacity={0.7}
            hitSlop={8}
          >
            {isMuted ? (
              <VolumeX size={16} color="#fff" />
            ) : (
              <Volume2 size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <View style={vpStyles.bottomBar}>
          {duration > 0 && (
            <View style={vpStyles.progressContainer}>
              <View style={[vpStyles.progressFill, { width: `${(position / duration) * 100}%` }]} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <FullscreenPlayer
          uri={uri}
          initialPosition={position}
          onClose={closeFullscreen}
          onViewCounted={onViewCounted}
          viewAlreadyCounted={viewCountedRef.current}
          isTrailer={isTrailer}
          postInfo={postInfo}
        />
      </Modal>
    </>
  );
}

interface YouTubeFullscreenPlayerProps {
  youtubeKey: string;
  onClose: () => void;
  onViewCounted?: () => void;
  viewAlreadyCounted?: boolean;
  isTrailer?: boolean;
  postInfo?: PostInfo;
}

function YouTubeFullscreenPlayer({
  youtubeKey, onClose, onViewCounted, viewAlreadyCounted, isTrailer, postInfo,
}: YouTubeFullscreenPlayerProps) {
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<SpeedOption>(1);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewCountedRef = useRef(viewAlreadyCounted ?? false);
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!viewCountedRef.current && onViewCounted) {
      const timer = setTimeout(() => {
        viewCountedRef.current = true;
        onViewCounted();
        console.log('[YouTubePlayer] View counted after 3s');
      }, VIEW_COUNT_THRESHOLD_MS);
      return () => clearTimeout(timer);
    }
  }, [onViewCounted]);

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showOptionsSheet) setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, [showOptionsSheet]);

  useEffect(() => {
    if (showControls && !showOptionsSheet) {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showControls, showOptionsSheet, resetHideTimer]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const changeSpeed = useCallback((speed: SpeedOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentSpeed(speed);
    webViewRef.current?.injectJavaScript(`
      try { document.querySelector('video').playbackRate = ${speed}; } catch(e) {}
      true;
    `);
  }, []);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 30 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) swipeAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          Animated.timing(swipeAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => onClose());
        } else {
          Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
        }
      },
    })
  ).current;

  const youtubeHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <style>
        * { margin: 0; padding: 0; }
        body { background: #000; overflow: hidden; }
        iframe { width: 100vw; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe
        src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
    </body>
    </html>
  `, [youtubeKey]);

  return (
    <Animated.View
      style={[fsStyles.container, { transform: [{ translateY: swipeAnim }] }]}
      {...swipePanResponder.panHandlers}
    >
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS === 'web' ? (
            <View style={StyleSheet.absoluteFill}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&showinfo=0`}
                style={{ width: '100%', height: '100%', border: 'none' } as any}
                allow="autoplay; encrypted-media"
              />
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: youtubeHtml }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              scrollEnabled={false}
              bounces={false}
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {showControls && (
        <>
          <View style={[fsStyles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity onPress={onClose} style={fsStyles.topBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowOptionsSheet(true); }} style={fsStyles.topBtn} activeOpacity={0.7}>
              <MoreHorizontal size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {postInfo && (
            <PostInfoOverlay postInfo={postInfo} isTrailer={isTrailer} />
          )}
        </>
      )}

      <Modal visible={showOptionsSheet} animationType="slide" transparent onRequestClose={() => setShowOptionsSheet(false)}>
        <OptionsSheet
          currentSpeed={currentSpeed}
          onChangeSpeed={changeSpeed}
          onClose={() => { setShowOptionsSheet(false); resetHideTimer(); }}
          isTrailer={isTrailer}
          isYouTube
        />
      </Modal>
    </Animated.View>
  );
}

interface FullscreenPlayerProps {
  uri: string;
  initialPosition: number;
  onClose: () => void;
  onViewCounted?: () => void;
  viewAlreadyCounted: boolean;
  isTrailer?: boolean;
  postInfo?: PostInfo;
}

function FullscreenPlayer({
  uri, initialPosition, onClose, onViewCounted, viewAlreadyCounted, isTrailer, postInfo,
}: FullscreenPlayerProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fsDuration, setFsDuration] = useState(0);
  const [fsPosition, setFsPosition] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(1);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [liked, setLiked] = useState(postInfo?.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(postInfo?.likesCount ?? 0);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewCountedRef = useRef(viewAlreadyCounted);
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showOptionsSheet && !showCommentsSheet && !isSeeking) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, [showOptionsSheet, showCommentsSheet, isSeeking]);

  useEffect(() => {
    if (showControls && isPlaying && !showOptionsSheet && !showCommentsSheet) {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showControls, isPlaying, showOptionsSheet, showCommentsSheet, resetHideTimer]);

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  const togglePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFinished) {
      setIsFinished(false);
      videoRef.current?.setPositionAsync(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(prev => !prev);
    resetHideTimer();
  }, [isFinished, resetHideTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    resetHideTimer();
  }, [resetHideTimer]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(prev => !prev);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  }, [liked]);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setFsDuration(status.durationMillis ?? 0);
      if (!isSeeking) {
        setFsPosition(status.positionMillis ?? 0);
      }

      if (status.didJustFinish) {
        setIsFinished(true);
        setIsPlaying(false);
        setShowControls(true);
      }

      if (!viewCountedRef.current && onViewCounted && status.positionMillis) {
        if (status.positionMillis >= VIEW_COUNT_THRESHOLD_MS) {
          viewCountedRef.current = true;
          onViewCounted();
        }
      }
    }
  }, [onViewCounted, isSeeking]);

  const handleSeek = useCallback(async (evt: any) => {
    const locationX = evt.nativeEvent?.locationX ?? 0;
    const barWidth = SCREEN_WIDTH - 40;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const newPos = Math.round(ratio * fsDuration);
    setFsPosition(newPos);
    try {
      await videoRef.current?.setPositionAsync(newPos);
    } catch (e) {
      console.log('[VideoPlayer] Seek error:', e);
    }
    if (isFinished) {
      setIsFinished(false);
      setIsPlaying(true);
    }
    resetHideTimer();
  }, [fsDuration, isFinished, resetHideTimer]);

  const openOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowOptionsSheet(true);
  }, []);

  const closeOptions = useCallback(() => {
    setShowOptionsSheet(false);
    resetHideTimer();
  }, [resetHideTimer]);

  const changeSpeed = useCallback(async (speed: SpeedOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(speed);
    try {
      await videoRef.current?.setRateAsync(speed, true);
    } catch (e) {
      console.log('[VideoPlayer] Speed change error:', e);
    }
  }, []);

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 30 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) swipeAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          Animated.timing(swipeAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => onClose());
        } else {
          Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
        }
      },
    })
  ).current;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingTime = fsDuration - fsPosition;
  const progressPercent = fsDuration > 0 ? (fsPosition / fsDuration) * 100 : 0;

  return (
    <Animated.View
      style={[fsStyles.container, { transform: [{ translateY: swipeAnim }] }]}
      {...swipePanResponder.panHandlers}
    >
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={StyleSheet.absoluteFill}>
          <Video
            ref={videoRef}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isPlaying}
            isMuted={isMuted}
            rate={playbackSpeed}
            positionMillis={initialPosition > 0 ? initialPosition : undefined}
            onPlaybackStatusUpdate={onStatus}
          />
        </View>
      </TouchableWithoutFeedback>

      {showControls && (
        <>
          <View style={[fsStyles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity onPress={onClose} style={fsStyles.topBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openOptions} style={fsStyles.topBtn} activeOpacity={0.7}>
              <MoreHorizontal size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {isFinished && (
            <View style={fsStyles.centerOverlay} pointerEvents="box-none">
              <TouchableOpacity onPress={togglePlay} style={fsStyles.replayBtn} activeOpacity={0.7}>
                <RotateCcw size={32} color="#fff" />
                <Text style={fsStyles.replayText}>Rejouer</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isFinished && (
            <View style={fsStyles.centerOverlay} pointerEvents="box-none">
              <TouchableOpacity onPress={togglePlay} style={fsStyles.centerPlayBtn} activeOpacity={0.7}>
                {isPlaying ? <Pause size={36} color="#fff" fill="#fff" /> : <Play size={36} color="#fff" fill="#fff" />}
              </TouchableOpacity>
            </View>
          )}

          {postInfo && (
            <PostInfoOverlay
              postInfo={{ ...postInfo, likesCount: likesCount, isLiked: liked }}
              isTrailer={isTrailer}
              onLike={handleLike}
              onComment={!isTrailer ? () => { setShowCommentsSheet(true); setShowControls(true); } : undefined}
            />
          )}

          <View style={[fsStyles.bottomControls, { paddingBottom: postInfo ? 8 : insets.bottom + 12 }]} pointerEvents="box-none">
            {fsDuration > 0 && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleSeek}
                style={fsStyles.progressTouchArea}
              >
                <View style={fsStyles.progressBarBg}>
                  <View style={[fsStyles.progressBarFill, { width: `${progressPercent}%` }]} />
                  <View style={[fsStyles.progressThumb, { left: `${progressPercent}%` }]} />
                </View>
              </TouchableOpacity>
            )}
            <View style={fsStyles.bottomRow}>
              <View style={fsStyles.bottomLeft}>
                <TouchableOpacity onPress={togglePlay} activeOpacity={0.7} hitSlop={8}>
                  {isPlaying ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
                </TouchableOpacity>
                <Text style={fsStyles.timeText}>
                  -{formatTime(remainingTime)}
                </Text>
              </View>
              <View style={fsStyles.bottomRight}>
                <TouchableOpacity onPress={toggleMute} activeOpacity={0.7} hitSlop={8}>
                  {isMuted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
                </TouchableOpacity>
                {playbackSpeed !== 1 && (
                  <View style={fsStyles.speedIndicator}>
                    <Text style={fsStyles.speedIndicatorText}>{playbackSpeed}x</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </>
      )}

      <Modal visible={showOptionsSheet} animationType="slide" transparent onRequestClose={closeOptions}>
        <OptionsSheet
          currentSpeed={playbackSpeed}
          onChangeSpeed={changeSpeed}
          onClose={closeOptions}
          isTrailer={isTrailer}
        />
      </Modal>

      {!isTrailer && (
        <Modal visible={showCommentsSheet} animationType="slide" transparent onRequestClose={() => setShowCommentsSheet(false)}>
          <FullscreenCommentsSheet
            onClose={() => { setShowCommentsSheet(false); resetHideTimer(); }}
            commentsCount={postInfo?.commentsCount ?? 0}
          />
        </Modal>
      )}
    </Animated.View>
  );
}

interface PostInfoOverlayProps {
  postInfo: PostInfo;
  isTrailer?: boolean;
  onLike?: () => void;
  onComment?: () => void;
}

function PostInfoOverlay({ postInfo, isTrailer, onLike, onComment }: PostInfoOverlayProps) {
  const insets = useSafeAreaInsets();
  const [bookmarked, setBookmarked] = useState(false);

  const initial = (postInfo.userName ?? 'U').charAt(0).toUpperCase();

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      const val = count / 1000;
      return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
    }
    return String(count);
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${day} ${months[date.getMonth()]}`;
  };

  return (
    <View style={[postOverlayStyles.container, { paddingBottom: insets.bottom + 60 }]} pointerEvents="box-none">
      <View style={postOverlayStyles.userRow}>
        <View style={postOverlayStyles.avatar}>
          {postInfo.userAvatar ? (
            <Image source={{ uri: postInfo.userAvatar }} style={postOverlayStyles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={postOverlayStyles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={postOverlayStyles.userInfo}>
          <Text style={postOverlayStyles.userName}>{postInfo.userName ?? 'Utilisateur'}</Text>
          <Text style={postOverlayStyles.userHandle}>@{postInfo.userHandle ?? 'user'}</Text>
        </View>
      </View>

      {postInfo.content ? (
        <Text style={postOverlayStyles.content} numberOfLines={3}>{postInfo.content}</Text>
      ) : null}

      {postInfo.createdAt && (
        <Text style={postOverlayStyles.dateText}>
          {formatDate(postInfo.createdAt)}
          {postInfo.viewsCount ? ` · ${formatCount(postInfo.viewsCount)} vues` : ''}
        </Text>
      )}

      <View style={postOverlayStyles.actionsRow}>
        {!isTrailer && onComment && (
          <TouchableOpacity style={postOverlayStyles.actionBtn} onPress={onComment} activeOpacity={0.6}>
            <MessageCircle size={18} color="rgba(255,255,255,0.85)" />
            {(postInfo.commentsCount ?? 0) > 0 && (
              <Text style={postOverlayStyles.actionText}>{postInfo.commentsCount}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={postOverlayStyles.actionBtn} activeOpacity={0.6}>
          <Repeat2 size={18} color="rgba(255,255,255,0.85)" />
          {(postInfo.repostsCount ?? 0) > 0 && (
            <Text style={postOverlayStyles.actionText}>{postInfo.repostsCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={postOverlayStyles.actionBtn} onPress={onLike} activeOpacity={0.6}>
          <Heart
            size={18}
            color={postInfo.isLiked ? Colors.dark.accent : 'rgba(255,255,255,0.85)'}
            fill={postInfo.isLiked ? Colors.dark.accent : 'transparent'}
          />
          {(postInfo.likesCount ?? 0) > 0 && (
            <Text style={[postOverlayStyles.actionText, postInfo.isLiked && { color: Colors.dark.accent }]}>
              {formatCount(postInfo.likesCount ?? 0)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={postOverlayStyles.actionBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBookmarked(prev => !prev); }}
          activeOpacity={0.6}
        >
          <Bookmark
            size={18}
            color={bookmarked ? Colors.dark.primary : 'rgba(255,255,255,0.85)'}
            fill={bookmarked ? Colors.dark.primary : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={postOverlayStyles.actionBtn} activeOpacity={0.6}>
          <Share2 size={17} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>
    </View>
  );
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

const MOCK_COMMENTS: MockComment[] = [
  {
    id: 'vc1',
    user: 'Sophie L.',
    handle: '@sophie_l',
    content: 'Tellement d\'accord ! Un film incroyable.',
    timestamp: 'Il y a 2h',
    likes: 5,
    isLiked: false,
    replies: [
      { id: 'vc1r1', user: 'Alex M.', handle: '@alex_m', content: 'Pareil, je l\'ai revu 3 fois !', timestamp: 'Il y a 1h', likes: 2, isLiked: false, replies: [] },
    ],
  },
  {
    id: 'vc2',
    user: 'Thomas R.',
    handle: '@thomas_r',
    content: 'La réalisation est magistrale.',
    timestamp: 'Il y a 5h',
    likes: 3,
    isLiked: false,
    replies: [],
  },
];

function FullscreenCommentsSheet({ onClose, commentsCount }: { onClose: () => void; commentsCount: number }) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<MockComment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSend = useCallback(() => {
    if (!newComment.trim()) return;
    const comment: MockComment = {
      id: `vc-${Date.now()}`,
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

  const toggleLike = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments(prev => prev.map(c => {
      if (c.id === id) return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      return { ...c, replies: c.replies.map(r => r.id === id ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) };
    }));
  }, []);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const renderComment = (comment: MockComment, isReply = false) => (
    <View key={comment.id} style={[fsCommentStyles.item, isReply && fsCommentStyles.reply]}>
      <View style={fsCommentStyles.avatar}>
        <Text style={fsCommentStyles.avatarText}>{getInitial(comment.user)}</Text>
      </View>
      <View style={fsCommentStyles.body}>
        <View style={fsCommentStyles.nameRow}>
          <Text style={fsCommentStyles.name}>{comment.user}</Text>
          <Text style={fsCommentStyles.time}>{comment.timestamp}</Text>
        </View>
        <Text style={fsCommentStyles.text}>{comment.content}</Text>
        <View style={fsCommentStyles.commentActions}>
          <TouchableOpacity onPress={() => toggleLike(comment.id)} style={fsCommentStyles.likeBtn}>
            <ThumbsUp size={12} color={comment.isLiked ? Colors.dark.primary : 'rgba(255,255,255,0.4)'} fill={comment.isLiked ? Colors.dark.primary : 'transparent'} />
            {comment.likes > 0 && <Text style={[fsCommentStyles.likeCount, comment.isLiked && { color: Colors.dark.primary }]}>{comment.likes}</Text>}
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyTo(comment.id)}>
              <Text style={fsCommentStyles.replyBtnText}>Répondre</Text>
            </TouchableOpacity>
          )}
        </View>
        {comment.replies.map(r => renderComment(r, true))}
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={fsCommentStyles.overlay}>
        <TouchableWithoutFeedback>
          <KeyboardAvoidingView
            style={[fsCommentStyles.container, { paddingBottom: insets.bottom }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={fsCommentStyles.handle} />
            <View style={fsCommentStyles.header}>
              <Text style={fsCommentStyles.title}>Commentaires ({commentsCount})</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={comments}
              keyExtractor={c => c.id}
              renderItem={({ item }) => renderComment(item)}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            />
            <View style={fsCommentStyles.inputRow}>
              {replyTo && (
                <TouchableOpacity onPress={() => setReplyTo(null)} style={fsCommentStyles.replyIndicator}>
                  <Text style={fsCommentStyles.replyIndicatorText}>Réponse à un commentaire</Text>
                  <X size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
              <View style={fsCommentStyles.inputContainer}>
                <TextInput
                  style={fsCommentStyles.input}
                  placeholder="Ajouter un commentaire..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity onPress={handleSend} disabled={!newComment.trim()}>
                  <Send size={18} color={newComment.trim() ? Colors.dark.primary : 'rgba(255,255,255,0.3)'} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

interface OptionsSheetProps {
  currentSpeed: SpeedOption;
  onChangeSpeed: (speed: SpeedOption) => void;
  onClose: () => void;
  isTrailer?: boolean;
  isYouTube?: boolean;
}

function OptionsSheet({ currentSpeed, onChangeSpeed, onClose, isTrailer, isYouTube }: OptionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [showQuality, setShowQuality] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('Automatique');

  const handleAction = useCallback((action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action) {
      case 'download':
        Alert.alert('Téléchargement', isTrailer ? 'Téléchargement non disponible pour les bandes-annonces.' : 'Téléchargement en cours...');
        break;
      case 'cache':
        Alert.alert('Cache hors ligne', isYouTube ? 'Non disponible pour les vidéos YouTube.' : 'Ajouté au cache hors ligne.');
        break;
      case 'airplay':
        Alert.alert('AirPlay et Bluetooth', 'Recherche d\'appareils...');
        break;
      case 'not_interested':
        Alert.alert('Masqué', 'Ce contenu ne sera plus recommandé.');
        break;
      case 'report':
        Alert.alert('Signaler', 'Merci pour votre signalement. Notre équipe va examiner ce contenu.');
        break;
    }
    onClose();
  }, [isTrailer, isYouTube, onClose]);

  const handleSelectQuality = useCallback((q: string) => {
    setSelectedQuality(q);
    setShowQuality(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[VideoPlayer] Quality changed to:', q);
  }, []);

  const qualityLabel = isYouTube ? `Automatique (YouTube)` : selectedQuality;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={sheetStyles.overlay}>
        <TouchableWithoutFeedback>
          <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={sheetStyles.handle} />

            <View style={sheetStyles.speedSection}>
              {SPEED_OPTIONS.map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    sheetStyles.speedBtn,
                    currentSpeed === speed && sheetStyles.speedBtnActive,
                  ]}
                  onPress={() => onChangeSpeed(speed)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    sheetStyles.speedBtnText,
                    currentSpeed === speed && sheetStyles.speedBtnTextActive,
                  ]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {showQuality && !isYouTube ? (
              <View style={sheetStyles.qualityList}>
                {QUALITY_OPTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[sheetStyles.qualityItem, selectedQuality === q && sheetStyles.qualityItemActive]}
                    onPress={() => handleSelectQuality(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={[sheetStyles.qualityText, selectedQuality === q && sheetStyles.qualityTextActive]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <>
                <OptionRow
                  icon={<SlidersHorizontal size={20} color="#fff" />}
                  label="Qualité"
                  rightText={qualityLabel}
                  onPress={() => !isYouTube ? setShowQuality(true) : Alert.alert('Qualité', 'Qualité gérée automatiquement par YouTube.')}
                />
                <OptionRow icon={<Tv2 size={20} color="#fff" />} label="AirPlay et Bluetooth" onPress={() => handleAction('airplay')} />
                <OptionRow icon={<FileText size={20} color="#fff" />} label="Aller au post" onPress={() => onClose()} />
                <OptionRow
                  icon={<Download size={20} color="#fff" />}
                  label="Télécharger la vidéo"
                  onPress={() => handleAction('download')}
                  disabled={isTrailer || isYouTube}
                />
                <OptionRow
                  icon={<Plus size={20} color="#fff" />}
                  label="Ajouter au cache hors ligne"
                  onPress={() => handleAction('cache')}
                  disabled={isYouTube}
                />
                <OptionRow icon={<Frown size={20} color="#fff" />} label="Cela ne m'intéresse pas" onPress={() => handleAction('not_interested')} />
                <OptionRow icon={<Flag size={20} color="#fff" />} label="Signaler le post" onPress={() => handleAction('report')} />
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  rightText?: string;
  onPress: () => void;
  disabled?: boolean;
}

function OptionRow({ icon, label, rightText, onPress, disabled }: OptionRowProps) {
  return (
    <TouchableOpacity
      style={[sheetStyles.optionRow, disabled && sheetStyles.optionRowDisabled]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
    >
      <View style={sheetStyles.optionLeft}>
        {icon}
        <Text style={[sheetStyles.optionLabel, disabled && sheetStyles.optionLabelDisabled]}>{label}</Text>
      </View>
      {rightText && (
        <Text style={sheetStyles.optionRight}>{rightText}</Text>
      )}
    </TouchableOpacity>
  );
}

export { YouTubeFullscreenPlayer };

const vpStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 10,
  },
  muteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
  },
  youtubePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  youtubePlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const fsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  replayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  progressTouchArea: {
    height: 28,
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative' as const,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.primary,
    marginLeft: -7,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500' as const,
    fontVariant: ['tabular-nums'],
  },
  speedIndicator: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  speedIndicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
});

const postOverlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  userInfo: {
    marginLeft: 8,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  userHandle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  content: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  dateText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});

const fsCommentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reply: {
    marginLeft: 20,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
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
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  time: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  text: {
    color: 'rgba(255,255,255,0.85)',
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  replyBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  inputRow: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  replyIndicatorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  speedSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  speedBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  speedBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  speedBtnTextActive: {
    color: '#fff',
  },
  qualityList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  qualityItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 2,
  },
  qualityItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  qualityText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  qualityTextActive: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionRowDisabled: {
    opacity: 0.35,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  optionLabelDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  optionRight: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});