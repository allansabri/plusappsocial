import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar, Bell, BellOff } from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { getSeriesDetails, getImageUrl } from '@/services/tmdb';
import { useTrackedShowsStore } from '@/stores/trackedShowsStore';
import { useWatchlist } from '@/providers/WatchlistProvider';

interface UpcomingEpisode {
  showId: number;
  showName: string;
  posterPath: string | null;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  airDate: string;
}

function formatFrenchDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${dayName} ${day} ${month}`;
}

function getCountdown(dateStr: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Aujourd'hui", color: Colors.dark.success };
  if (diffDays === 1) return { text: 'Demain', color: Colors.dark.primary };
  if (diffDays < 7) return { text: `Dans ${diffDays} jours`, color: Colors.dark.primary };
  if (diffDays < 14) {
    const weeks = Math.floor(diffDays / 7);
    return { text: weeks === 1 ? 'Dans 1 semaine' : `Dans ${weeks} semaines`, color: Colors.dark.warning };
  }
  const weeks = Math.floor(diffDays / 7);
  return { text: `Dans ${weeks} semaine${weeks > 1 ? 's' : ''}`, color: Colors.dark.textSecondary };
}

function UpcomingEpisodeCard({ item }: { item: UpcomingEpisode }) {
  const router = useRouter();
  const { toggleTrackedShow, trackedShowIds } = useTrackedShowsStore();
  const isTracked = trackedShowIds.includes(item.showId);
  const countdown = getCountdown(item.airDate);
  const posterUri = getImageUrl(item.posterPath, 'w154');

  const handlePress = useCallback(() => {
    router.push(`/media/${item.showId}?type=tv` as any);
  }, [item.showId, router]);

  const handleToggleTrack = useCallback(() => {
    console.log('[Upcoming] Toggle tracked show:', item.showId);
    toggleTrackedShow(item.showId);
  }, [item.showId, toggleTrackedShow]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={handlePress}
      testID={`upcoming-card-${item.showId}`}
    >
      <View style={styles.posterContainer}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterPlaceholderText}>?</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.showName} numberOfLines={1}>{item.showName}</Text>
        <Text style={styles.episodeInfo} numberOfLines={1}>
          S{item.seasonNumber} E{item.episodeNumber}
          {item.episodeName ? `  ${item.episodeName}` : ''}
        </Text>
        <View style={styles.countdownRow}>
          <Text style={[styles.countdownText, { color: countdown.color }]}>
            {countdown.text}
          </Text>
          <Text style={styles.dateSeparator}> · </Text>
          <Text style={styles.dateText}>{formatFrenchDate(item.airDate)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bellBtn}
        onPress={handleToggleTrack}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        testID={`track-btn-${item.showId}`}
      >
        {isTracked ? (
          <Bell size={20} color={Colors.dark.primary} />
        ) : (
          <BellOff size={20} color={Colors.dark.textTertiary} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const MemoizedCard = React.memo(UpcomingEpisodeCard);

const FALLBACK_SHOW_IDS = [
  136315, 94954, 76479, 84773, 114472,
  60735, 1399, 93405, 111110, 125988,
];

export default function UpcomingEpisodes() {
  const { watchlist } = useWatchlist();

  const watchlistTvIds = useMemo(() => {
    const tvItems = watchlist.filter(w => w.tmdb_type === 'tv');
    return tvItems.map(w => w.tmdb_id);
  }, [watchlist]);

  const showIdsToFetch = useMemo(() => {
    const combined = new Set<number>([...watchlistTvIds, ...FALLBACK_SHOW_IDS]);
    return Array.from(combined);
  }, [watchlistTvIds]);

  const { data: episodes, isLoading, error } = useQuery({
    queryKey: ['upcomingEpisodes', showIdsToFetch],
    queryFn: async () => {
      console.log('[Upcoming] Fetching upcoming episodes for', showIdsToFetch.length, 'shows');
      const results = await Promise.allSettled(
        showIdsToFetch.map(id => getSeriesDetails(id))
      );

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 90);

      const upcoming: UpcomingEpisode[] = [];

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const show = result.value;
        if (!show?.next_episode_to_air?.air_date) continue;

        const airDate = new Date(show.next_episode_to_air.air_date + 'T00:00:00');
        if (airDate >= now && airDate <= maxDate) {
          upcoming.push({
            showId: show.id,
            showName: show.name,
            posterPath: show.poster_path,
            seasonNumber: show.next_episode_to_air.season_number,
            episodeNumber: show.next_episode_to_air.episode_number,
            episodeName: show.next_episode_to_air.name || `Épisode ${show.next_episode_to_air.episode_number}`,
            airDate: show.next_episode_to_air.air_date,
          });
        }
      }

      upcoming.sort((a, b) => {
        const aInWatchlist = watchlistTvIds.includes(a.showId) ? 0 : 1;
        const bInWatchlist = watchlistTvIds.includes(b.showId) ? 0 : 1;
        if (aInWatchlist !== bInWatchlist) return aInWatchlist - bInWatchlist;
        return new Date(a.airDate).getTime() - new Date(b.airDate).getTime();
      });
      console.log('[Upcoming] Found', upcoming.length, 'upcoming episodes');
      return upcoming;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const renderItem = useCallback(({ item }: { item: UpcomingEpisode }) => (
    <MemoizedCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: UpcomingEpisode) => `upcoming-${item.showId}`, []);

  const episodeCount = episodes?.length ?? 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Chargement des prochains épisodes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Impossible de charger les épisodes à venir</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={20} color={Colors.dark.primary} />
          <Text style={styles.headerTitle}>Prochains épisodes</Text>
        </View>
        <Text style={styles.headerCount}>
          {episodeCount} épisode{episodeCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {episodeCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun épisode à venir</Text>
          <Text style={styles.emptySubText}>Ajoutez des séries à votre watchlist pour suivre les prochains épisodes</Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  headerCount: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 12,
    marginBottom: 10,
  },
  posterContainer: {
    overflow: 'hidden',
  },
  poster: {
    width: 56,
    height: 80,
  },
  posterPlaceholder: {
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    color: Colors.dark.textTertiary,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  showName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 3,
  },
  episodeInfo: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '400' as const,
    marginBottom: 5,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dateSeparator: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
  },
  dateText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '400' as const,
  },
  bellBtn: {
    padding: 8,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  emptySubText: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});