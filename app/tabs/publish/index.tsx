import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, FlatList, Modal, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Search, Star, ChevronLeft, Calendar, ImagePlus, X, AlertTriangle, Video, StarHalf } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { searchMulti, getImageUrl, isTMDBConfigured } from '@/services/tmdb';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/providers/PostProvider';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Alert } from 'react-native';

interface SelectedMedia {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  vote_average: number;
  year: string;
  seasons?: number;
  episodes_per_season?: number[];
}

type RatingMode = 'season' | 'episodes';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function PublishScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { createPost, saveDraft } = usePosts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [ratingMode, setRatingMode] = useState<RatingMode>('season');
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [rating, setRating] = useState(0);
  const [sharePublic, setSharePublic] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [watchDate, setWatchDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [showDateField, setShowDateField] = useState(false);

  const searchResultsQuery = useQuery({
    queryKey: ['publish-search', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: isTMDBConfigured && searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const searchResults = searchResultsQuery.data?.results?.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  )?.slice(0, 10) ?? [];

  const handleSelectMedia = useCallback((item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMedia({
      id: item.id,
      type: item.media_type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      vote_average: item.vote_average ?? 0,
      year: (item.release_date || item.first_air_date || '').substring(0, 4),
      seasons: item.number_of_seasons || 1,
      episodes_per_season: [6],
    });
    setSearchQuery('');
    setSelectedEpisodes([]);
    setRating(0);
  }, []);

  const handleCancel = useCallback(() => {
    if (selectedMedia) {
      setSelectedMedia(null);
      setSearchQuery('');
      setSelectedEpisodes([]);
      setRating(0);
      setRatingMode('season');
      setPhotos([]);
      setVideoUri(null);
      setHasSpoiler(false);
      setReviewText('');
      setShowDateField(false);
    }
  }, [selectedMedia]);

  const toggleEpisode = useCallback((ep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEpisodes(prev =>
      prev.includes(ep) ? prev.filter(e => e !== ep) : [...prev, ep]
    );
  }, []);

  const selectAllEpisodes = useCallback(() => {
    const totalEps = 6;
    setSelectedEpisodes(Array.from({ length: totalEps }, (_, i) => i + 1));
  }, []);

  const clearEpisodes = useCallback(() => {
    setSelectedEpisodes([]);
  }, []);

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
        const newPhotos = result.assets.map(a => a.uri).slice(0, 4 - photos.length);
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (e) {
      console.log('[Publish] Photo pick error:', e);
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
      console.log('[Publish] Video pick error:', e);
    }
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSelectDate = useCallback((day: number) => {
    const newDate = new Date(datePickerYear, datePickerMonth, day);
    setWatchDate(newDate);
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

  const handleSaveDraft = useCallback(() => {
    if (!selectedMedia) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveDraft({
      content: reviewText,
      photos: photos.length > 0 ? photos : undefined,
      video_url: videoUri,
      tmdb_id: selectedMedia.id,
      tmdb_type: selectedMedia.type,
      tmdb_title: selectedMedia.title,
      tmdb_poster: selectedMedia.poster_path,
      tmdb_season: selectedMedia.type === 'tv' ? selectedSeason : null,
      tmdb_episode: ratingMode === 'episodes' && selectedEpisodes.length > 0 ? selectedEpisodes[0] : null,
      has_spoiler: hasSpoiler,
      rating,
    });
    Alert.alert('Brouillon', 'Votre brouillon a été enregistré.');
    handleCancel();
  }, [selectedMedia, reviewText, photos, videoUri, selectedSeason, ratingMode, selectedEpisodes, hasSpoiler, rating, saveDraft, handleCancel]);

  const handleSubmit = useCallback(() => {
    if (!selectedMedia) return;
    if (!reviewText.trim() && photos.length === 0 && !videoUri && rating === 0) {
      Alert.alert('Erreur', 'Ajoutez du contenu, une note, des photos ou une vidéo.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const post = createPost({
      content: reviewText,
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
    if (post) {
      console.log('[Publish] Post created:', post.id);
      Alert.alert('Publié !', 'Votre publication est visible dans le feed.');
    }
    handleCancel();
  }, [selectedMedia, selectedSeason, ratingMode, selectedEpisodes, rating, reviewText, watchDate, photos, videoUri, hasSpoiler, showDateField, handleCancel, createPost]);

  const handleStarPress = useCallback((starIndex: number, isHalf: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    setRating(prev => prev === newRating ? 0 : newRating);
  }, []);

  const renderHalfStarRating = useCallback(() => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i;
      const isHalfStar = rating >= i - 0.5 && rating < i;

      stars.push(
        <View key={i} style={styles.starContainer}>
          <TouchableOpacity
            style={styles.starHalfLeft}
            onPress={() => handleStarPress(i, true)}
            activeOpacity={0.6}
          >
            <View style={styles.starHalfOverlay} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.starHalfRight}
            onPress={() => handleStarPress(i, false)}
            activeOpacity={0.6}
          >
            <View style={styles.starHalfOverlay} />
          </TouchableOpacity>
          <Star
            size={32}
            color={isFull || isHalfStar ? Colors.dark.gold : Colors.dark.textTertiary}
            fill={isFull ? Colors.dark.gold : 'transparent'}
            style={styles.starIcon}
          />
          {isHalfStar && (
            <View style={styles.halfStarMask}>
              <Star
                size={32}
                color={Colors.dark.gold}
                fill={Colors.dark.gold}
              />
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={styles.ratingSection}>
        <View style={styles.starsRow}>{stars}</View>
        {rating > 0 && (
          <Text style={styles.ratingValueText}>{rating}/5</Text>
        )}
      </View>
    );
  }, [rating, handleStarPress]);

  const renderPhotosGrid = useCallback(() => {
    if (photos.length === 0) return null;
    if (photos.length === 1) {
      return (
        <View style={styles.photosSingle}>
          <Image source={{ uri: photos[0] }} style={styles.photoSingleImg} contentFit="cover" />
          <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(0)}>
            <X size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.photosGrid}>
        <View style={styles.photosGridLeft}>
          <View style={styles.photoGridItemLarge}>
            <Image source={{ uri: photos[0] }} style={styles.photoGridImg} contentFit="cover" />
            <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(0)}>
              <X size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.photosGridRight}>
          {photos.slice(1).map((uri, i) => (
            <View key={i} style={styles.photoGridItemSmall}>
              <Image source={{ uri }} style={styles.photoGridImg} contentFit="cover" />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i + 1)}>
                <X size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  }, [photos, removePhoto]);

  if (!selectedMedia) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.searchHeader}>
          <Text style={styles.searchHeaderTitle}>Rechercher</Text>
        </View>
        <View style={styles.searchBarWrap}>
          <Search size={16} color={Colors.dark.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un film ou une série..."
            placeholderTextColor={Colors.dark.textTertiary}
            autoCorrect={false}
            testID="publish-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={Colors.dark.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length < 2 ? (
          <View style={styles.emptySearch}>
            <View style={styles.emptySearchIcon}>
              <Search size={28} color={Colors.dark.textTertiary} />
            </View>
            <Text style={styles.emptySearchText}>Recherchez un film ou une série pour publier</Text>
          </View>
        ) : searchResultsQuery.isLoading ? (
          <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
            renderItem={({ item }: { item: any }) => {
              const posterUrl = getImageUrl(item.poster_path, 'w92');
              return (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleSelectMedia(item)}
                  activeOpacity={0.7}
                >
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.resultPoster} contentFit="cover" />
                  ) : (
                    <View style={[styles.resultPoster, styles.resultPosterEmpty]} />
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {item.media_type === 'tv' ? 'Série' : 'Film'} · {(item.release_date || item.first_air_date || '').substring(0, 4)}
                      {item.vote_average > 0 ? ` · ★ ${item.vote_average.toFixed(1)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  const totalEps = 6;
  const posterUrl = getImageUrl(selectedMedia.poster_path, 'w185');
  const canPublish = reviewText.trim().length > 0 || photos.length > 0 || videoUri || rating > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.postHeader}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.postHeaderTitle}>Nouveau post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPublish && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canPublish}
          activeOpacity={0.7}
        >
          <Text style={styles.postBtnText}>Publier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.postScroll}>
        <View style={styles.composerRow}>
          <View style={styles.composerAvatar}>
            <Text style={styles.composerAvatarText}>
              {profile?.display_name?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.composerInfo}>
            <Text style={styles.composerName}>{profile?.display_name ?? 'User'}</Text>
            <Text style={styles.composerHandle}>@{profile?.username ?? 'user'}</Text>
          </View>
        </View>

        {selectedMedia && (
          <View style={styles.linkedMediaRow}>
            {posterUrl && (
              <Image source={{ uri: posterUrl }} style={styles.linkedPoster} contentFit="cover" />
            )}
            <View style={styles.linkedInfo}>
              <Text style={styles.linkedTitle} numberOfLines={1}>{selectedMedia.title}</Text>
              <Text style={styles.linkedType}>
                {selectedMedia.type === 'tv' ? 'Série TV' : 'Film'} · {selectedMedia.year}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedMedia(null)} hitSlop={8}>
              <X size={16} color={Colors.dark.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={styles.textInput}
          value={reviewText}
          onChangeText={setReviewText}
          placeholder="Partagez votre avis..."
          placeholderTextColor={Colors.dark.textTertiary}
          multiline
          maxLength={500}
          textAlignVertical="top"
          testID="post-content"
        />

        <Text style={styles.charCount}>{reviewText.length}/500</Text>

        {renderPhotosGrid()}

        {videoUri && (
          <View style={styles.videoRow}>
            <Video size={20} color={Colors.dark.text} />
            <Text style={styles.videoText}>Vidéo ajoutée</Text>
            <TouchableOpacity onPress={() => setVideoUri(null)}>
              <X size={16} color={Colors.dark.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {selectedMedia?.type === 'tv' && (
          <View style={styles.tvSection}>
            <Text style={styles.fieldLabel}>Saison</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
              {Array.from({ length: selectedMedia.seasons ?? 1 }, (_, i) => i + 1).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, selectedSeason === s && styles.pillActive]}
                  onPress={() => { setSelectedSeason(s); setSelectedEpisodes([]); }}
                >
                  <Text style={[styles.pillText, selectedSeason === s && styles.pillTextActive]}>S{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, ratingMode === 'season' && styles.modeBtnActive]}
                onPress={() => setRatingMode('season')}
              >
                <Text style={[styles.modeBtnText, ratingMode === 'season' && styles.modeBtnTextActive]}>Saison</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, ratingMode === 'episodes' && styles.modeBtnActive]}
                onPress={() => setRatingMode('episodes')}
              >
                <Text style={[styles.modeBtnText, ratingMode === 'episodes' && styles.modeBtnTextActive]}>Épisodes</Text>
              </TouchableOpacity>
            </View>

            {ratingMode === 'episodes' && (
              <>
                <View style={styles.epsHeader}>
                  <Text style={styles.epsCount}>Épisodes ({selectedEpisodes.length}/{totalEps})</Text>
                  <TouchableOpacity onPress={selectAllEpisodes}>
                    <Text style={styles.epsSelectAll}>Tout</Text>
                  </TouchableOpacity>
                  {selectedEpisodes.length > 0 && (
                    <TouchableOpacity onPress={clearEpisodes}>
                      <Text style={styles.epsClear}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.epsGrid}>
                  {Array.from({ length: totalEps }, (_, i) => i + 1).map(ep => (
                    <TouchableOpacity
                      key={ep}
                      style={[styles.epsCell, selectedEpisodes.includes(ep) && styles.epsCellActive]}
                      onPress={() => toggleEpisode(ep)}
                    >
                      <Text style={[styles.epsCellText, selectedEpisodes.includes(ep) && styles.epsCellTextActive]}>{ep}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Note (optionnel)</Text>
        {renderHalfStarRating()}

        <View style={styles.divider} />

        <View style={styles.optionRow}>
          <AlertTriangle size={16} color={Colors.dark.warning} />
          <Text style={styles.optionLabel}>Contient un spoiler</Text>
          <Switch
            value={hasSpoiler}
            onValueChange={setHasSpoiler}
            trackColor={{ false: Colors.dark.border, true: 'rgba(255, 159, 10, 0.4)' }}
            thumbColor={hasSpoiler ? Colors.dark.warning : Colors.dark.textTertiary}
          />
        </View>

        <View style={styles.optionRow}>
          <Calendar size={16} color={Colors.dark.textSecondary} />
          <Text style={styles.optionLabel}>Date de visionnage</Text>
          <Switch
            value={showDateField}
            onValueChange={setShowDateField}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.primaryDim }}
            thumbColor={showDateField ? Colors.dark.primary : Colors.dark.textTertiary}
          />
        </View>

        {showDateField && (
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <Text style={styles.dateBtnText}>{formattedDate}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <View style={styles.mediaActions}>
          {photos.length === 0 && !videoUri && (
            <>
              <TouchableOpacity style={styles.mediaBtn} onPress={handlePickPhotos} activeOpacity={0.7}>
                <ImagePlus size={18} color={Colors.dark.primary} />
                <Text style={styles.mediaBtnText}>Photos (4 max)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={handlePickVideo} activeOpacity={0.7}>
                <Video size={18} color={Colors.dark.accent} />
                <Text style={[styles.mediaBtnText, { color: Colors.dark.accent }]}>Vidéo</Text>
              </TouchableOpacity>
            </>
          )}
          {photos.length > 0 && photos.length < 4 && (
            <TouchableOpacity style={styles.mediaBtn} onPress={handlePickPhotos} activeOpacity={0.7}>
              <ImagePlus size={16} color={Colors.dark.primary} />
              <Text style={styles.mediaBtnText}>+ Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft} activeOpacity={0.7}>
          <Text style={styles.draftBtnText}>Sauvegarder en brouillon</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showDatePicker} animationType="slide" transparent>
        <View style={dpStyles.overlay}>
          <View style={dpStyles.container}>
            <View style={dpStyles.handle} />
            <View style={dpStyles.header}>
              <TouchableOpacity onPress={() => {
                if (datePickerMonth === 0) {
                  setDatePickerMonth(11);
                  setDatePickerYear(y => y - 1);
                } else {
                  setDatePickerMonth(m => m - 1);
                }
              }}>
                <ChevronLeft size={22} color={Colors.dark.text} />
              </TouchableOpacity>
              <Text style={dpStyles.monthTitle}>{MONTHS_FR[datePickerMonth]} {datePickerYear}</Text>
              <TouchableOpacity onPress={() => {
                if (datePickerMonth === 11) {
                  setDatePickerMonth(0);
                  setDatePickerYear(y => y + 1);
                } else {
                  setDatePickerMonth(m => m + 1);
                }
              }}>
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
                const isToday = day === new Date().getDate() && datePickerMonth === new Date().getMonth() && datePickerYear === new Date().getFullYear();
                return (
                  <TouchableOpacity
                    key={`d-${day}`}
                    style={[dpStyles.dayCell, isSelected && dpStyles.dayCellSelected, isToday && !isSelected && dpStyles.dayCellToday]}
                    onPress={() => handleSelectDate(day)}
                    activeOpacity={0.6}
                  >
                    <Text style={[dpStyles.dayText, isSelected && dpStyles.dayTextSelected, isToday && !isSelected && dpStyles.dayTextToday]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={dpStyles.todayBtn} onPress={() => {
              const now = new Date();
              setWatchDate(now);
              setDatePickerMonth(now.getMonth());
              setDatePickerYear(now.getFullYear());
              setShowDatePicker(false);
            }}>
              <Text style={dpStyles.todayBtnText}>Aujourd'hui</Text>
            </TouchableOpacity>
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
  searchHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchHeaderTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  searchBarWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 8, backgroundColor: Colors.dark.surface, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8, borderWidth: 1, borderColor: Colors.dark.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.dark.text },
  emptySearch: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptySearchIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.dark.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptySearchText: { color: Colors.dark.textSecondary, fontSize: 14, textAlign: 'center' as const, paddingHorizontal: 40 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  resultPoster: { width: 42, height: 62, borderRadius: 5, backgroundColor: Colors.dark.cardElevated },
  resultPosterEmpty: { backgroundColor: Colors.dark.card },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  resultMeta: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 3 },

  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  cancelText: { color: Colors.dark.textSecondary, fontSize: 15, fontWeight: '500' as const },
  postHeaderTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  postBtn: { backgroundColor: Colors.dark.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  postScroll: { paddingHorizontal: 16, paddingTop: 14 },

  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  composerAvatar: { width: 38, height: 38, borderRadius: 8, backgroundColor: Colors.dark.primaryLight, alignItems: 'center', justifyContent: 'center' },
  composerAvatarText: { color: Colors.dark.primary, fontSize: 15, fontWeight: '700' as const },
  composerInfo: {},
  composerName: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  composerHandle: { color: Colors.dark.textTertiary, fontSize: 12 },

  linkedMediaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.card, borderRadius: 10, padding: 10, gap: 10, marginBottom: 12 },
  linkedPoster: { width: 32, height: 48, borderRadius: 4 },
  linkedInfo: { flex: 1 },
  linkedTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' as const },
  linkedType: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },

  textInput: { color: Colors.dark.text, fontSize: 16, lineHeight: 22, minHeight: 80 },
  charCount: { color: Colors.dark.textTertiary, fontSize: 11, textAlign: 'right' as const, marginBottom: 12 },

  photosSingle: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' as const },
  photoSingleImg: { width: '100%', height: 200, borderRadius: 12 },
  photosGrid: { flexDirection: 'row', gap: 4, marginBottom: 12, height: 180 },
  photosGridLeft: { flex: 1 },
  photosGridRight: { flex: 1, gap: 4 },
  photoGridItemLarge: { flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' as const },
  photoGridItemSmall: { flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' as const },
  photoGridImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },

  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.dark.card, borderRadius: 10, padding: 12, marginBottom: 12 },
  videoText: { flex: 1, color: Colors.dark.text, fontSize: 14 },

  tvSection: { marginBottom: 4 },
  fieldLabel: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
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
  epsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  epsCount: { flex: 1, color: Colors.dark.textSecondary, fontSize: 12 },
  epsSelectAll: { color: Colors.dark.primary, fontSize: 12, fontWeight: '600' as const },
  epsClear: { color: Colors.dark.textTertiary, fontSize: 12 },
  epsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  epsCell: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  epsCellActive: { backgroundColor: Colors.dark.primary },
  epsCellText: { color: Colors.dark.textSecondary, fontSize: 15, fontWeight: '600' as const },
  epsCellTextActive: { color: '#fff' },

  divider: { height: 0.5, backgroundColor: Colors.dark.borderLight, marginVertical: 14 },

  ratingSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  starContainer: { width: 36, height: 36, position: 'relative' as const, alignItems: 'center', justifyContent: 'center' },
  starHalfLeft: { position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 },
  starHalfRight: { position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 },
  starHalfOverlay: { flex: 1 },
  starIcon: { position: 'absolute' as const },
  halfStarMask: { position: 'absolute', left: 0, top: 2, width: 16, height: 32, overflow: 'hidden' },
  ratingValueText: { color: Colors.dark.gold, fontSize: 16, fontWeight: '700' as const },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  optionLabel: { flex: 1, color: Colors.dark.text, fontSize: 14 },

  dateBtn: { backgroundColor: Colors.dark.card, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginBottom: 4 },
  dateBtnText: { color: Colors.dark.text, fontSize: 14 },

  mediaActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.dark.card },
  mediaBtnText: { color: Colors.dark.primary, fontSize: 13, fontWeight: '600' as const },

  draftBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: Colors.dark.border },
  draftBtnText: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '600' as const },
});

const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center' as const, color: Colors.dark.textTertiary, fontSize: 13, fontWeight: '600' as const },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' as const },
  dayCell: { width: '14.28%' as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: Colors.dark.primary, borderRadius: 20 },
  dayCellToday: { borderWidth: 1.5, borderColor: Colors.dark.primary, borderRadius: 20 },
  dayText: { color: Colors.dark.text, fontSize: 15 },
  dayTextSelected: { color: '#fff', fontWeight: '700' as const },
  dayTextToday: { color: Colors.dark.primary, fontWeight: '600' as const },
  todayBtn: { alignSelf: 'center', marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: Colors.dark.primaryLight, borderRadius: 20 },
  todayBtnText: { color: Colors.dark.primary, fontSize: 14, fontWeight: '600' as const },
  closeBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 10 },
  closeBtnText: { color: Colors.dark.textSecondary, fontSize: 14 },
});