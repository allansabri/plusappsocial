import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Platform, KeyboardAvoidingView,
  ActivityIndicator, FlatList, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import {
  X, ImagePlus, Camera, Search, Star, AlertTriangle,
  ChevronLeft, Calendar, Video,
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

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface SelectedMedia {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  year: string;
  seasons?: number;
}

type RatingMode = 'season' | 'episodes';

export default function CreateReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { createPost, saveDraft } = usePosts();

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [ratingMode, setRatingMode] = useState<RatingMode>('season');
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [showDateField, setShowDateField] = useState(false);
  const [watchDate, setWatchDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());

  const searchResultsQuery = useQuery({
    queryKey: ['review-search', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: isTMDBConfigured && searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const searchResults = searchResultsQuery.data?.results?.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  )?.slice(0, 10) ?? [];

  const maxChars = 500;
  const remaining = maxChars - content.length;
  const totalEps = 6;

  const canPublish = selectedMedia && (content.trim().length > 0 || rating > 0 || photos.length > 0 || videoUri);

  const handleSelectMedia = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedia({
      id: item.id,
      type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      year: (item.release_date || item.first_air_date || '').substring(0, 4),
      seasons: item.number_of_seasons || 1,
    });
    setSearchQuery('');
    setSelectedEpisodes([]);
    setRating(0);
  }, []);

  const handleStarPress = useCallback((starIndex: number, isHalf: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    setRating(prev => prev === newRating ? 0 : newRating);
  }, []);

  const handlePickPhotos = useCallback(async () => {
    if (videoUri || photos.length >= 4) return;
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
      console.log('[CreateReview] Photo pick error:', e);
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
      console.log('[CreateReview] Video pick error:', e);
    }
  }, [photos.length]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handlePublish = useCallback(() => {
    if (!canPublish || !selectedMedia) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost({
      content,
      photos: photos.length > 0 ? photos : undefined,
      video_url: videoUri,
      tmdb_id: selectedMedia.id,
      tmdb_type: selectedMedia.type,
      tmdb_title: selectedMedia.title,
      tmdb_poster: selectedMedia.poster_path,
      tmdb_season: selectedMedia.type === 'tv' ? selectedSeason : null,
      tmdb_episode: ratingMode === 'episodes' && selectedEpisodes.length > 0 ? selectedEpisodes[0] : null,
      has_spoiler: hasSpoiler,
      rating: rating > 0 ? rating : undefined,
      watch_date: showDateField ? watchDate.toISOString() : null,
    });
    router.back();
  }, [canPublish, selectedMedia, content, photos, videoUri, selectedSeason, ratingMode, selectedEpisodes, hasSpoiler, rating, showDateField, watchDate, createPost, router]);

  const toggleEpisode = useCallback((ep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEpisodes(prev => prev.includes(ep) ? prev.filter(e => e !== ep) : [...prev, ep]);
  }, []);

  const handleSelectDate = useCallback((day: number) => {
    setWatchDate(new Date(datePickerYear, datePickerMonth, day));
    setShowDatePicker(false);
  }, [datePickerYear, datePickerMonth]);

  const formattedDate = useMemo(() => {
    return watchDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [watchDate]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(datePickerYear, datePickerMonth);
    const firstDay = new Date(datePickerYear, datePickerMonth, 1).getDay();
    const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
    const cells: (number | null)[] = [];
    for (let i = 0; i < adjustedFirst; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    return cells;
  }, [datePickerYear, datePickerMonth]);

  const renderStars = useCallback(() => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i;
      const isHalfStar = rating >= i - 0.5 && rating < i;
      stars.push(
        <View key={i} style={styles.starWrap}>
          <TouchableOpacity style={styles.starHalfLeft} onPress={() => handleStarPress(i, true)} activeOpacity={0.6}>
            <View style={styles.starTapArea} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.starHalfRight} onPress={() => handleStarPress(i, false)} activeOpacity={0.6}>
            <View style={styles.starTapArea} />
          </TouchableOpacity>
          <Star
            size={34}
            color={isFull || isHalfStar ? Colors.dark.gold : Colors.dark.textTertiary}
            fill={isFull ? Colors.dark.gold : 'transparent'}
            style={styles.starIcon}
          />
          {isHalfStar && (
            <View style={styles.halfMask}>
              <Star size={34} color={Colors.dark.gold} fill={Colors.dark.gold} />
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={styles.starsContainer}>
        <View style={styles.starsRow}>{stars}</View>
        {rating > 0 && <Text style={styles.ratingValue}>{rating}/5</Text>}
      </View>
    );
  }, [rating, handleStarPress]);

  if (!selectedMedia) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} hitSlop={12}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvel avis</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Choisissez un film ou une série</Text>
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
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={Colors.dark.textTertiary} /></TouchableOpacity>
            )}
          </View>
          {searchResultsQuery.isLoading && <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 20 }} />}
          <FlatList
            data={searchResults}
            keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity style={styles.searchResult} onPress={() => handleSelectMedia(item)} activeOpacity={0.7}>
                {item.poster_path && (
                  <Image source={{ uri: getImageUrl(item.poster_path, 'w92') ?? '' }} style={styles.resultPoster} contentFit="cover" />
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{item.title || item.name}</Text>
                  <Text style={styles.resultMeta}>
                    {item.media_type === 'tv' ? 'Série' : 'Film'} · {(item.release_date || item.first_air_date || '').substring(0, 4)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    );
  }

  const posterUrl = getImageUrl(selectedMedia.poster_path, 'w185');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avis</Text>
        <TouchableOpacity
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={!canPublish}
          activeOpacity={0.7}
        >
          <Text style={styles.publishBtnText}>Publier</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}>
          <View style={styles.mediaCard}>
            {posterUrl && <Image source={{ uri: posterUrl }} style={styles.mediaPoster} contentFit="cover" />}
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle}>{selectedMedia.title}</Text>
              <Text style={styles.mediaType}>{selectedMedia.type === 'tv' ? 'Série TV' : 'Film'} · {selectedMedia.year}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedMedia(null)} hitSlop={8}>
              <X size={18} color={Colors.dark.textTertiary} />
            </TouchableOpacity>
          </View>

          {selectedMedia.type === 'tv' && (
            <View style={styles.tvSection}>
              <Text style={styles.sectionLabel}>Saison</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {Array.from({ length: selectedMedia.seasons ?? 1 }, (_, i) => i + 1).map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, selectedSeason === s && styles.pillActive]} onPress={() => { setSelectedSeason(s); setSelectedEpisodes([]); }}>
                    <Text style={[styles.pillText, selectedSeason === s && styles.pillTextActive]}>S{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modeToggle}>
                <TouchableOpacity style={[styles.modeBtn, ratingMode === 'season' && styles.modeBtnActive]} onPress={() => setRatingMode('season')}>
                  <Text style={[styles.modeBtnText, ratingMode === 'season' && styles.modeBtnTextActive]}>Saison entière</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, ratingMode === 'episodes' && styles.modeBtnActive]} onPress={() => setRatingMode('episodes')}>
                  <Text style={[styles.modeBtnText, ratingMode === 'episodes' && styles.modeBtnTextActive]}>Épisodes</Text>
                </TouchableOpacity>
              </View>

              {ratingMode === 'episodes' && (
                <View style={styles.epsGrid}>
                  {Array.from({ length: totalEps }, (_, i) => i + 1).map(ep => (
                    <TouchableOpacity key={ep} style={[styles.epsCell, selectedEpisodes.includes(ep) && styles.epsCellActive]} onPress={() => toggleEpisode(ep)}>
                      <Text style={[styles.epsCellText, selectedEpisodes.includes(ep) && styles.epsCellTextActive]}>Ep.{ep}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Note</Text>
          {renderStars()}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Votre avis</Text>
          <TextInput
            style={styles.reviewInput}
            value={content}
            onChangeText={t => { if (t.length <= maxChars) setContent(t); }}
            placeholder="Partagez votre avis..."
            placeholderTextColor={Colors.dark.textTertiary}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{remaining}/{maxChars}</Text>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoThumbImg} contentFit="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {videoUri && (
            <View style={styles.videoRow}>
              <Video size={18} color={Colors.dark.text} />
              <Text style={styles.videoText}>Vidéo ajoutée</Text>
              <TouchableOpacity onPress={() => setVideoUri(null)}><X size={16} color={Colors.dark.textTertiary} /></TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <AlertTriangle size={16} color={Colors.dark.warning} />
            <Text style={styles.optionLabel}>Contient un spoiler</Text>
            <Switch value={hasSpoiler} onValueChange={setHasSpoiler} trackColor={{ false: Colors.dark.border, true: 'rgba(255, 159, 10, 0.4)' }} thumbColor={hasSpoiler ? Colors.dark.warning : Colors.dark.textTertiary} />
          </View>

          <View style={styles.optionRow}>
            <Calendar size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.optionLabel}>Date de visionnage</Text>
            <Switch value={showDateField} onValueChange={setShowDateField} trackColor={{ false: Colors.dark.border, true: Colors.dark.primaryDim }} thumbColor={showDateField ? Colors.dark.primary : Colors.dark.textTertiary} />
          </View>

          {showDateField && (
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={styles.dateBtnText}>{formattedDate}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <View style={styles.mediaActions}>
            <TouchableOpacity style={styles.mediaBtn} onPress={handlePickPhotos} activeOpacity={0.7}>
              <ImagePlus size={18} color={Colors.dark.primary} />
              <Text style={styles.mediaBtnText}>Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={handlePickVideo} activeOpacity={0.7}>
              <Video size={18} color={Colors.dark.accent} />
              <Text style={[styles.mediaBtnText, { color: Colors.dark.accent }]}>Vidéo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showDatePicker} animationType="slide" transparent>
        <View style={dpStyles.overlay}>
          <View style={[dpStyles.container, { paddingBottom: insets.bottom + 20 }]}>
            <View style={dpStyles.handle} />
            <View style={dpStyles.header}>
              <TouchableOpacity onPress={() => { if (datePickerMonth === 0) { setDatePickerMonth(11); setDatePickerYear(y => y - 1); } else { setDatePickerMonth(m => m - 1); } }}>
                <ChevronLeft size={22} color={Colors.dark.text} />
              </TouchableOpacity>
              <Text style={dpStyles.monthTitle}>{MONTHS_FR[datePickerMonth]} {datePickerYear}</Text>
              <TouchableOpacity onPress={() => { if (datePickerMonth === 11) { setDatePickerMonth(0); setDatePickerYear(y => y + 1); } else { setDatePickerMonth(m => m + 1); } }}>
                <ChevronLeft size={22} color={Colors.dark.text} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
            <View style={dpStyles.weekHeader}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <Text key={i} style={dpStyles.weekDay}>{d}</Text>
              ))}
            </View>
            <View style={dpStyles.daysGrid}>
              {calendarDays.map((day, i) => {
                if (day === null) return <View key={`e-${i}`} style={dpStyles.dayCell} />;
                const isSelected = day === watchDate.getDate() && datePickerMonth === watchDate.getMonth() && datePickerYear === watchDate.getFullYear();
                return (
                  <TouchableOpacity key={`d-${day}`} style={[dpStyles.dayCell, isSelected && dpStyles.dayCellSelected]} onPress={() => handleSelectDate(day)} activeOpacity={0.6}>
                    <Text style={[dpStyles.dayText, isSelected && dpStyles.dayTextSelected]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={dpStyles.closeBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={dpStyles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  cancelText: { color: Colors.dark.primary, fontSize: 15, fontWeight: '500' as const },
  headerTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  publishBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 22 },
  publishBtnDisabled: { opacity: 0.4 },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  searchSection: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  searchLabel: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surface, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark.text },
  searchResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  resultPoster: { width: 42, height: 62, borderRadius: 5, marginRight: 12 },
  resultInfo: { flex: 1 },
  resultTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  resultMeta: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 3 },
  mediaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, borderRadius: 12, padding: 12, gap: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.borderLight },
  mediaPoster: { width: 44, height: 64, borderRadius: 6 },
  mediaInfo: { flex: 1 },
  mediaTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' as const },
  mediaType: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 2 },
  tvSection: { marginBottom: 4 },
  sectionLabel: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const, marginBottom: 10 },
  pillsRow: { marginBottom: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.dark.card, marginRight: 8 },
  pillActive: { backgroundColor: Colors.dark.primary },
  pillText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600' as const },
  pillTextActive: { color: '#fff' },
  modeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.dark.card },
  modeBtnActive: { backgroundColor: Colors.dark.primary },
  modeBtnText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600' as const },
  modeBtnTextActive: { color: '#fff' },
  epsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  epsCell: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.dark.card },
  epsCellActive: { backgroundColor: Colors.dark.primary },
  epsCellText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600' as const },
  epsCellTextActive: { color: '#fff' },
  divider: { height: 0.5, backgroundColor: Colors.dark.borderLight, marginVertical: 14 },
  starsContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  starWrap: { width: 38, height: 38, position: 'relative' as const, alignItems: 'center', justifyContent: 'center' },
  starHalfLeft: { position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 },
  starHalfRight: { position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 },
  starTapArea: { flex: 1 },
  starIcon: { position: 'absolute' as const },
  halfMask: { position: 'absolute', left: 0, top: 2, width: 17, height: 34, overflow: 'hidden' },
  ratingValue: { color: Colors.dark.gold, fontSize: 18, fontWeight: '700' as const },
  reviewInput: { color: Colors.dark.text, fontSize: 16, lineHeight: 22, minHeight: 80, backgroundColor: Colors.dark.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.dark.borderLight },
  charCount: { color: Colors.dark.textTertiary, fontSize: 11, textAlign: 'right' as const, marginTop: 6 },
  photosRow: { marginTop: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8, position: 'relative' as const },
  photoThumbImg: { width: 80, height: 80, borderRadius: 8 },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.dark.card, borderRadius: 10, padding: 12, marginTop: 12 },
  videoText: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  optionLabel: { flex: 1, color: Colors.dark.text, fontSize: 14 },
  dateBtn: { backgroundColor: Colors.dark.card, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginBottom: 4 },
  dateBtnText: { color: Colors.dark.text, fontSize: 14 },
  mediaActions: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.dark.card },
  mediaBtnText: { color: Colors.dark.primary, fontSize: 13, fontWeight: '600' as const },
});

const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center' as const, color: Colors.dark.textTertiary, fontSize: 13, fontWeight: '600' as const },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' as const },
  dayCell: { width: '14.28%' as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: Colors.dark.primary, borderRadius: 20 },
  dayText: { color: Colors.dark.text, fontSize: 15 },
  dayTextSelected: { color: '#fff', fontWeight: '700' as const },
  closeBtn: { alignSelf: 'center', marginTop: 16, paddingVertical: 10 },
  closeBtnText: { color: Colors.dark.textSecondary, fontSize: 14 },
});