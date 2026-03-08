import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Film } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { discoverByGenre, getNowPlaying, getImageUrl } from '@/services/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_GAP = 10;
const ITEM_WIDTH = (SCREEN_WIDTH - 32 - ITEM_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

type CategoryFilter = 'all' | 'movie' | 'tv';

export default function CategoryScreen() {
  const { slug, genreId, tvGenreId, name, special } = useLocalSearchParams<{
    slug: string;
    genreId: string;
    tvGenreId: string;
    name: string;
    special: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const isSpecialNowPlaying = special === 'now_playing';
  const movieGenreId = Number(genreId) || 0;
  const tvGenreIdNum = Number(tvGenreId) || movieGenreId;
  const displayName = name || slug || 'Catégorie';

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['category', slug, genreId, filter],
    queryFn: async ({ pageParam = 1 }) => {
      console.log('[Category] Fetching page', pageParam, 'filter:', filter, 'genre:', genreId);

      if (isSpecialNowPlaying) {
        const data = await getNowPlaying();
        return {
          results: (data.results || []).map((m: any) => ({ ...m, media_type: 'movie' })),
          page: 1,
          total_pages: 1,
        };
      }

      if (filter === 'movie') {
        const data = await discoverByGenre(movieGenreId, 'movie', pageParam);
        return {
          results: (data.results || []).map((m: any) => ({ ...m, media_type: 'movie' })),
          page: data.page,
          total_pages: data.total_pages,
        };
      }

      if (filter === 'tv') {
        const data = await discoverByGenre(tvGenreIdNum, 'tv', pageParam);
        return {
          results: (data.results || []).map((t: any) => ({ ...t, media_type: 'tv' })),
          page: data.page,
          total_pages: data.total_pages,
        };
      }

      const [movies, tvShows] = await Promise.all([
        discoverByGenre(movieGenreId, 'movie', pageParam),
        discoverByGenre(tvGenreIdNum, 'tv', pageParam),
      ]);

      const combined = [
        ...(movies.results || []).map((m: any) => ({ ...m, media_type: 'movie' })),
        ...(tvShows.results || []).map((t: any) => ({ ...t, media_type: 'tv' })),
      ].sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

      return {
        results: combined,
        page: pageParam,
        total_pages: Math.max(movies.total_pages, tvShows.total_pages),
      };
    },
    getNextPageParam: (lastPage) => {
      if (isSpecialNowPlaying) return undefined;
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const allItems = useMemo(() => {
    if (!infiniteQuery.data) return [];
    const items = infiniteQuery.data.pages.flatMap(p => p.results);
    const seen = new Set<string>();
    return items.filter((item: any) => {
      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [infiniteQuery.data]);

  const handleEndReached = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  const navigateToDetail = useCallback((id: number, mediaType: string) => {
    router.push(`/media/${id}?type=${mediaType}` as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const posterUrl = getImageUrl(item.poster_path, 'w185');
    const title = item.title || item.name || '';

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => navigateToDetail(item.id, item.media_type || 'movie')}
        activeOpacity={0.7}
      >
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.itemPoster} contentFit="cover" />
        ) : (
          <View style={[styles.itemPoster, styles.itemPosterPlaceholder]}>
            <Film size={24} color={Colors.dark.textTertiary} />
          </View>
        )}
        <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>
    );
  }, [navigateToDetail]);

  const renderFooter = useCallback(() => {
    if (!infiniteQuery.isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Colors.dark.primary} />
      </View>
    );
  }, [infiniteQuery.isFetchingNextPage]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayName}</Text>
      </View>

      {!isSpecialNowPlaying && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'movie' && styles.filterPillActive]}
            onPress={() => setFilter('movie')}
          >
            <Text style={[styles.filterText, filter === 'movie' && styles.filterTextActive]}>Films</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'tv' && styles.filterPillActive]}
            onPress={() => setFilter('tv')}
          >
            <Text style={[styles.filterText, filter === 'tv' && styles.filterTextActive]}>Séries</Text>
          </TouchableOpacity>
        </View>
      )}

      {infiniteQuery.isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.dark.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={allItems}
          numColumns={COLUMN_COUNT}
          keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
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
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterPillActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  columnWrapper: {
    gap: ITEM_GAP,
    marginBottom: 16,
  },
  itemContainer: {
    width: ITEM_WIDTH,
  },
  itemPoster: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    borderRadius: 0,
    backgroundColor: Colors.dark.card,
  },
  itemPosterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
    lineHeight: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});