import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Film, Tv, MapPin, Calendar, ExternalLink, Clapperboard } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { getImageUrl } from '@/services/tmdb';
import { MOCK_PRODUCTION_UPDATES, getStatusFilterOptions, ProductionUpdate } from '@/mocks/production';
import * as Haptics from 'expo-haptics';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function formatDate(dateStr: string): string {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getFilmingProgress(start: string, end: string): number {
  const now = new Date().getTime();
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  if (now <= startDate) return 0;
  if (now >= endDate) return 100;
  return Math.round(((now - startDate) / (endDate - startDate)) * 100);
}

export default function ProductionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const filters = getStatusFilterOptions();

  const filteredUpdates = selectedFilter === 'all'
    ? MOCK_PRODUCTION_UPDATES
    : MOCK_PRODUCTION_UPDATES.filter(u => u.status === selectedFilter);

  const renderProductionCard = useCallback((update: ProductionUpdate) => {
    const posterUrl = getImageUrl(update.poster_path, 'w154');

    return (
      <TouchableOpacity
        key={update.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/media/${update.tmdb_id}?type=${update.tmdb_type}` as any);
        }}
      >
        <View style={styles.cardTop}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.cardPoster} contentFit="cover" />
          ) : (
            <View style={[styles.cardPoster, styles.cardPosterEmpty]}>
              {update.tmdb_type === 'movie' ? <Film size={18} color={Colors.dark.textTertiary} /> : <Tv size={18} color={Colors.dark.textTertiary} />}
            </View>
          )}
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{update.title}</Text>
              <Text style={styles.cardTime}>{timeAgo(update.updatedAt)}</Text>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: update.statusColor }]} />
              <Text style={[styles.statusText, { color: update.statusColor }]}>{update.statusLabel}</Text>
            </View>
            <Text style={styles.cardDesc} numberOfLines={3}>{update.details}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {update.filmingLocation && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.metaText}>{update.filmingLocation}</Text>
            </View>
          )}
          {update.filmingStart && update.filmingEnd && (
            <View style={styles.metaItem}>
              <Clapperboard size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.metaText}>{formatDate(update.filmingStart)} → {formatDate(update.filmingEnd)}</Text>
            </View>
          )}
          {update.releaseDate && (
            <View style={styles.metaItem}>
              <Calendar size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.metaText}>Sortie : {formatDate(update.releaseDate)}</Text>
            </View>
          )}
          {update.source && (
            <View style={styles.metaItem}>
              <ExternalLink size={12} color={Colors.dark.textTertiary} />
              <Text style={styles.metaText}>Source : {update.source}</Text>
            </View>
          )}
        </View>

        {update.filmingStart && update.filmingEnd && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${getFilmingProgress(update.filmingStart, update.filmingEnd)}%`, backgroundColor: update.statusColor }]} />
            </View>
            <Text style={styles.progressText}>{getFilmingProgress(update.filmingStart, update.filmingEnd)}% du tournage</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Production & Industrie</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, selectedFilter === f.key && styles.filterChipActive]}
            onPress={() => {
              setSelectedFilter(f.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.filterText, selectedFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}>
        {filteredUpdates.length > 0 ? (
          filteredUpdates.map(renderProductionCard)
        ) : (
          <View style={styles.emptyState}>
            <Clapperboard size={36} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyText}>Aucune mise à jour pour ce filtre</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  filterScroll: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.dark.card },
  filterChipActive: { backgroundColor: Colors.dark.primary },
  filterText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '500' as const },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: Colors.dark.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: Colors.dark.borderLight },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardPoster: { width: 50, height: 75, borderRadius: 6 },
  cardPosterEmpty: { backgroundColor: Colors.dark.cardElevated, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' as const, flex: 1, marginRight: 8 },
  cardTime: { color: Colors.dark.textTertiary, fontSize: 11 },
  cardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' as const },
  cardDesc: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  cardMeta: { marginTop: 10, gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: Colors.dark.textTertiary, fontSize: 11 },
  progressSection: { marginTop: 10 },
  progressBarBg: { height: 3, backgroundColor: Colors.dark.cardElevated, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  progressText: { color: Colors.dark.textTertiary, fontSize: 10, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.dark.textSecondary, fontSize: 14 },
});