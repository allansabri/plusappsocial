import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal,
  Dimensions, ActivityIndicator, FlatList, Animated, Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import {
  X, Camera, ImageIcon, Type, Search, Film, Tv, Zap, ZapOff, RefreshCw, Send,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { searchMulti, getImageUrl, isTMDBConfigured } from '@/services/tmdb';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type StoryStep = 'capture' | 'edit';

interface LinkedMedia {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<StoryStep>('capture');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [storyText, setStoryText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [linkedMedia, setLinkedMedia] = useState<LinkedMedia | null>(null);
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [frontCamera, setFrontCamera] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingProgress = useRef(new Animated.Value(0)).current;
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Story] Camera permission denied');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        videoMaxDuration: 30,
        cameraType: frontCamera ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'photo');
        setStep('edit');
      }
    } catch (e) {
      console.log('[Story] Camera error:', e);
    }
  }, [frontCamera]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        videoMaxDuration: 30,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setMediaUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video' : 'photo');
        setStep('edit');
      }
    } catch (e) {
      console.log('[Story] Gallery error:', e);
    }
  }, []);

  const handleLongPressStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(true);
    recordingProgress.setValue(0);
    Animated.timing(recordingProgress, {
      toValue: 1,
      duration: 30000,
      useNativeDriver: false,
    }).start();
    recordingTimer.current = setTimeout(() => {
      setIsRecording(false);
      handleTakePhoto();
    }, 30000);
  }, [recordingProgress, handleTakePhoto]);

  const handleLongPressEnd = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      recordingProgress.stopAnimation();
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      handleTakePhoto();
    }
  }, [isRecording, recordingProgress, handleTakePhoto]);

  const handleSearchMedia = useCallback(async (query: string) => {
    setMediaSearchQuery(query);
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
      console.error('[Story] Search error:', e);
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
    setMediaSearchQuery('');
    setSearchResults([]);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!mediaUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log('[Story] Published:', { mediaUri, mediaType, storyText, linkedMedia });
    setPublishing(false);
    router.back();
  }, [mediaUri, mediaType, storyText, linkedMedia, router]);

  const cycleTextPosition = useCallback(() => {
    setTextPosition(prev => prev === 'top' ? 'center' : prev === 'center' ? 'bottom' : 'top');
  }, []);

  const progressStroke = recordingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_bottom' }} />

      {step === 'capture' && (
        <View style={[styles.captureScreen, { paddingTop: insets.top }]}>
          <View style={styles.captureHeader}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerIconBtn}>
              <X size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.captureHeaderCenter}>
              <Text style={styles.captureTitle}>Story</Text>
            </View>
            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setFlashOn(p => !p)}
                activeOpacity={0.7}
              >
                {flashOn ? <Zap size={20} color={Colors.dark.gold} fill={Colors.dark.gold} /> : <ZapOff size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.captureBody}>
            <View style={styles.capturePreview}>
              <Camera size={48} color={Colors.dark.textTertiary} />
              <Text style={styles.captureHint}>Prenez une photo ou choisissez depuis votre galerie</Text>
            </View>
          </View>

          <View style={[styles.captureActions, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} activeOpacity={0.7}>
              <View style={styles.galleryBtnIcon}>
                <ImageIcon size={22} color="#fff" />
              </View>
              <Text style={styles.galleryBtnText}>Galerie</Text>
            </TouchableOpacity>

            <View style={styles.shutterArea}>
              {isRecording && (
                <Animated.View style={[styles.recordingRing, {
                  transform: [{ rotate: progressStroke }],
                }]}>
                  <View style={styles.recordingRingInner} />
                </Animated.View>
              )}
              <TouchableOpacity
                style={[styles.shutterBtn, isRecording && styles.shutterBtnRecording]}
                onPress={handleTakePhoto}
                onLongPress={handleLongPressStart}
                onPressOut={handleLongPressEnd}
                activeOpacity={0.7}
                delayLongPress={300}
              >
                <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.flipBtn} onPress={() => setFrontCamera(p => !p)} activeOpacity={0.7}>
              <View style={styles.flipBtnIcon}>
                <RefreshCw size={22} color="#fff" />
              </View>
              <Text style={styles.flipBtnText}>Tourner</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.captureNote}>Appuyez pour photo · Maintenez pour filmer</Text>
        </View>
      )}

      {step === 'edit' && mediaUri && (
        <View style={styles.editScreen}>
          <Image source={{ uri: mediaUri }} style={styles.editImage} contentFit="cover" />

          {storyText.length > 0 && (
            <View style={[
              styles.textOverlay,
              textPosition === 'top' && styles.textOverlayTop,
              textPosition === 'center' && styles.textOverlayCenter,
              textPosition === 'bottom' && styles.textOverlayBottom,
            ]}>
              <Text style={styles.overlayText}>{storyText}</Text>
            </View>
          )}

          {linkedMedia && (
            <View style={[styles.linkedMediaBanner, { bottom: insets.bottom + 80 }]}>
              <TouchableOpacity style={styles.linkedMediaCard} activeOpacity={0.9}>
                {linkedMedia.poster_path && (
                  <Image source={{ uri: getImageUrl(linkedMedia.poster_path, 'w92') ?? '' }} style={styles.linkedPoster} contentFit="cover" />
                )}
                <View style={styles.linkedInfo}>
                  <Text style={styles.linkedTitle} numberOfLines={1}>{linkedMedia.title}</Text>
                  <Text style={styles.linkedType}>{linkedMedia.type === 'tv' ? 'Série' : 'Film'}</Text>
                </View>
                <TouchableOpacity onPress={() => setLinkedMedia(null)} hitSlop={8}>
                  <X size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.editHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => { setStep('capture'); setMediaUri(null); }} hitSlop={12} style={styles.editCloseBtn}>
              <X size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.editTools}>
              <TouchableOpacity style={styles.editToolBtn} onPress={() => setShowTextInput(true)} activeOpacity={0.7}>
                <Type size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editToolBtn} onPress={() => setShowMediaSearch(true)} activeOpacity={0.7}>
                <Film size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {storyText.length > 0 && (
            <TouchableOpacity style={styles.textPositionBtn} onPress={cycleTextPosition} activeOpacity={0.7}>
              <Text style={styles.textPositionLabel}>
                {textPosition === 'top' ? '↑' : textPosition === 'center' ? '↔' : '↓'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.editFooter, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.publishStoryBtn} onPress={handlePublish} disabled={publishing} activeOpacity={0.7}>
              {publishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.publishStoryText}>Publier la Story</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showTextInput} animationType="fade" transparent>
        <View style={styles.textModal}>
          <View style={[styles.textModalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setShowTextInput(false)} hitSlop={12}>
              <Text style={styles.textModalDone}>Terminé</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.textModalBody}>
            <TextInput
              style={styles.textModalInput}
              value={storyText}
              onChangeText={setStoryText}
              placeholder="Ajouter du texte..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              autoFocus
              maxLength={200}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showMediaSearch} animationType="slide" transparent>
        <View style={styles.mediaSearchOverlay}>
          <View style={[styles.mediaSearchContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.mediaSearchHandle} />
            <View style={styles.mediaSearchHeader}>
              <Text style={styles.mediaSearchTitle}>Lier un film ou une série</Text>
              <TouchableOpacity onPress={() => { setShowMediaSearch(false); setMediaSearchQuery(''); setSearchResults([]); }} hitSlop={8}>
                <X size={22} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.mediaSearchBar}>
              <Search size={16} color={Colors.dark.textTertiary} />
              <TextInput
                style={styles.mediaSearchInput}
                value={mediaSearchQuery}
                onChangeText={handleSearchMedia}
                placeholder="Rechercher..."
                placeholderTextColor={Colors.dark.textTertiary}
                autoFocus
              />
            </View>
            {searching && <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 12 }} />}
            <FlatList
              data={searchResults}
              keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const poster = getImageUrl(item.poster_path, 'w92');
                return (
                  <TouchableOpacity style={styles.searchItem} onPress={() => handleSelectMedia(item)} activeOpacity={0.7}>
                    {poster ? (
                      <Image source={{ uri: poster }} style={styles.searchItemPoster} contentFit="cover" />
                    ) : (
                      <View style={[styles.searchItemPoster, { backgroundColor: Colors.dark.card }]} />
                    )}
                    <View style={styles.searchItemInfo}>
                      <Text style={styles.searchItemTitle} numberOfLines={1}>{item.title || item.name}</Text>
                      <View style={styles.searchItemMeta}>
                        {item.media_type === 'tv' ? <Tv size={12} color={Colors.dark.textSecondary} /> : <Film size={12} color={Colors.dark.textSecondary} />}
                        <Text style={styles.searchItemType}>
                          {item.media_type === 'tv' ? 'Série' : 'Film'} · {(item.release_date || item.first_air_date || '').substring(0, 4)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  captureScreen: { flex: 1, backgroundColor: '#0A0A0F' },
  captureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  captureHeaderCenter: { flex: 1, alignItems: 'center' },
  captureTitle: { color: '#fff', fontSize: 18, fontWeight: '700' as const },
  headerRightIcons: { flexDirection: 'row', gap: 8 },
  captureBody: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  capturePreview: { width: SCREEN_WIDTH - 40, aspectRatio: 9 / 16, backgroundColor: '#111118', borderRadius: 20, alignItems: 'center', justifyContent: 'center', maxHeight: SCREEN_HEIGHT * 0.5 },
  captureHint: { color: Colors.dark.textTertiary, fontSize: 14, textAlign: 'center' as const, marginTop: 16, paddingHorizontal: 40 },
  captureActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40 },
  galleryBtn: { width: 70, alignItems: 'center', gap: 6 },
  galleryBtnIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  galleryBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' as const },
  shutterArea: { alignItems: 'center', justifyContent: 'center' },
  recordingRing: { position: 'absolute', width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: Colors.dark.accent, borderTopColor: 'transparent' },
  recordingRingInner: {},
  shutterBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterBtnRecording: { borderColor: Colors.dark.accent },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterInnerRecording: { width: 28, height: 28, borderRadius: 6, backgroundColor: Colors.dark.accent },
  flipBtn: { width: 70, alignItems: 'center', gap: 6 },
  flipBtnIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  flipBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' as const },
  captureNote: { color: Colors.dark.textTertiary, fontSize: 12, textAlign: 'center' as const, paddingBottom: 8 },
  editScreen: { flex: 1, backgroundColor: '#000' },
  editImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  editCloseBtn: {},
  editHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 10 },
  editTools: { flexDirection: 'row', gap: 8 },
  editToolBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  textOverlay: { position: 'absolute', left: 20, right: 20, zIndex: 5 },
  textOverlayTop: { top: '20%' },
  textOverlayCenter: { top: '45%' },
  textOverlayBottom: { bottom: '25%' },
  overlayText: { color: '#fff', fontSize: 24, fontWeight: '800' as const, textAlign: 'center' as const, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  textPositionBtn: { position: 'absolute', right: 16, top: '50%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, zIndex: 10 },
  textPositionLabel: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  linkedMediaBanner: { position: 'absolute', left: 16, right: 16, zIndex: 5 },
  linkedMediaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 10, gap: 10 },
  linkedPoster: { width: 36, height: 52, borderRadius: 4 },
  linkedInfo: { flex: 1 },
  linkedTitle: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  linkedType: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  editFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10 },
  publishStoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.dark.primary, borderRadius: 24, paddingVertical: 14 },
  publishStoryText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  textModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  textModalHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  textModalDone: { color: Colors.dark.primary, fontSize: 16, fontWeight: '700' as const },
  textModalBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  textModalInput: { color: '#fff', fontSize: 28, fontWeight: '800' as const, textAlign: 'center' as const, lineHeight: 36 },
  mediaSearchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mediaSearchContainer: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: '70%' },
  mediaSearchHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 12 },
  mediaSearchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  mediaSearchTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  mediaSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  mediaSearchInput: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  searchItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  searchItemPoster: { width: 40, height: 56, borderRadius: 4, backgroundColor: Colors.dark.cardElevated },
  searchItemInfo: { flex: 1, marginLeft: 12 },
  searchItemTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  searchItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  searchItemType: { color: Colors.dark.textSecondary, fontSize: 12 },
});