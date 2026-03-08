import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Check, Globe } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getMediaImages } from '@/services/tmdb';
import { usePosterOverride } from '@/providers/PosterOverrideProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = (SCREEN_WIDTH - 48) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

interface TMDBPoster {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
}

interface TMDBPosterPickerProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
}

type LangFilter = 'all' | 'fr' | 'en';

export default function TMDBPosterPicker({
  visible,
  onClose,
  tmdbId,
  mediaType,
  title,
}: TMDBPosterPickerProps) {
  const insets = useSafeAreaInsets();
  const { setTMDBPoster } = usePosterOverride();
  const [posters, setPosters] = useState<TMDBPoster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && tmdbId) {
      loadPosters();
    }
  }, [visible, tmdbId, mediaType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosters = async () => {
    setIsLoading(true);
    setPosters([]);
    try {
      const data = await getMediaImages(mediaType, tmdbId);
      const sorted = [...(data.posters || [])].sort((a, b) => b.vote_average - a.vote_average);
      setPosters(sorted);
      console.log('[TMDBPosterPicker] Loaded', sorted.length, 'posters');
    } catch (e) {
      console.error('[TMDBPosterPicker] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosters = useCallback(() => {
    if (langFilter === 'all') return posters;
    if (langFilter === 'fr') return posters.filter(p => p.iso_639_1 === 'fr' || p.iso_639_1 === null);
    if (langFilter === 'en') return posters.filter(p => p.iso_639_1 === 'en' || p.iso_639_1 === null);
    return posters;
  }, [posters, langFilter]);

  const handleSelect = useCallback((path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPath(prev => prev === path ? null : path);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedPath) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      await setTMDBPoster(tmdbId, mediaType, selectedPath);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.error('[TMDBPosterPicker] Save error:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPath, tmdbId, mediaType, setTMDBPoster, onClose]);

  const LANG_OPTIONS: { key: LangFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'fr', label: 'FR' },
    { key: 'en', label: 'EN' },
  ];

  const displayed = filteredPosters();

  const renderPoster = useCallback(({ item }: { item: TMDBPoster }) => {
    const isSelected = selectedPath === item.file_path;
    const url = `https://image.tmdb.org/t/p/w342${item.file_path}`;
    return (
      <TouchableOpacity
        style={[styles.posterItem, isSelected && styles.posterItemSelected]}
        onPress={() => handleSelect(item.file_path)}
        activeOpacity={0.75}
      >
        <Image
          source={{ uri: url }}
          style={styles.posterImage}
          contentFit="cover"
        />
        {item.iso_639_1 && (
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{item.iso_639_1.toUpperCase()}</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.selectedCheck}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedPath, handleSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Choisir une affiche</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{title}</Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedPath && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedPath || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Choisir</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.langFilterRow}>
          <Globe size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.langFilterLabel}>Langue :</Text>
          <View style={styles.langFilterBtns}>
            {LANG_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.langBtn, langFilter === opt.key && styles.langBtnActive]}
                onPress={() => setLangFilter(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langBtnText, langFilter === opt.key && styles.langBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.countText}>{displayed.length} affiche{displayed.length !== 1 ? 's' : ''}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>Chargement des affiches...</Text>
          </View>
        ) : displayed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune affiche disponible</Text>
            <Text style={styles.emptySub}>Essayez une autre langue</Text>
          </View>
        ) : (
          <FlatList
            data={displayed}
            renderItem={renderPoster}
            keyExtractor={item => item.file_path}
            numColumns={3}
            contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 20 }]}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  headerSub: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  confirmBtn: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.35,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  langFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.borderLight,
  },
  langFilterLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  langFilterBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
  },
  langBtnActive: {
    backgroundColor: Colors.dark.primaryLight,
    borderColor: Colors.dark.primary,
  },
  langBtnText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  langBtnTextActive: {
    color: Colors.dark.primary,
  },
  countText: {
    marginLeft: 'auto',
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptySub: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  grid: {
    padding: 12,
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  posterItem: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  posterItemSelected: {
    borderColor: Colors.dark.primary,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  langBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37,99,235,0.25)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 6,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});