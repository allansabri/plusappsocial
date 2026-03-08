import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { getPopularMovies, getImageUrl } from '@/services/tmdb';
import { useOnboarding } from '@/providers/OnboardingProvider';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const COLS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - GRID_GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const MAX_SELECTION = 5;

export default function FavoriteMoviesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: onboardingData, updateData } = useOnboarding();
  const [selected, setSelected] = useState<number[]>(onboardingData.favoriteMovies);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-popular-movies'],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getPopularMovies(1),
        getPopularMovies(2),
      ]);
      return [...(page1.results || []), ...(page2.results || [])].slice(0, 20);
    },
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const toggleMovie = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  };

  const handleContinue = () => {
    updateData({ favoriteMovies: selected });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/favorite-series' as any);
  };

  const movies = data || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Preferences</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{selected.length}/{MAX_SELECTION}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '50%' }]} />
      </View>

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Choose 5 Favorite{'\n'}Movies</Text>
          <Text style={styles.subtitle}>
            Select exactly 5 movies you love. This helps us personalize your experience.
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.dark.primary} />
            </View>
          ) : (
            <View style={styles.grid}>
              {movies.map((movie: any) => {
                const isSelected = selected.includes(movie.id);
                return (
                  <TouchableOpacity
                    key={movie.id}
                    style={[styles.movieCard, isSelected && styles.movieCardSelected]}
                    onPress={() => toggleMovie(movie.id)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: getImageUrl(movie.poster_path, 'w342') || '' }}
                      style={styles.poster}
                      contentFit="cover"
                    />
                    {isSelected && (
                      <View style={styles.selectedOverlay}>
                        <View style={styles.checkCircle}>
                          <Check size={18} color="#fff" strokeWidth={3} />
                        </View>
                      </View>
                    )}
                    {!isSelected && selected.length >= MAX_SELECTION && (
                      <View style={styles.disabledOverlay} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.continueButton, selected.length !== MAX_SELECTION && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selected.length !== MAX_SELECTION}
          activeOpacity={0.8}
          testID="movies-continue"
        >
          <Text style={styles.continueText}>
            {selected.length === MAX_SELECTION ? 'Continue' : `Select ${MAX_SELECTION - selected.length} more`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  counterBadge: {
    backgroundColor: Colors.dark.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  movieCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  movieCardSelected: {
    borderColor: Colors.dark.primary,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.dark.background,
  },
  continueButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});