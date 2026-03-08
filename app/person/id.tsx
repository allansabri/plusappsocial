import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import {
  getPersonDetails, getPersonCredits, getImageUrl, isTMDBConfigured,
} from '@/services/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 20) / 3;

function formatBirthDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const numericId = Number(id);

  const personQuery = useQuery({
    queryKey: ['person', numericId],
    queryFn: () => getPersonDetails(numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const creditsQuery = useQuery({
    queryKey: ['personCredits', numericId],
    queryFn: () => getPersonCredits(numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const person = personQuery.data;
  const allCredits = creditsQuery.data?.cast ?? [];

  const movieCredits = useMemo(() => {
    const movies = allCredits
      .filter((c: any) => c.media_type === 'movie' && c.poster_path)
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
    const seen = new Set<number>();
    return movies.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [allCredits]);

  const tvCredits = useMemo(() => {
    const shows = allCredits
      .filter((c: any) => c.media_type === 'tv' && c.poster_path)
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
    const seen = new Set<number>();
    return shows.filter((s: any) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [allCredits]);

  const navigateToMedia = useCallback((mediaId: number, mediaType: string) => {
    router.push(`/media/${mediaId}?type=${mediaType}` as any);
  }, [router]);

  const profileUrl = getImageUrl(person?.profile_path, 'w342');
  const department = person?.known_for_department || '';
  const birthDate = formatBirthDate(person?.birthday);
  const birthPlace = person?.place_of_birth || '';
  const biography = person?.biography || '';

  if (personQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
      </View>
    );
  }

  if (personQuery.isError || !person) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Impossible de charger les détails</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => personQuery.refetch()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{person.name}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            {profileUrl ? (
              <Image
                source={{ uri: profileUrl }}
                style={styles.profilePhoto}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <Text style={styles.profileInitial}>
                  {person.name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              {department ? (
                <Text style={styles.department}>{department}</Text>
              ) : null}
              {birthDate ? (
                <Text style={styles.birthInfo}>Né(e) le {birthDate}</Text>
              ) : null}
              {birthPlace ? (
                <Text style={styles.birthInfo} numberOfLines={2}>{birthPlace}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {biography ? (
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Biographie</Text>
            <Text style={styles.bioText}>{biography}</Text>
          </View>
        ) : null}

        {movieCredits.length > 0 && (
          <View style={styles.creditsSection}>
            <Text style={styles.sectionTitle}>Films</Text>
            <View style={styles.creditsGrid}>
              {movieCredits.slice(0, 12).map((credit: any) => (
                <TouchableOpacity
                  key={`movie-${credit.id}-${credit.credit_id || credit.character}`}
                  style={styles.creditCard}
                  onPress={() => navigateToMedia(credit.id, 'movie')}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getImageUrl(credit.poster_path, 'w185') ?? '' }}
                    style={styles.creditPoster}
                    contentFit="cover"
                  />
                  <Text style={styles.creditTitle} numberOfLines={1}>
                    {credit.title}
                  </Text>
                  {credit.character ? (
                    <Text style={styles.creditRole} numberOfLines={1}>
                      {credit.character}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tvCredits.length > 0 && (
          <View style={styles.creditsSection}>
            <Text style={styles.sectionTitle}>Séries</Text>
            <View style={styles.creditsGrid}>
              {tvCredits.slice(0, 12).map((credit: any) => (
                <TouchableOpacity
                  key={`tv-${credit.id}-${credit.credit_id || credit.character}`}
                  style={styles.creditCard}
                  onPress={() => navigateToMedia(credit.id, 'tv')}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getImageUrl(credit.poster_path, 'w185') ?? '' }}
                    style={styles.creditPoster}
                    contentFit="cover"
                  />
                  <Text style={styles.creditTitle} numberOfLines={1}>
                    {credit.name}
                  </Text>
                  {credit.character ? (
                    <Text style={styles.creditRole} numberOfLines={1}>
                      {credit.character}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  retryBtn: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.dark.background,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '800' as const,
    textAlign: 'left',
    marginLeft: 4,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 16,
  },
  profilePhoto: {
    width: 110,
    height: 140,
    backgroundColor: Colors.dark.cardElevated,
  },
  profilePhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: Colors.dark.textTertiary,
    fontSize: 36,
    fontWeight: '700' as const,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  department: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  birthInfo: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  bioText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  creditsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  creditsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  creditCard: {
    width: CARD_WIDTH,
    marginBottom: 4,
  },
  creditPoster: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    backgroundColor: Colors.dark.card,
  },
  creditTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 6,
    textAlign: 'center',
  },
  creditRole: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});