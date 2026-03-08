import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Platform, KeyboardAvoidingView,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X, ImagePlus, Camera, Film, AlertTriangle, Globe,
  ChevronDown, Search, Video,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { searchMulti, getImageUrl, isTMDBConfigured } from '@/services/tmdb';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/providers/PostProvider';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type InteractionSetting = 'anyone' | 'nobody';

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { createPost, saveDraft, drafts, deleteDraft } = usePosts();

  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [linkedMediaId, setLinkedMediaId] = useState<number | null>(null);
  const [linkedMediaType, setLinkedMediaType] = useState<'movie' | 'tv' | null>(null);
  const [linkedMediaTitle, setLinkedMediaTitle] = useState<string | null>(null);
  const [linkedMediaPoster, setLinkedMediaPoster] = useState<string | null>(null);
  const [interactionSetting, setInteractionSetting] = useState<InteractionSetting>('anyone');

  const [showDrafts, setShowDrafts] = useState(false);
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInteractionSheet, setShowInteractionSheet] = useState(false);
  const [showContentWarning, setShowContentWarning] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);

  const searchResultsQuery = useQuery({
    queryKey: ['create-post-search', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: isTMDBConfigured && searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const searchResults = searchResultsQuery.data?.results?.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  )?.slice(0, 10) ?? [];

  const maxChars = 300;
  const remaining = maxChars - content.length;
  const canPublish = content.trim().length > 0 || photos.length > 0 || videoUri;

  const handlePickPhotos = useCallback(async () => {
    if (videoUri) return;
    if (photos.length >= 4) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 4 - photos.length,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
      }
    } catch (e) {
      console.log('[CreatePost] Photo pick error:', e);
    }
  }, [photos.length, videoUri]);

  const handlePickVideo = useCallback(async () => {
    if (photos.length > 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[CreatePost] Video pick error:', e);
    }
  }, [photos.length]);

  const handleCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        if (videoUri) return;
        setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 4));
      }
    } catch (e) {
      console.log('[CreatePost] Camera error:', e);
    }
  }, [videoUri]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSelectMedia = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLinkedMediaId(item.id);
    setLinkedMediaType(item.media_type);
    setLinkedMediaTitle(item.title || item.name);
    setLinkedMediaPoster(item.poster_path);
    setShowMediaSearch(false);
    setSearchQuery('');
  }, []);

  const handleCancel = useCallback(() => {
    if (content.trim().length > 0 || photos.length > 0 || videoUri) {
      setShowDraftConfirm(true);
    } else {
      router.back();
    }
  }, [content, photos, videoUri, router]);

  const handleSaveDraft = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveDraft({
      content,
      photos: photos.length > 0 ? photos : undefined,
      video_url: videoUri,
      tmdb_id: linkedMediaId,
      tmdb_type: linkedMediaType,
      tmdb_title: linkedMediaTitle,
      tmdb_poster: linkedMediaPoster,
      has_spoiler: hasSpoiler,
    });
    setShowDraftConfirm(false);
    router.back();
  }, [content, photos, videoUri, linkedMediaId, linkedMediaType, linkedMediaTitle, linkedMediaPoster, hasSpoiler, saveDraft, router]);

  const handlePublish = useCallback(() => {
    if (!canPublish) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost({
      content,
      photos: photos.length > 0 ? photos : undefined,
      video_url: videoUri,
      tmdb_id: linkedMediaId,
      tmdb_type: linkedMediaType,
      tmdb_title: linkedMediaTitle,
      tmdb_poster: linkedMediaPoster,
      has_spoiler: hasSpoiler,
    });
    router.back();
  }, [canPublish, content, photos, videoUri, linkedMediaId, linkedMediaType, linkedMediaTitle, linkedMediaPoster, hasSpoiler, createPost, router]);

  const handleLoadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    setContent(draft.content);
    setPhotos(draft.photos ?? []);
    setVideoUri(draft.video_url ?? null);
    setLinkedMediaId(draft.tmdb_id);
    setLinkedMediaType(draft.tmdb_type);
    setLinkedMediaTitle(draft.tmdb_title);
    setLinkedMediaPoster(draft.tmdb_poster);
    setHasSpoiler(draft.has_spoiler);
    deleteDraft(draftId);
    setShowDrafts(false);
  }, [drafts, deleteDraft]);

  const toggleContentWarning = useCallback((warning: string) => {
    setContentWarnings(prev =>
      prev.includes(warning) ? prev.filter(w => w !== warning) : [...prev, warning]
    );
    if (warning === 'Spoiler') {
      setHasSpoiler(prev => !prev);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowDrafts(true)}>
          <Text style={styles.draftsText}>Brouillons</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={!canPublish}
          activeOpacity={0.7}
        >
          <Text style={styles.publishBtnText}>Poster</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          <View style={styles.composerRow}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>
                  {profile?.display_name?.charAt(0).toUpperCase() ?? 'U'}
                </Text>
              )}
            </View>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={t => { if (t.length <= maxChars) setContent(t); }}
              placeholder="Quoi de neuf ?"
              placeholderTextColor={Colors.dark.textTertiary}
              multiline
              autoFocus
              textAlignVertical="top"
              testID="post-content-input"
            />
          </View>

          {photos.length > 0 && (
            <View style={styles.photosContainer}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                  <TouchableOpacity style={styles.altBadge}>
                    <Text style={styles.altBadgeText}>+ ALT</Text>
                  </TouchableOpacity>
                  <View style={styles.photoActions}>
                    <TouchableOpacity style={styles.photoActionBtn}>
                      <Text style={styles.photoActionIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoActionBtn} onPress={() => removePhoto(i)}>
                      <X size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {photos.length === 1 && (
                    <View style={styles.altInfoRow}>
                      <Text style={styles.altInfoIcon}>ℹ️</Text>
                      <Text style={styles.altInfoText}>
                        Le texte alt décrit les images pour les personnes aveugles et malvoyantes, et aide à donner un contexte à tout le monde.
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {videoUri && (
            <View style={styles.videoRow}>
              <Video size={20} color={Colors.dark.text} />
              <Text style={styles.videoText}>Vidéo ajoutée</Text>
              <TouchableOpacity onPress={() => setVideoUri(null)}>
                <X size={16} color={Colors.dark.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {linkedMediaTitle && (
            <View style={styles.linkedMedia}>
              {linkedMediaPoster && (
                <Image
                  source={{ uri: getImageUrl(linkedMediaPoster, 'w92') ?? '' }}
                  style={styles.linkedPoster}
                  contentFit="cover"
                />
              )}
              <View style={styles.linkedInfo}>
                <Text style={styles.linkedTitle} numberOfLines={1}>{linkedMediaTitle}</Text>
                <Text style={styles.linkedMeta}>{linkedMediaType === 'tv' ? 'Série' : 'Film'}</Text>
              </View>
              <TouchableOpacity onPress={() => { setLinkedMediaId(null); setLinkedMediaType(null); setLinkedMediaTitle(null); setLinkedMediaPoster(null); }} hitSlop={8}>
                <X size={16} color={Colors.dark.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.bottomOptions}>
            <TouchableOpacity style={styles.bottomOption} onPress={() => setShowInteractionSheet(true)} activeOpacity={0.7}>
              <Globe size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.bottomOptionText}>
                {interactionSetting === 'anyone' ? "N'importe qui peut interagir" : 'Personne'}
              </Text>
              <ChevronDown size={12} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomOption} onPress={() => setShowContentWarning(true)} activeOpacity={0.7}>
              <AlertTriangle size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.bottomOptionText}>Étiquettes</Text>
              <ChevronDown size={12} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.actionIcon} onPress={handlePickPhotos} activeOpacity={0.7}>
              <ImagePlus size={22} color={Colors.dark.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} onPress={handleCamera} activeOpacity={0.7}>
              <Camera size={22} color={Colors.dark.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} onPress={() => setShowMediaSearch(true)} activeOpacity={0.7}>
              <Film size={22} color={Colors.dark.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} onPress={handlePickVideo} activeOpacity={0.7}>
              <Video size={22} color={Colors.dark.primary} />
            </TouchableOpacity>
            <View style={styles.bottomRight}>
              <Text style={[styles.charCount, remaining < 20 && styles.charCountLow]}>{remaining}</Text>
              <View style={styles.charCircle}>
                <View style={[styles.charCircleFill, { transform: [{ scaleX: Math.min(1, (maxChars - remaining) / maxChars) }] }]} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMediaSearch} animationType="slide" transparent>
        <View style={[styles.searchModal, { paddingTop: insets.top }]}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => { setShowMediaSearch(false); setSearchQuery(''); }}>
              <X size={22} color={Colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.searchModalTitle}>Attacher un film / série</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.dark.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher..."
              placeholderTextColor={Colors.dark.textTertiary}
              autoFocus
            />
          </View>
          {searchResultsQuery.isLoading && <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 20 }} />}
          <FlatList
            data={searchResults}
            keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity style={styles.searchResult} onPress={() => handleSelectMedia(item)} activeOpacity={0.7}>
                {item.poster_path && (
                  <Image source={{ uri: getImageUrl(item.poster_path, 'w92') ?? '' }} style={styles.searchResultPoster} contentFit="cover" />
                )}
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title || item.name}</Text>
                  <Text style={styles.searchResultMeta}>
                    {item.media_type === 'tv' ? 'Série' : 'Film'} · {(item.release_date || item.first_air_date || '').substring(0, 4)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal visible={showInteractionSheet} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Paramètres d'interaction du post</Text>
            <Text style={styles.sheetLabel}>Qui peut répondre ?</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={[styles.radioOption, interactionSetting === 'anyone' && styles.radioOptionActive]}
                onPress={() => setInteractionSetting('anyone')}
              >
                <View style={[styles.radioCircle, interactionSetting === 'anyone' && styles.radioCircleActive]}>
                  {interactionSetting === 'anyone' && <View style={styles.radioCircleDot} />}
                </View>
                <Text style={styles.radioText}>N'importe qui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, interactionSetting === 'nobody' && styles.radioOptionActive]}
                onPress={() => setInteractionSetting('nobody')}
              >
                <View style={[styles.radioCircle, interactionSetting === 'nobody' && styles.radioCircleActive]}>
                  {interactionSetting === 'nobody' && <View style={styles.radioCircleDot} />}
                </View>
                <Text style={styles.radioText}>Personne</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={() => setShowInteractionSheet(false)} activeOpacity={0.7}>
              <Text style={styles.sheetSaveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showContentWarning} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ajouter un avertissement sur le contenu</Text>
            <Text style={styles.sheetDesc}>Veuillez ajouter toute étiquette d'avertissement de contenu pertinente pour le média que vous postez.</Text>
            <Text style={styles.warningCategory}>Contenu pour adultes</Text>
            <View style={styles.warningGroup}>
              {['Suggestif', 'Nudité', 'Adulte'].map(w => (
                <TouchableOpacity key={w} style={styles.warningRow} onPress={() => toggleContentWarning(w)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, contentWarnings.includes(w) && styles.checkboxActive]}>
                    {contentWarnings.includes(w) && <View style={styles.checkboxDot} />}
                  </View>
                  <Text style={styles.warningText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.warningCategory}>Autre</Text>
            <View style={styles.warningGroup}>
              {['Médias crus', 'Spoiler'].map(w => (
                <TouchableOpacity key={w} style={styles.warningRow} onPress={() => toggleContentWarning(w)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, contentWarnings.includes(w) && styles.checkboxActive]}>
                    {contentWarnings.includes(w) && <View style={styles.checkboxDot} />}
                  </View>
                  <Text style={styles.warningText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={() => setShowContentWarning(false)} activeOpacity={0.7}>
              <Text style={styles.sheetSaveBtnText}>Terminé</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDraftConfirm} animationType="fade" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Enregistrer le brouillon ?</Text>
            <Text style={styles.sheetDesc}>Voulez-vous enregistrer ça comme brouillon à modifier plus tard ?</Text>
            <TouchableOpacity style={styles.draftSaveBtn} onPress={handleSaveDraft} activeOpacity={0.7}>
              <Text style={styles.draftSaveBtnText}>Enregistrer le brouillon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.draftDiscardBtn} onPress={() => { setShowDraftConfirm(false); router.back(); }} activeOpacity={0.7}>
              <Text style={styles.draftDiscardBtnText}>Abandonner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.draftBackBtn} onPress={() => setShowDraftConfirm(false)} activeOpacity={0.7}>
              <Text style={styles.draftBackBtnText}>Revenir à l'édition</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDrafts} animationType="slide" transparent>
        <View style={[styles.draftsModal, { paddingTop: insets.top }]}>
          <View style={styles.draftsHeader}>
            <TouchableOpacity onPress={() => setShowDrafts(false)}>
              <Text style={styles.draftsBackText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.draftsTitle}>Brouillons</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {drafts.length === 0 ? (
              <View style={styles.draftsEmpty}>
                <Text style={styles.draftsEmptyText}>Aucun brouillon</Text>
              </View>
            ) : drafts.map(draft => (
              <TouchableOpacity key={draft.id} style={styles.draftItem} onPress={() => handleLoadDraft(draft.id)} activeOpacity={0.7}>
                <View style={styles.draftItemHeader}>
                  <Text style={styles.draftItemDate}>{new Date(draft.created_at).toLocaleDateString('fr-FR')}</Text>
                  <TouchableOpacity onPress={() => deleteDraft(draft.id)} hitSlop={8}>
                    <Text style={styles.draftItemMore}>•••</Text>
                  </TouchableOpacity>
                </View>
                {draft.content ? <Text style={styles.draftItemContent} numberOfLines={2}>{draft.content}</Text> : null}
                {draft.photos && draft.photos.length > 0 && (
                  <Image source={{ uri: draft.photos[0] }} style={styles.draftItemImage} contentFit="cover" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight,
  },
  cancelText: { color: Colors.dark.primary, fontSize: 15, fontWeight: '500' as const },
  draftsText: { color: Colors.dark.primary, fontSize: 15, fontWeight: '600' as const },
  publishBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 22 },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  composerRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.dark.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  avatarText: { color: Colors.dark.primary, fontSize: 16, fontWeight: '700' as const },
  textInput: { flex: 1, color: Colors.dark.text, fontSize: 17, lineHeight: 24, minHeight: 100, paddingTop: 0 },
  photosContainer: { paddingHorizontal: 16, marginTop: 12, gap: 8 },
  photoItem: { borderRadius: 14, overflow: 'hidden', position: 'relative' as const },
  photoImg: { width: '100%', height: 220, borderRadius: 14 },
  altBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  altBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  photoActions: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6 },
  photoActionBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  photoActionIcon: { fontSize: 14 },
  altInfoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 8, backgroundColor: Colors.dark.surface },
  altInfoIcon: { fontSize: 16 },
  altInfoText: { flex: 1, color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 18 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: Colors.dark.card, borderRadius: 10, padding: 12 },
  videoText: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  linkedMedia: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, backgroundColor: Colors.dark.card, borderRadius: 10, padding: 10, gap: 10 },
  linkedPoster: { width: 32, height: 48, borderRadius: 4 },
  linkedInfo: { flex: 1 },
  linkedTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' as const },
  linkedMeta: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },
  bottomBar: { borderTopWidth: 0.5, borderTopColor: Colors.dark.borderLight, paddingTop: 8, paddingHorizontal: 16, backgroundColor: Colors.dark.background },
  bottomOptions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  bottomOption: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dark.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.dark.borderLight },
  bottomOptionText: { color: Colors.dark.textSecondary, fontSize: 12 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { padding: 8 },
  bottomRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  charCount: { color: Colors.dark.textSecondary, fontSize: 14 },
  charCountLow: { color: Colors.dark.warning },
  charCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.dark.border, overflow: 'hidden', backgroundColor: Colors.dark.border },
  charCircleFill: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: Colors.dark.primary, borderRadius: 11 },
  searchModal: { flex: 1, backgroundColor: Colors.dark.background },
  searchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  searchModalTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.dark.surface, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, borderWidth: 1, borderColor: Colors.dark.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark.text },
  searchResult: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  searchResultPoster: { width: 38, height: 56, borderRadius: 4, marginRight: 12 },
  searchResultInfo: { flex: 1 },
  searchResultTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  searchResultMeta: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingHorizontal: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: Colors.dark.text, fontSize: 20, fontWeight: '700' as const, marginBottom: 6 },
  sheetLabel: { color: Colors.dark.textSecondary, fontSize: 14, marginTop: 12, marginBottom: 10 },
  sheetDesc: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  radioRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  radioOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.dark.card, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.borderLight },
  radioOptionActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryLight },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.dark.textTertiary, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: Colors.dark.primary },
  radioCircleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.dark.primary },
  radioText: { color: Colors.dark.text, fontSize: 14, fontWeight: '500' as const },
  sheetSaveBtn: { backgroundColor: Colors.dark.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  warningCategory: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 10 },
  warningGroup: { backgroundColor: Colors.dark.card, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.borderLight },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.dark.textTertiary, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primary },
  checkboxDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#fff' },
  warningText: { color: Colors.dark.text, fontSize: 15 },
  draftSaveBtn: { backgroundColor: Colors.dark.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  draftSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  draftDiscardBtn: { backgroundColor: Colors.dark.card, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  draftDiscardBtnText: { color: Colors.dark.accent, fontSize: 16, fontWeight: '600' as const },
  draftBackBtn: { backgroundColor: Colors.dark.card, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  draftBackBtnText: { color: Colors.dark.textSecondary, fontSize: 16, fontWeight: '500' as const },
  draftsModal: { flex: 1, backgroundColor: Colors.dark.background },
  draftsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  draftsBackText: { color: Colors.dark.primary, fontSize: 15 },
  draftsTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  draftsEmpty: { alignItems: 'center', paddingVertical: 60 },
  draftsEmptyText: { color: Colors.dark.textSecondary, fontSize: 14 },
  draftItem: { backgroundColor: Colors.dark.card, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.dark.borderLight },
  draftItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  draftItemDate: { color: Colors.dark.textTertiary, fontSize: 12 },
  draftItemMore: { color: Colors.dark.textTertiary, fontSize: 16 },
  draftItemContent: { color: Colors.dark.text, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  draftItemImage: { width: 120, height: 80, borderRadius: 8 },
});