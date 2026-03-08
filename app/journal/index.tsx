import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Star, Film, Tv, Trash2, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useSocial } from '@/providers/SocialProvider';
import { getImageUrl } from '@/services/tmdb';
import { JournalEntry } from '@/types';
import * as Haptics from 'expo-haptics';

type ViewMode = 'list' | 'calendar';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function formatWatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} à ${hours}:${minutes}`;
}

function renderStars(rating: number): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    const isFull = i <= Math.floor(rating);
    const isHalf = !isFull && i - 0.5 <= rating;
    stars.push(
      <Star
        key={i}
        size={11}
        color={isFull || isHalf ? Colors.dark.gold : Colors.dark.textTertiary}
        fill={isFull ? Colors.dark.gold : 'transparent'}
      />
    );
  }
  return stars;
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { journal, removeJournalEntry, journalDates, totalWatchTime } = useSocial();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: { day: number; date: string; hasEntry: boolean; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({ day: 0, date: '', hasEntry: false, isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        date: dateStr,
        hasEntry: journalDates.includes(dateStr),
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentMonth, journalDates]);

  const filteredEntries = useMemo(() => {
    if (!selectedDate) return journal;
    return journal.filter(j => j.watched_at.startsWith(selectedDate));
  }, [journal, selectedDate]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = entry.watched_at.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const handleRemove = useCallback((entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeJournalEntry(entryId);
  }, [removeJournalEntry]);

  const navigateMonth = useCallback((direction: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  const movieCount = journal.filter(j => j.tmdb_type === 'movie').length;
  const seriesEpCount = journal.filter(j => j.tmdb_type === 'tv').length;
  const avgRating = journal.filter(j => j.rating).reduce((sum, j) => sum + (j.rating ?? 0), 0) / (journal.filter(j => j.rating).length || 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{movieCount}</Text>
          <Text style={styles.summaryLabel}>Films</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{seriesEpCount}</Text>
          <Text style={styles.summaryLabel}>Épisodes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(totalWatchTime / 60)}h</Text>
          <Text style={styles.summaryLabel}>Temps</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgRating.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Moyenne</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnActive]}
          onPress={() => { setViewMode('list'); setSelectedDate(null); }}
        >
          <BookOpen size={14} color={viewMode === 'list' ? '#fff' : Colors.dark.textSecondary} />
          <Text style={[styles.modeBtnText, viewMode === 'list' && styles.modeBtnTextActive]}>Liste</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, viewMode === 'calendar' && styles.modeBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Calendar size={14} color={viewMode === 'calendar' ? '#fff' : Colors.dark.textSecondary} />
          <Text style={[styles.modeBtnText, viewMode === 'calendar' && styles.modeBtnTextActive]}>Calendrier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {viewMode === 'calendar' && (
          <View style={styles.calendarWrap}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={8}>
                <ChevronLeft size={20} color={Colors.dark.text} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth(1)} hitSlop={8}>
                <ChevronRight size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarDaysHeader}>
              {DAYS_FR.map(d => (
                <Text key={d} style={styles.calendarDayLabel}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.calendarCell,
                    selectedDate === day.date && styles.calendarCellSelected,
                  ]}
                  onPress={() => day.isCurrentMonth && setSelectedDate(selectedDate === day.date ? null : day.date)}
                  disabled={!day.isCurrentMonth}
                >
                  {day.isCurrentMonth && (
                    <>
                      <Text style={[
                        styles.calendarCellText,
                        day.hasEntry && styles.calendarCellTextActive,
                        selectedDate === day.date && styles.calendarCellTextSelected,
                      ]}>
                        {day.day}
                      </Text>
                      {day.hasEntry && <View style={[styles.calendarDot, selectedDate === day.date && styles.calendarDotSelected]} />}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedDate && (
          <TouchableOpacity style={styles.clearFilter} onPress={() => setSelectedDate(null)}>
            <Text style={styles.clearFilterText}>Afficher tout</Text>
            <X size={12} color={Colors.dark.primary} />
          </TouchableOpacity>
        )}

        {groupedByDate.map(([date, entries]) => {
          const d = new Date(date);
          const dayLabel = `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
          return (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateGroupLabel}>{dayLabel}</Text>
              {entries.map((entry, idx) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.entryRow, idx < entries.length - 1 && styles.entryRowBorder]}
                  activeOpacity={0.7}
                  onPress={() => setDetailEntry(entry)}
                >
                  {entry.tmdb_poster ? (
                    <Image
                      source={{ uri: getImageUrl(entry.tmdb_poster, 'w154') ?? '' }}
                      style={styles.entryPoster}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.entryPoster, styles.entryPosterEmpty]}>
                      <Film size={16} color={Colors.dark.textTertiary} />
                    </View>
                  )}
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryTitle} numberOfLines={1}>{entry.tmdb_title}</Text>
                    <View style={styles.entryMeta}>
                      <Text style={styles.entryType}>
                        {entry.tmdb_type === 'movie' ? 'Film' : `S${entry.season ?? '?'}E${entry.episode ?? '?'}`}
                      </Text>
                      <Text style={styles.entryDot}>·</Text>
                      <Text style={styles.entryTime}>
                        {new Date(entry.watched_at).getHours().toString().padStart(2, '0')}:
                        {new Date(entry.watched_at).getMinutes().toString().padStart(2, '0')}
                      </Text>
                    </View>
                    {entry.rating !== undefined && entry.rating > 0 && (
                      <View style={styles.entryStars}>{renderStars(entry.rating)}</View>
                    )}
                    {entry.note && (
                      <Text style={styles.entryNote} numberOfLines={1}>{entry.note}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.entryDeleteBtn}
                    onPress={() => handleRemove(entry.id)}
                    hitSlop={8}
                  >
                    <Trash2 size={14} color={Colors.dark.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {groupedByDate.length === 0 && (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>Journal vide</Text>
            <Text style={styles.emptySubtitle}>
              {selectedDate ? 'Aucune entrée pour cette date' : 'Commencez à regarder pour remplir votre journal'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!detailEntry} animationType="slide" transparent>
        <View style={styles.detailOverlay}>
          <View style={[styles.detailSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.detailHandle} />
            {detailEntry && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle} numberOfLines={2}>{detailEntry.tmdb_title}</Text>
                  <TouchableOpacity onPress={() => setDetailEntry(null)} hitSlop={8}>
                    <X size={20} color={Colors.dark.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailBody}>
                  {detailEntry.tmdb_poster && (
                    <Image
                      source={{ uri: getImageUrl(detailEntry.tmdb_poster, 'w342') ?? '' }}
                      style={styles.detailPoster}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.detailMeta}>
                    <View style={styles.detailMetaRow}>
                      <Calendar size={13} color={Colors.dark.textSecondary} />
                      <Text style={styles.detailMetaText}>{formatWatchDate(detailEntry.watched_at)}</Text>
                    </View>
                    <View style={styles.detailMetaRow}>
                      {detailEntry.tmdb_type === 'movie' ? <Film size={13} color={Colors.dark.textSecondary} /> : <Tv size={13} color={Colors.dark.textSecondary} />}
                      <Text style={styles.detailMetaText}>
                        {detailEntry.tmdb_type === 'movie' ? 'Film' : `Saison ${detailEntry.season} · Épisode ${detailEntry.episode}`}
                      </Text>
                    </View>
                    {detailEntry.rating !== undefined && detailEntry.rating > 0 && (
                      <View style={styles.detailMetaRow}>
                        <View style={styles.detailStarsRow}>{renderStars(detailEntry.rating)}</View>
                        <Text style={styles.detailRatingNum}>{detailEntry.rating}/5</Text>
                      </View>
                    )}
                  </View>
                </View>
                {detailEntry.note && (
                  <View style={styles.detailNoteBox}>
                    <Text style={styles.detailNoteLabel}>Note personnelle</Text>
                    <Text style={styles.detailNoteText}>{detailEntry.note}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => {
                    setDetailEntry(null);
                    router.push(`/media/${detailEntry.tmdb_id}?type=${detailEntry.tmdb_type}` as any);
                  }}
                >
                  <Text style={styles.detailBtnText}>Voir la page détail</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: Colors.dark.text, fontSize: 18, fontWeight: '800' as const },
  summaryLabel: { color: Colors.dark.textTertiary, fontSize: 10, marginTop: 2, fontWeight: '500' as const },
  summaryDivider: { width: 0.5, height: 24, backgroundColor: Colors.dark.borderLight },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, gap: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8, backgroundColor: Colors.dark.card },
  modeBtnActive: { backgroundColor: Colors.dark.primary },
  modeBtnText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600' as const },
  modeBtnTextActive: { color: '#fff' },
  calendarWrap: { marginHorizontal: 16, marginBottom: 12 },
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' as const },
  calendarDaysHeader: { flexDirection: 'row', marginBottom: 6 },
  calendarDayLabel: { flex: 1, textAlign: 'center' as const, color: Colors.dark.textTertiary, fontSize: 11, fontWeight: '600' as const },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' as const },
  calendarCell: { width: '14.28%' as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' as const },
  calendarCellSelected: { backgroundColor: Colors.dark.primary, borderRadius: 18 },
  calendarCellText: { color: Colors.dark.textSecondary, fontSize: 14 },
  calendarCellTextActive: { color: Colors.dark.text, fontWeight: '700' as const },
  calendarCellTextSelected: { color: '#fff' },
  calendarDot: { position: 'absolute' as const, bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.dark.primary },
  calendarDotSelected: { backgroundColor: '#fff' },
  clearFilter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  clearFilterText: { color: Colors.dark.primary, fontSize: 13, fontWeight: '600' as const },
  dateGroup: { paddingHorizontal: 16, marginBottom: 8 },
  dateGroupLabel: { color: Colors.dark.textTertiary, fontSize: 12, fontWeight: '700' as const, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  entryRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  entryPoster: { width: 40, height: 60, borderRadius: 5 },
  entryPosterEmpty: { backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  entryInfo: { flex: 1, gap: 2 },
  entryTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entryType: { color: Colors.dark.primary, fontSize: 11, fontWeight: '600' as const },
  entryDot: { color: Colors.dark.textTertiary, fontSize: 11 },
  entryTime: { color: Colors.dark.textTertiary, fontSize: 11 },
  entryStars: { flexDirection: 'row', gap: 1, marginTop: 1 },
  entryNote: { color: Colors.dark.textTertiary, fontSize: 12, fontStyle: 'italic' as const, marginTop: 1 },
  entryDeleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: '700' as const },
  emptySubtitle: { color: Colors.dark.textSecondary, fontSize: 13, textAlign: 'center' as const, paddingHorizontal: 40 },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: Colors.dark.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20 },
  detailHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.dark.textTertiary, alignSelf: 'center', marginBottom: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const, flex: 1, marginRight: 12 },
  detailBody: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  detailPoster: { width: 90, height: 135, borderRadius: 8 },
  detailMeta: { flex: 1, gap: 10, justifyContent: 'center' },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailMetaText: { color: Colors.dark.textSecondary, fontSize: 13 },
  detailStarsRow: { flexDirection: 'row', gap: 2 },
  detailRatingNum: { color: Colors.dark.gold, fontSize: 13, fontWeight: '600' as const },
  detailNoteBox: { backgroundColor: Colors.dark.card, borderRadius: 10, padding: 12, marginBottom: 16 },
  detailNoteLabel: { color: Colors.dark.textTertiary, fontSize: 11, fontWeight: '600' as const, marginBottom: 4 },
  detailNoteText: { color: Colors.dark.text, fontSize: 14, lineHeight: 20 },
  detailBtn: { backgroundColor: Colors.dark.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 8 },
  detailBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});