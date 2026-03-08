import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, Linking,
} from 'react-native';
import {
  Search, X, TrendingUp, Clapperboard, Tv, Star, Play, Film,
  Calendar, ChevronLeft, ChevronRight, Bell, BellOff, Clock,
  Heart, Zap, Shield,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import MovieCard from '@/components/MovieCard';
import {
  searchMulti, getTrending, getNowPlaying, getImageUrl, getBackdropUrl,
  isTMDBConfigured, getTrendingDay, getUpcomingMovies, getUpcomingTVShows,
  discoverByProvider, getVideos, discoverUpcoming,
  getPopularByProvider, discoverByGenreAndRegion, getPopularSeries,
} from '@/services/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DiscoverTab = 'decouvrir' | 'a_venir' | 'streaming' | 'genres';
type UpcomingFilter = 'all' | 'movie' | 'tv';

const TABS: { key: DiscoverTab; label: string }[] = [
  { key: 'decouvrir', label: 'Découvrir' },
  { key: 'a_venir', label: 'À venir' },
  { key: 'streaming', label: 'Streaming' },
  { key: 'genres', label: 'Genres' },
];

const GENRES = [
  { id: 28, tvId: 10759, name: 'Action', slug: 'action' },
  { id: 12, tvId: 10759, name: 'Aventure', slug: 'aventure' },
  { id: 16, tvId: 16, name: 'Animation', slug: 'animation' },
  { id: 35, tvId: 35, name: 'Comédie', slug: 'comedie' },
  { id: 80, tvId: 80, name: 'Crime', slug: 'crime' },
  { id: 99, tvId: 99, name: 'Documentaire', slug: 'documentaire' },
  { id: 18, tvId: 18, name: 'Drame', slug: 'drame' },
  { id: 10751, tvId: 10751, name: 'Famille', slug: 'famille' },
  { id: 14, tvId: 10765, name: 'Fantastique', slug: 'fantastique' },
  { id: 36, tvId: 10768, name: 'Histoire', slug: 'histoire' },
  { id: 27, tvId: 9648, name: 'Horreur', slug: 'horreur' },
  { id: 10402, tvId: 10767, name: 'Musique', slug: 'musique' },
  { id: 9648, tvId: 9648, name: 'Mystère', slug: 'mystere' },
  { id: 10749, tvId: 18, name: 'Romance', slug: 'romance' },
  { id: 878, tvId: 10765, name: 'Science-Fiction', slug: 'science-fiction' },
  { id: 53, tvId: 80, name: 'Thriller', slug: 'thriller' },
];

const STREAMING_PROVIDERS = [
  { id: 8, name: 'Netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  { id: 337, name: 'Disney+', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  { id: 119, name: 'Amazon Prime', logo: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
  { id: 350, name: 'Apple TV+', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  { id: 381, name: 'Canal+', logo: '/nVly0ywWJMByOVnftoyJB0rUGKi.jpg' },
  { id: 531, name: 'Paramount+', logo: '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
  { id: 283, name: 'Crunchyroll', logo: '/8Gt1iClBlzTeQs8WQm8UrCoIxnQ.jpg' },
  { id: 1899, name: 'Max', logo: '/6Q3ZYUNA1A3yxLO4oNbP4lbExMn.jpg' },
];

const EXCLUDED_ORIGINS = new Set(['JP', 'TH', 'KR', 'CN', 'TW', 'IN', 'PK', 'BD', 'SA', 'AE', 'EG', 'TR', 'ID', 'PH', 'MY', 'VN', 'NG']);

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const FULL_DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];


function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startDayOfWeek = firstDay.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function formatShortFrenchDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()].toLowerCase().substring(0, 4) + '.';
  return `${day} ${month}`;
}

function getUpcomingCountdown(dateStr: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { text: "Aujourd'hui", color: Colors.dark.success };
  if (diffDays === 1) return { text: 'Demain', color: Colors.dark.primary };
  if (diffDays < 7) return { text: `Dans ${diffDays}j`, color: Colors.dark.primary };
  if (diffDays < 14) return { text: `Dans ${Math.floor(diffDays / 7)} sem.`, color: Colors.dark.warning };
  if (diffDays < 30) return { text: `${diffDays}j`, color: Colors.dark.textSecondary };
  const months = Math.floor(diffDays / 30);
  return { text: `${months} mois`, color: Colors.dark.textSecondary };
}

function shouldIncludeItem(item: any): boolean {
  const originCountry = item.origin_country;
  if (originCountry && Array.isArray(originCountry)) {
    for (const c of originCountry) {
      if (EXCLUDED_ORIGINS.has(c)) return false;
    }
  }
  const lang = item.original_language;
  if (lang && ['ja', 'ko', 'zh', 'th', 'ar', 'hi', 'ta', 'te', 'tl', 'id', 'ms', 'vi', 'tr'].includes(lang)) {
    return false;
  }
  return true;
}

interface UpcomingItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv';
  release: string;
  vote_average?: number;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<DiscoverTab>('decouvrir');
  const inputRef = useRef<TextInput>(null);

  const searchResultsQuery = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: isTMDBConfigured && searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setIsSearching(text.length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    inputRef.current?.blur();
  }, []);

  const searchResults = searchResultsQuery.data?.results?.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  ) ?? [];

  if (!isTMDBConfigured) {
    return (
      <View style={[styles.configContainer, { paddingTop: insets.top }]}>
        <Clapperboard size={48} color={Colors.dark.textTertiary} />
        <Text style={styles.configTitle}>Connecter TMDB</Text>
        <Text style={styles.configSub}>Ajoutez votre clé API TMDB.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Rechercher</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={Colors.dark.textTertiary} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Films, séries, utilisateurs..."
          placeholderTextColor={Colors.dark.textTertiary}
          autoCorrect={false}
          testID="discover-search"
        />
        {isSearching && (
          <TouchableOpacity onPress={clearSearch}>
            <X size={16} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!isSearching && (
        <View style={styles.filterRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterPill, activeTab === tab.key && styles.filterPillActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, activeTab === tab.key && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isSearching ? (
        <View style={styles.searchResults}>
          {searchResultsQuery.isLoading ? (
            <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 40 }} />
          ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Aucun résultat pour "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              numColumns={3}
              keyExtractor={(item: any) => `${item.media_type}-${item.id}`}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.gridItem}>
                  <MovieCard
                    id={item.id}
                    title={item.title || item.name}
                    posterPath={item.poster_path}
                    mediaType={item.media_type}
                    year={item.release_date || item.first_air_date}
                    size="small"
                  />
                </View>
              )}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : activeTab === 'decouvrir' ? (
        <DiscoverTab router={router} />
      ) : activeTab === 'a_venir' ? (
        <UpcomingTab router={router} />
      ) : activeTab === 'streaming' ? (
        <StreamingTab router={router} />
      ) : (
        <GenresTab router={router} />
      )}
    </View>
  );
}

function getRotationSeed(): number {
  return Math.floor(Date.now() / (2 * 60 * 60 * 1000));
}

function getRotationPage(seed: number, maxPages: number = 5): number {
  return (seed % maxPages) + 1;
}

function DiscoverTab({ router }: { router: any }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [watchlistSet, setWatchlistSet] = useState<Set<number>>(new Set());
  const [rotationSeed, setRotationSeed] = useState(getRotationSeed);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSeed = getRotationSeed();
      if (newSeed !== rotationSeed) {
        setRotationSeed(newSeed);
        console.log('[Discover] Content rotation triggered, seed:', newSeed);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [rotationSeed]);

  const rotPage = getRotationPage(rotationSeed);

  const trendingDayQuery = useQuery({
    queryKey: ['trendingDay', rotationSeed],
    queryFn: getTrendingDay,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const trendingQuery = useQuery({
    queryKey: ['trending', rotationSeed],
    queryFn: () => getTrending('all', 'week'),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const nowPlayingQuery = useQuery({
    queryKey: ['nowPlaying', rotationSeed],
    queryFn: () => getNowPlaying(),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const popularSeriesQuery = useQuery({
    queryKey: ['popularSeries', rotationSeed],
    queryFn: getPopularSeries,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const netflixQuery = useQuery({
    queryKey: ['popularNetflix', rotPage],
    queryFn: () => getPopularByProvider(8, 'movie', rotPage),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const disneyQuery = useQuery({
    queryKey: ['popularDisney', rotPage],
    queryFn: () => getPopularByProvider(337, 'movie', rotPage),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const actionQuery = useQuery({
    queryKey: ['categoryAction', rotPage],
    queryFn: () => discoverByGenreAndRegion(28, 'movie', rotPage),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const dramaSeriesQuery = useQuery({
    queryKey: ['categoryDramaSeries', rotPage],
    queryFn: () => discoverByGenreAndRegion(18, 'tv', rotPage),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const thrillerQuery = useQuery({
    queryKey: ['categoryThriller', rotPage],
    queryFn: () => discoverByGenreAndRegion(53, 'movie', rotPage),
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
  });

  const heroItems = useMemo(() => {
    return (trendingDayQuery.data?.results ?? []).slice(0, 6);
  }, [trendingDayQuery.data]);

  useEffect(() => {
    if (heroItems.length === 0) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const currentHero = heroItems[heroIndex];

  const toggleWatchlist = useCallback((id: number) => {
    setWatchlistSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const navigateToDetail = useCallback((id: number, mediaType: string) => {
    router.push(`/media/${id}?type=${mediaType || 'movie'}` as any);
  }, [router]);

  const isNew = (item: any) => {
    const date = item.release_date || item.first_air_date;
    if (!date) return false;
    return (new Date().getTime() - new Date(date).getTime()) < 7 * 24 * 60 * 60 * 1000;
  };

  const isRecent = (item: any) => {
    const date = item.release_date || item.first_air_date;
    if (!date) return false;
    const diff = new Date().getTime() - new Date(date).getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.browseContainer} contentContainerStyle={styles.browseContent}>
      {currentHero && (
        <TouchableOpacity
          style={styles.heroContainer}
          activeOpacity={0.9}
          onPress={() => navigateToDetail(currentHero.id, currentHero.media_type)}
        >
          <Image
            source={{ uri: getBackdropUrl(currentHero.backdrop_path) ?? '' }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.7)', 'rgba(10,10,15,0.95)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              {isNew(currentHero) && (
                <View style={[styles.heroBadge, { backgroundColor: Colors.dark.success }]}>
                  <Text style={styles.heroBadgeText}>Nouveau</Text>
                </View>
              )}
              {isRecent(currentHero) && (
                <View style={[styles.heroBadge, { backgroundColor: Colors.dark.warning }]}>
                  <Text style={styles.heroBadgeText}>Récent</Text>
                </View>
              )}
              <View style={[styles.heroBadge, { backgroundColor: Colors.dark.primary }]}>
                <Text style={styles.heroBadgeText}>
                  {currentHero.media_type === 'tv' ? 'Série' : 'Film'}
                </Text>
              </View>

            </View>
            <Text style={styles.heroTitle}>{currentHero.title || currentHero.name}</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => navigateToDetail(currentHero.id, currentHero.media_type)}
              >
                <Play size={14} color="#fff" fill="#fff" />
                <Text style={styles.heroBtnText}>Voir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtnOutline}
                onPress={() => toggleWatchlist(currentHero.id)}
              >
                <Text style={styles.heroBtnOutlineText}>
                  {watchlistSet.has(currentHero.id) ? '✓ Watchlist' : '+ Watchlist'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.heroDots}>
            {heroItems.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setHeroIndex(i)}
                style={[styles.heroDot, i === heroIndex && styles.heroDotActive]}
              />
            ))}
          </View>
        </TouchableOpacity>
      )}

      <HorizontalSection
        title="Tendances"
        icon={<TrendingUp size={16} color={Colors.dark.primary} />}
        data={trendingQuery.data?.results}
        isLoading={trendingQuery.isLoading}
      />

      <HorizontalSection
        title="Au cinéma"
        icon={<Clapperboard size={16} color={Colors.dark.accent} />}
        data={nowPlayingQuery.data?.results}
        isLoading={nowPlayingQuery.isLoading}
        mediaType="movie"
        showSeeAll
        onSeeAll={() => router.push('/category/nouveau?genreId=0&name=Au%20cinéma&special=now_playing' as any)}
      />

      <TrailersSection data={trendingQuery.data?.results?.slice(0, 5)} />

      <CategoryCardSection
        title="Populaire sur Netflix"
        color="#E50914"
        data={netflixQuery.data?.results}
        isLoading={netflixQuery.isLoading}
        router={router}
      />

      <HorizontalSection
        title="Séries populaires"
        icon={<Tv size={16} color="#8B5CF6" />}
        data={popularSeriesQuery.data?.results}
        isLoading={popularSeriesQuery.isLoading}
        mediaType="tv"
      />

      <CategoryCardSection
        title="Populaire sur Disney+"
        color="#113CCF"
        data={disneyQuery.data?.results}
        isLoading={disneyQuery.isLoading}
        router={router}
      />

      <HorizontalSection
        title="Films d'action"
        icon={<Zap size={16} color={Colors.dark.accent} />}
        data={actionQuery.data?.results}
        isLoading={actionQuery.isLoading}
        mediaType="movie"
        showSeeAll
        onSeeAll={() => router.push('/category/action?genreId=28&tvGenreId=10759&name=Action' as any)}
      />

      <HorizontalSection
        title="Séries dramatiques"
        icon={<Heart size={16} color="#EC4899" />}
        data={dramaSeriesQuery.data?.results}
        isLoading={dramaSeriesQuery.isLoading}
        mediaType="tv"
        showSeeAll
        onSeeAll={() => router.push('/category/drame?genreId=18&tvGenreId=18&name=Drame' as any)}
      />

      <HorizontalSection
        title="Thriller & Suspense"
        icon={<Shield size={16} color={Colors.dark.success} />}
        data={thrillerQuery.data?.results}
        isLoading={thrillerQuery.isLoading}
        mediaType="movie"
        showSeeAll
        onSeeAll={() => router.push('/category/thriller?genreId=53&tvGenreId=80&name=Thriller' as any)}
      />

      <View style={styles.genreExplorerSection}>
        <View style={styles.sectionHeader}>
          <Film size={16} color={Colors.dark.primary} />
          <Text style={styles.sectionTitle}>Explorer par genre</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {GENRES.slice(0, 8).map((genre, index) => {
            const colors = [
              ['#1a1a2e', '#16213e'], ['#0f3460', '#1a1a2e'], ['#533483', '#1a1a2e'],
              ['#e94560', '#1a1a2e'], ['#0f3460', '#533483'], ['#1a1a2e', '#0f3460'],
              ['#e94560', '#533483'], ['#16213e', '#0f3460'],
            ];
            return (
              <TouchableOpacity
                key={genre.id}
                style={styles.genreExplorerCard}
                onPress={() => router.push(`/category/${genre.slug}?genreId=${genre.id}&tvGenreId=${genre.tvId}&name=${encodeURIComponent(genre.name)}` as any)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={colors[index % colors.length] as [string, string]}
                  style={styles.genreExplorerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.genreExplorerText}>{genre.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function CategoryCardSection({ title, color, data, isLoading, router }: {
  title: string;
  color: string;
  data?: any[];
  isLoading: boolean;
  router: any;
}) {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.categoryDot, { backgroundColor: color }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <ActivityIndicator color={Colors.dark.primary} style={{ paddingVertical: 40 }} />
      </View>
    );
  }
  if (!data || data.length === 0) return null;

  const items = data.slice(0, 6);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.categoryDot, { backgroundColor: color }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {items.map((item: any) => (
          <TouchableOpacity
            key={`cat-${item.id}`}
            style={styles.categoryCard}
            onPress={() => router.push(`/media/${item.id}?type=${item.media_type || 'movie'}` as any)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: getImageUrl(item.poster_path, 'w342') ?? '' }}
              style={styles.categoryCardPoster}
              contentFit="cover"
            />

            <Text style={styles.categoryCardTitle} numberOfLines={2}>
              {item.title || item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function HorizontalSection({ title, icon, data, isLoading, mediaType, showSeeAll, onSeeAll }: {
  title: string;
  icon: React.ReactNode;
  data?: any[];
  isLoading: boolean;
  mediaType?: 'movie' | 'tv';
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <ActivityIndicator color={Colors.dark.primary} style={{ paddingVertical: 40 }} />
      </View>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        {showSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={data.slice(0, 10)}
        keyExtractor={(item: any) => `${title}-${item.id}`}
        renderItem={({ item }: { item: any }) => (
          <MovieCard
            id={item.id}
            title={item.title || item.name}
            posterPath={item.poster_path}
            mediaType={mediaType || item.media_type || 'movie'}
            year={item.release_date || item.first_air_date}
            size="medium"
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
}

function TrailersSection({ data }: { data?: any[] }) {
  if (!data || data.length === 0) return null;

  const handleTrailerPress = useCallback(async (item: any) => {
    try {
      const type = item.media_type === 'tv' ? 'tv' : 'movie';
      const videos = await getVideos(type, item.id);
      const trailer = videos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
        || videos.results?.find((v: any) => v.site === 'YouTube');
      if (trailer) {
        await Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`);
      }
    } catch (e) {
      console.log('[Trailers] Error:', e);
    }
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Play size={16} color={Colors.dark.accent} />
        <Text style={styles.sectionTitle}>Bandes-annonces</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {data.map((item: any) => (
          <TouchableOpacity
            key={`trailer-${item.id}`}
            style={styles.trailerCard}
            onPress={() => handleTrailerPress(item)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: getBackdropUrl(item.backdrop_path) ?? '' }}
              style={styles.trailerThumb}
              contentFit="cover"
            />
            <View style={styles.trailerPlayOverlay}>
              <View style={styles.trailerPlayBtn}>
                <Play size={18} color="#fff" fill="#fff" />
              </View>
            </View>
            <Text style={styles.trailerTitle} numberOfLines={2}>
              {item.title || item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function UpcomingTab({ router }: { router: any }) {
  const [filter, setFilter] = useState<UpcomingFilter>('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [reminders, setReminders] = useState<Set<number>>(new Set());

  const upcomingQuery = useQuery({
    queryKey: ['upcomingReleasesV2'],
    queryFn: async () => {
      console.log('[Upcoming] Fetching upcoming releases with FR region filter...');
      const pageRange = [1, 2, 3, 4, 5, 6, 7, 8];
      const requests = [
        ...pageRange.map(p => getUpcomingMovies(p)),
        ...pageRange.map(p => getUpcomingTVShows(p)),
        ...pageRange.slice(0, 6).map(p => discoverUpcoming('movie', p)),
        ...pageRange.slice(0, 6).map(p => discoverUpcoming('tv', p)),
      ];

      const results = await Promise.allSettled(requests);
      const extractResults = (r: PromiseSettledResult<{ results: any[] }>) =>
        r.status === 'fulfilled' ? (r.value.results || []) : [];

      const movieUpcoming = results.slice(0, 8).flatMap(extractResults);
      const tvUpcoming = results.slice(8, 16).flatMap(extractResults);
      const discMovies = results.slice(16, 22).flatMap(extractResults);
      const discTv = results.slice(22).flatMap(extractResults);

      const movies = [...movieUpcoming, ...discMovies]
        .filter(shouldIncludeItem)
        .map(m => ({
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          backdrop_path: m.backdrop_path,
          media_type: 'movie' as const,
          release: m.release_date || '',
          vote_average: m.vote_average,
        }));

      const tvShows = [...tvUpcoming, ...discTv]
        .filter(shouldIncludeItem)
        .map(t => ({
          id: t.id,
          title: t.name,
          poster_path: t.poster_path,
          backdrop_path: t.backdrop_path,
          media_type: 'tv' as const,
          release: t.first_air_date || '',
          vote_average: t.vote_average,
        }));

      const today = new Date().toISOString().split('T')[0];
      const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const all = [...movies, ...tvShows].filter(i => i.release && i.release >= today && i.release <= sixMonthsLater);
      const unique = Array.from(new Map(all.map(i => [`${i.media_type}-${i.id}`, i])).values());
      unique.sort((a, b) => new Date(a.release).getTime() - new Date(b.release).getTime());
      console.log('[Upcoming] Total releases after filtering:', unique.length, '(movies:', unique.filter(u => u.media_type === 'movie').length, ', tv:', unique.filter(u => u.media_type === 'tv').length, ')');
      return unique as UpcomingItem[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const allItems = useMemo(() => upcomingQuery.data ?? [], [upcomingQuery.data]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return allItems;
    return allItems.filter(i => i.media_type === filter);
  }, [allItems, filter]);

  const movieCount = useMemo(() => allItems.filter(i => i.media_type === 'movie').length, [allItems]);
  const tvCount = useMemo(() => allItems.filter(i => i.media_type === 'tv').length, [allItems]);

  const releaseDateMap = useMemo(() => {
    const map = new Map<string, { hasMovie: boolean; hasTv: boolean }>();
    for (const item of filteredItems) {
      const existing = map.get(item.release) || { hasMovie: false, hasTv: false };
      if (item.media_type === 'movie') existing.hasMovie = true;
      if (item.media_type === 'tv') existing.hasTv = true;
      map.set(item.release, existing);
    }
    return map;
  }, [filteredItems]);

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentMonth.year && today.getMonth() === currentMonth.month;
  const todayDate = today.getDate();

  const selectedDateStr = selectedDate
    ? `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null;

  const selectedDateReleases = useMemo(() => {
    if (!selectedDateStr) return [];
    return filteredItems.filter(i => i.release === selectedDateStr);
  }, [filteredItems, selectedDateStr]);

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(currentMonth.year, currentMonth.month, selectedDate);
    return `${FULL_DAY_NAMES[d.getDay()]} ${selectedDate} ${MONTH_NAMES[currentMonth.month]}`;
  }, [selectedDate, currentMonth]);

  const displayItems = isExpanded ? filteredItems : filteredItems.slice(0, 8);

  const prevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
    setSelectedDate(null);
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
    setSelectedDate(null);
  }, []);

  const toggleReminder = useCallback((id: number) => {
    setReminders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (upcomingQuery.isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color={Colors.dark.primary} size="large" />
        <Text style={styles.loadingText}>Chargement des sorties...</Text>
        <Text style={styles.loadingSubText}>Récupération sur 6 mois</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.browseContainer} contentContainerStyle={styles.browseContent}>
      <View style={styles.upcomingHeader}>
        <View style={styles.upcomingHeaderLeft}>
          <Calendar size={18} color={Colors.dark.primary} />
          <Text style={styles.upcomingHeaderTitle}>À venir</Text>
          <Text style={styles.upcomingCount}>({filteredItems.length} sorties)</Text>
        </View>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <Text style={styles.seeAll}>{isExpanded ? 'Réduire' : 'Voir tout'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingFilters}>
        <TouchableOpacity
          style={[styles.upcomingFilterPill, filter === 'all' && styles.upcomingFilterPillActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.upcomingFilterText, filter === 'all' && styles.upcomingFilterTextActive]}>
            Tout ({allItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.upcomingFilterPill, filter === 'movie' && styles.upcomingFilterPillActive]}
          onPress={() => setFilter('movie')}
        >
          <Film size={12} color={filter === 'movie' ? '#fff' : Colors.dark.textSecondary} />
          <Text style={[styles.upcomingFilterText, filter === 'movie' && styles.upcomingFilterTextActive]}>
            Films ({movieCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.upcomingFilterPill, filter === 'tv' && styles.upcomingFilterPillActive]}
          onPress={() => setFilter('tv')}
        >
          <Tv size={12} color={filter === 'tv' ? '#fff' : Colors.dark.textSecondary} />
          <Text style={[styles.upcomingFilterText, filter === 'tv' && styles.upcomingFilterTextActive]}>
            Séries ({tvCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
          <ChevronLeft size={20} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.monthNavText}>
          {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
          <ChevronRight size={20} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.dayNamesRow}>
          {DAY_NAMES.map((d, i) => (
            <View key={i} style={styles.dayNameCell}>
              <Text style={styles.dayNameText}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <View key={`empty-${i}`} style={styles.calendarCell} />;
            }
            const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const releaseInfo = releaseDateMap.get(dateStr);
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = day === selectedDate;

            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.calendarCell,
                  isToday && styles.calendarCellToday,
                  isSelected && styles.calendarCellSelected,
                ]}
                onPress={() => setSelectedDate(day === selectedDate ? null : day)}
                activeOpacity={0.6}
              >
                <Text style={[
                  styles.calendarDayText,
                  isToday && styles.calendarDayTextToday,
                  isSelected && styles.calendarDayTextSelected,
                ]}>
                  {day}
                </Text>
                <View style={styles.calendarDots}>
                  {releaseInfo?.hasMovie && <View style={[styles.calendarDot, { backgroundColor: Colors.dark.primary }]} />}
                  {releaseInfo?.hasTv && <View style={[styles.calendarDot, { backgroundColor: '#8B5CF6' }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedDate !== null && (
        <View style={styles.selectedDatePanel}>
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateTitle}>{selectedDateFormatted}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <X size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>
          {selectedDateReleases.length === 0 ? (
            <Text style={styles.noReleasesText}>Aucune sortie ce jour</Text>
          ) : (
            selectedDateReleases.map(item => (
              <TouchableOpacity
                key={`sel-${item.media_type}-${item.id}`}
                style={styles.selectedDateItem}
                onPress={() => router.push(`/media/${item.id}?type=${item.media_type}` as any)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: getImageUrl(item.poster_path, 'w92') ?? '' }}
                  style={styles.selectedDatePoster}
                  contentFit="cover"
                />
                <View style={styles.selectedDateInfo}>
                  <Text style={styles.selectedDateItemTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: item.media_type === 'tv' ? '#8B5CF6' : Colors.dark.primary },
                  ]}>
                    <Text style={styles.typeBadgeText}>
                      {item.media_type === 'tv' ? 'Série' : 'Film'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.reminderBtn}
                  onPress={() => toggleReminder(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {reminders.has(item.id) ? (
                    <Bell size={18} color={Colors.dark.primary} />
                  ) : (
                    <BellOff size={18} color={Colors.dark.textTertiary} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {displayItems.map(item => {
        const countdown = getUpcomingCountdown(item.release);
        return (
          <TouchableOpacity
            key={`up-${item.media_type}-${item.id}`}
            style={styles.upcomingCard}
            onPress={() => router.push(`/media/${item.id}?type=${item.media_type}` as any)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: getImageUrl(item.poster_path, 'w154') ?? '' }}
              style={styles.upcomingPoster}
              contentFit="cover"
            />
            <View style={styles.upcomingCardInfo}>
              <Text style={styles.upcomingCardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.upcomingCardRow}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: item.media_type === 'tv' ? '#8B5CF6' : Colors.dark.primary },
                ]}>
                  <Text style={styles.typeBadgeText}>
                    {item.media_type === 'tv' ? 'Série' : 'Film'}
                  </Text>
                </View>
                <Text style={styles.upcomingCardDate}>{formatShortFrenchDate(item.release)}</Text>
              </View>
            </View>
            <View style={styles.upcomingCardRight}>
              <View style={styles.countdownRow}>
                <Clock size={12} color={countdown.color} />
                <Text style={[styles.countdownText, { color: countdown.color }]}>{countdown.text}</Text>
              </View>
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleReminder(item.id);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {reminders.has(item.id) ? (
                  <Bell size={18} color={Colors.dark.primary} />
                ) : (
                  <BellOff size={18} color={Colors.dark.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {!isExpanded && filteredItems.length > 8 && (
        <LinearGradient
          colors={['transparent', Colors.dark.background]}
          style={styles.fadeGradient}
          pointerEvents="none"
        />
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function StreamingTab({ router }: { router: any }) {
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const providerContentQuery = useQuery({
    queryKey: ['providerContent', selectedProvider],
    queryFn: () => discoverByProvider(selectedProvider!, 'movie', 1),
    enabled: selectedProvider !== null,
    staleTime: 10 * 60 * 1000,
  });

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.browseContainer} contentContainerStyle={styles.browseContent}>
      <View style={styles.providerGrid}>
        {STREAMING_PROVIDERS.map(provider => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              selectedProvider === provider.id && styles.providerCardActive,
            ]}
            onPress={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: getImageUrl(provider.logo, 'w92') ?? '' }}
              style={styles.providerLogo}
              contentFit="cover"
            />
            <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
            <TouchableOpacity
              style={styles.providerFavBtn}
              onPress={() => toggleFavorite(provider.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star
                size={14}
                color={favorites.has(provider.id) ? Colors.dark.gold : Colors.dark.textTertiary}
                fill={favorites.has(provider.id) ? Colors.dark.gold : 'transparent'}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {selectedProvider !== null && (
        <View style={styles.providerContentSection}>
          {providerContentQuery.isLoading ? (
            <ActivityIndicator color={Colors.dark.primary} style={{ paddingVertical: 30 }} />
          ) : (
            <View style={styles.providerContentGrid}>
              {(providerContentQuery.data?.results ?? []).slice(0, 9).map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.providerContentItem}
                  onPress={() => router.push(`/media/${item.id}?type=movie` as any)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getImageUrl(item.poster_path, 'w185') ?? '' }}
                    style={styles.providerContentPoster}
                    contentFit="cover"
                  />
                  <Text style={styles.providerContentTitle} numberOfLines={2}>
                    {item.title || item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function GenresTab({ router }: { router: any }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.browseContainer} contentContainerStyle={styles.genresContent}>
      {GENRES.map(genre => (
        <TouchableOpacity
          key={genre.id}
          style={styles.genreCard}
          onPress={() => router.push(`/category/${genre.slug}?genreId=${genre.id}&tvGenreId=${genre.tvId}&name=${encodeURIComponent(genre.name)}` as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.genreCardText}>{genre.name}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  configContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  configTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  configSub: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 26,
    fontWeight: '800' as const,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterPillText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  browseContainer: {
    flex: 1,
  },
  browseContent: {
    paddingBottom: 140,
  },
  searchResults: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
  },
  gridItem: {
    flex: 1,
    maxWidth: '33.33%' as const,
    paddingBottom: 16,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
  },
  noResultsText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },

  heroContainer: {
    marginHorizontal: 16,
    overflow: 'hidden',
    height: 210,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  heroContent: {
    position: 'absolute',
    bottom: 32,
    left: 14,
    right: 14,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  heroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heroRatingText: {
    color: Colors.dark.gold,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 10,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  heroBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heroBtnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  heroBtnOutlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  heroDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  heroDotActive: {
    backgroundColor: Colors.dark.primary,
    width: 18,
  },

  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  seeAll: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },

  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryCard: {
    width: 120,
    marginRight: 0,
  },
  categoryCardPoster: {
    width: 120,
    height: 180,
    backgroundColor: Colors.dark.cardElevated,
  },
  categoryCardRating: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  categoryCardRatingText: {
    color: Colors.dark.gold,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  categoryCardTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
    lineHeight: 16,
  },

  trailerCard: {
    width: 200,
    position: 'relative',
  },
  trailerThumb: {
    width: 200,
    height: 112,
    backgroundColor: Colors.dark.card,
  },
  trailerPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailerPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailerTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
  },

  genreExplorerSection: {
    marginTop: 20,
  },
  genreExplorerCard: {
    width: 140,
    height: 56,
    overflow: 'hidden',
  },
  genreExplorerGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreExplorerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },

  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  upcomingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upcomingHeaderTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  upcomingCount: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  upcomingFilters: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  upcomingFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },
  upcomingFilterPillActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  upcomingFilterText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  upcomingFilterTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },

  calendarContainer: {
    paddingHorizontal: 16,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayNameText: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: (SCREEN_WIDTH - 32) / 7,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    borderRadius: 10,
  },
  calendarCellSelected: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
  },
  calendarDayText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  calendarDayTextToday: {
    color: Colors.dark.primary,
    fontWeight: '700' as const,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  calendarDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 6,
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  selectedDatePanel: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.dark.card,
    padding: 14,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectedDateTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  noReleasesText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  selectedDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
  },
  selectedDatePoster: {
    width: 40,
    height: 56,
    backgroundColor: Colors.dark.surface,
  },
  selectedDateInfo: {
    flex: 1,
    gap: 4,
  },
  selectedDateItemTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },

  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600' as const,
  },

  reminderBtn: {
    padding: 6,
  },

  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.borderLight,
    gap: 10,
  },
  upcomingPoster: {
    width: 48,
    height: 64,
    backgroundColor: Colors.dark.card,
  },
  upcomingCardInfo: {
    flex: 1,
    gap: 4,
  },
  upcomingCardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  upcomingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upcomingCardDate: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  upcomingCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  fadeGradient: {
    height: 60,
    marginTop: -60,
    marginHorizontal: 16,
  },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  loadingSubText: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },

  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  providerCard: {
    width: (SCREEN_WIDTH - 24 - 36) / 4,
    alignItems: 'center',
    padding: 10,
    margin: 4,
    backgroundColor: Colors.dark.card,
  },
  providerCardActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryLight,
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
  },
  providerName: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 6,
    textAlign: 'center',
  },
  providerFavBtn: {
    marginTop: 4,
  },
  providerContentSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  providerContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerContentItem: {
    width: (SCREEN_WIDTH - 32 - 20) / 3,
    marginBottom: 8,
  },
  providerContentPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: Colors.dark.card,
  },
  providerContentTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
  },

  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  genresContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
    gap: 10,
  },
  genreCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    height: 52,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreCardText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});