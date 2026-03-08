import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Film, Tv, Star, Clock, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useSocial } from '@/providers/SocialProvider';
import { useWatchlist } from '@/providers/WatchlistProvider';
import { GENRE_STATS, MONTHLY_STATS, COMPARISON_USERS } from '@/mocks/social';
import { getImageUrl } from '@/services/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StatsTab = 'overview' | 'genres' | 'ranking' | 'comparison';

const TABS: { key: StatsTab; label: string }[] = [
  { key: 'overview', label: 'Aperçu' },
  { key: 'genres', label: 'Genres' },
  { key: 'ranking', label: 'Classement' },
  { key: 'comparison', label: 'Comparaison' },
];

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { journal, totalWatchTime } = useSocial();
  const { watched, ratings, watchlist } = useWatchlist();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  const movieCount = watched.filter(w => w.tmdb_type === 'movie').length;
  const seriesCount = watched.filter(w => w.tmdb_type === 'tv').length;
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : journal.filter(j => j.rating).reduce((sum, j) => sum + (j.rating ?? 0), 0) / (journal.filter(j => j.rating).length || 1);

  const topRated = useMemo(() => {
    return [...journal].filter(j => j.rating).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10);
  }, [journal]);

  const maxMonthlyTotal = Math.max(...MONTHLY_STATS.map(m => m.movies + m.episodes));
  const totalHours = Math.round(totalWatchTime / 60);

  const renderOverview = () => (
    <View style={styles.section}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{movieCount + journal.filter(j => j.tmdb_type === 'movie').length}</Text>
          <Text style={styles.statLabel}>Films vus</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{seriesCount}</Text>
          <Text style={styles.statLabel}>Séries terminées</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalHours}h</Text>
          <Text style={styles.statLabel}>Temps total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Activité mensuelle</Text>
      <View style={styles.chartArea}>
        {MONTHLY_STATS.map((month, i) => {
          const total = month.movies + month.episodes;
          const barHeight = maxMonthlyTotal > 0 ? (total / maxMonthlyTotal) * 100 : 0;
          const movieH = maxMonthlyTotal > 0 ? (month.movies / maxMonthlyTotal) * 100 : 0;
          return (
            <View key={i} style={styles.chartCol}>
              <View style={styles.chartBarWrap}>
                <View style={[styles.chartBarOuter, { height: barHeight }]}>
                  <View style={[styles.chartBarInner, { height: movieH }]} />
                </View>
              </View>
              <Text style={styles.chartMonthLabel}>{month.month}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.dark.primary }]} />
          <Text style={styles.legendText}>Films</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(37, 99, 235, 0.25)' }]} />
          <Text style={styles.legendText}>Épisodes</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Détails</Text>
      <View style={styles.detailsList}>
        {[
          { label: 'Moyenne par jour', value: `${(totalWatchTime / 30 / 60).toFixed(1)}h` },
          { label: 'Films par mois', value: `${Math.round((movieCount || MONTHLY_STATS.reduce((s, m) => s + m.movies, 0)) / 6)}` },
          { label: '5 étoiles données', value: `${journal.filter(j => j.rating === 5).length}` },
          { label: 'Watchlist', value: `${watchlist.length}` },
        ].map((item, i) => (
          <View key={i} style={[styles.detailRow, i < 3 && styles.detailRowBorder]}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderGenres = () => (
    <View style={styles.section}>
      {GENRE_STATS.map((genre, i) => (
        <View key={i} style={[styles.genreRow, i < GENRE_STATS.length - 1 && styles.genreRowBorder]}>
          <View style={styles.genreLeft}>
            <View style={[styles.genreIndicator, { backgroundColor: genre.color }]} />
            <View>
              <Text style={styles.genreName}>{genre.genre}</Text>
              <Text style={styles.genreCount}>{genre.count} titres</Text>
            </View>
          </View>
          <View style={styles.genreRight}>
            <View style={styles.genreBarBg}>
              <View style={[styles.genreBarFill, { width: `${genre.percentage}%`, backgroundColor: genre.color }]} />
            </View>
            <Text style={styles.genrePercent}>{genre.percentage}%</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderRanking = () => (
    <View style={styles.section}>
      {topRated.length > 0 ? topRated.map((entry, i) => (
        <TouchableOpacity
          key={entry.id}
          style={[styles.rankRow, i < topRated.length - 1 && styles.rankRowBorder]}
          activeOpacity={0.7}
          onPress={() => router.push(`/media/${entry.tmdb_id}?type=${entry.tmdb_type}` as any)}
        >
          <Text style={[styles.rankNum, i < 3 && styles.rankNumTop]}>{i + 1}</Text>
          {entry.tmdb_poster ? (
            <Image
              source={{ uri: getImageUrl(entry.tmdb_poster, 'w92') ?? '' }}
              style={styles.rankPoster}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.rankPoster, styles.rankPosterEmpty]}>
              <Film size={12} color={Colors.dark.textTertiary} />
            </View>
          )}
          <View style={styles.rankInfo}>
            <Text style={styles.rankTitle} numberOfLines={1}>{entry.tmdb_title}</Text>
            <Text style={styles.rankType}>{entry.tmdb_type === 'movie' ? 'Film' : 'Série'}</Text>
          </View>
          <View style={styles.rankRating}>
            <Star size={12} color={Colors.dark.gold} fill={Colors.dark.gold} />
            <Text style={styles.rankRatingText}>{entry.rating}</Text>
          </View>
        </TouchableOpacity>
      )) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Notez des films pour voir votre classement</Text>
        </View>
      )}
    </View>
  );

  const renderComparison = () => (
    <View style={styles.section}>
      <Text style={styles.sectionSub}>Découvrez vos affinités avec d'autres cinéphiles</Text>
      {COMPARISON_USERS.map((user, i) => {
        const matchColor = user.compatibility >= 70 ? Colors.dark.success : user.compatibility >= 50 ? Colors.dark.warning : Colors.dark.textTertiary;
        return (
          <View key={user.id} style={[styles.compRow, i < COMPARISON_USERS.length - 1 && styles.compRowBorder]}>
            <View style={styles.compAvatar}>
              <Text style={styles.compAvatarText}>{user.display_name.charAt(0)}</Text>
            </View>
            <View style={styles.compInfo}>
              <Text style={styles.compName}>{user.display_name}</Text>
              <Text style={styles.compHandle}>@{user.username}</Text>
              <View style={styles.compDetails}>
                <Text style={styles.compDetailText}>{user.commonMovies} films</Text>
                <Text style={styles.compDetailDot}>·</Text>
                <Text style={styles.compDetailText}>{user.commonSeries} séries en commun</Text>
              </View>
            </View>
            <View style={styles.compScoreWrap}>
              <Text style={[styles.compScore, { color: matchColor }]}>{user.compatibility}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'genres' && renderGenres()}
        {activeTab === 'ranking' && renderRanking()}
        {activeTab === 'comparison' && renderComparison()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const },
  tabScroll: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  tabContent: { paddingHorizontal: 16, gap: 4 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.dark.primary },
  tabText: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '500' as const },
  tabTextActive: { color: Colors.dark.text, fontWeight: '700' as const },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const, marginTop: 24, marginBottom: 12 },
  sectionSub: { color: Colors.dark.textSecondary, fontSize: 13, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.dark.text, fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.5 },
  statLabel: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 4, textAlign: 'center' as const },
  statDivider: { width: 0.5, height: 30, backgroundColor: Colors.dark.borderLight },
  chartArea: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarWrap: { height: 100, justifyContent: 'flex-end' },
  chartBarOuter: { width: 24, borderRadius: 4, backgroundColor: 'rgba(37, 99, 235, 0.2)', overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarInner: { width: '100%', backgroundColor: Colors.dark.primary, borderRadius: 3 },
  chartMonthLabel: { color: Colors.dark.textTertiary, fontSize: 10, marginTop: 6, fontWeight: '600' as const },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.dark.textSecondary, fontSize: 11 },
  detailsList: { borderTopWidth: 0.5, borderTopColor: Colors.dark.borderLight },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  detailRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  detailLabel: { color: Colors.dark.textSecondary, fontSize: 14 },
  detailValue: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const },
  genreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  genreRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  genreLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 120 },
  genreIndicator: { width: 3, height: 28, borderRadius: 2 },
  genreName: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  genreCount: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },
  genreRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  genreBarBg: { flex: 1, height: 4, backgroundColor: Colors.dark.cardElevated, borderRadius: 2, overflow: 'hidden' },
  genreBarFill: { height: '100%', borderRadius: 2 },
  genrePercent: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: '600' as const, width: 32, textAlign: 'right' as const },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rankRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  rankNum: { color: Colors.dark.textTertiary, fontSize: 14, fontWeight: '700' as const, width: 20, textAlign: 'center' as const },
  rankNumTop: { color: Colors.dark.gold },
  rankPoster: { width: 34, height: 50, borderRadius: 4 },
  rankPosterEmpty: { backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  rankInfo: { flex: 1 },
  rankTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  rankType: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 2 },
  rankRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankRatingText: { color: Colors.dark.gold, fontSize: 14, fontWeight: '700' as const },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  compRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  compAvatar: { width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  compAvatarText: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  compInfo: { flex: 1 },
  compName: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  compHandle: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },
  compDetails: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  compDetailText: { color: Colors.dark.textSecondary, fontSize: 11 },
  compDetailDot: { color: Colors.dark.textTertiary, fontSize: 11 },
  compScoreWrap: { alignItems: 'center' },
  compScore: { fontSize: 20, fontWeight: '800' as const },
  emptyBlock: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: Colors.dark.textSecondary, fontSize: 14 },
});