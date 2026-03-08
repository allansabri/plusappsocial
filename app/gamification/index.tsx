import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trophy, Target, Crown, Flame, CheckCircle, ChevronRight, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useGamification } from '@/providers/GamificationProvider';
import { Badge, Challenge, LeaderboardEntry } from '@/types';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GamifTab = 'badges' | 'challenges' | 'leaderboard';

export default function GamificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { xp, level, levelProgress, badges, earnedBadges, activeChallenges, completedChallenges, leaderboard, streak, updateChallengeProgress } = useGamification();
  const [activeTab, setActiveTab] = useState<GamifTab>('badges');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredBadges = selectedCategory
    ? badges.filter(b => b.category === selectedCategory)
    : badges;

  const categories = [
    { key: 'watching', label: 'Visionnage' },
    { key: 'social', label: 'Social' },
    { key: 'collection', label: 'Collection' },
    { key: 'special', label: 'Spécial' },
  ];

  const renderBadgeItem = useCallback((badge: Badge) => {
    const isUnlocked = !!badge.unlockedAt;
    const progressPercent = Math.min((badge.progress / badge.target) * 100, 100);
    return (
      <TouchableOpacity
        key={badge.id}
        style={[styles.badgeRow, !isUnlocked && styles.badgeRowLocked]}
        activeOpacity={0.7}
      >
        <View style={[styles.badgeIconWrap, isUnlocked && styles.badgeIconWrapUnlocked]}>
          <Text style={styles.badgeEmoji}>{badge.icon}</Text>
        </View>
        <View style={styles.badgeContent}>
          <View style={styles.badgeNameRow}>
            <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]} numberOfLines={1}>{badge.name}</Text>
            {isUnlocked && <CheckCircle size={14} color={Colors.dark.success} />}
          </View>
          <Text style={styles.badgeDesc} numberOfLines={1}>{badge.description}</Text>
          {!isUnlocked && (
            <View style={styles.badgeProgressRow}>
              <View style={styles.badgeBarBg}>
                <View style={[styles.badgeBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.badgeProgressText}>{badge.progress}/{badge.target}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderChallengeItem = useCallback((challenge: Challenge) => {
    const progressPercent = (challenge.progress / challenge.target) * 100;
    const typeLabel = challenge.type === 'daily' ? 'Quotidien' : challenge.type === 'weekly' ? 'Hebdo' : 'Mensuel';
    const remaining = challenge.type === 'daily' ? '23h' : challenge.type === 'weekly' ? '5j' : '22j';
    return (
      <View key={challenge.id} style={styles.challengeRow}>
        <View style={styles.challengeLeft}>
          <Text style={styles.challengeEmoji}>{challenge.icon}</Text>
        </View>
        <View style={styles.challengeCenter}>
          <View style={styles.challengeTitleRow}>
            <Text style={styles.challengeTitle} numberOfLines={1}>{challenge.title}</Text>
            <Text style={styles.challengeTime}>{remaining}</Text>
          </View>
          <Text style={styles.challengeDesc} numberOfLines={1}>{challenge.description}</Text>
          <View style={styles.challengeProgressRow}>
            <View style={styles.challengeBarBg}>
              <View style={[styles.challengeBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.challengeProgressNum}>{challenge.progress}/{challenge.target}</Text>
          </View>
          <View style={styles.challengeFooter}>
            <View style={styles.challengeTypePill}>
              <Text style={styles.challengeTypeText}>{typeLabel}</Text>
            </View>
            <Text style={styles.challengeXp}>+{challenge.reward_xp} XP</Text>
          </View>
        </View>
        {!challenge.completed && (
          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateChallengeProgress(challenge.id);
            }}
            activeOpacity={0.7}
          >
            <Zap size={16} color={Colors.dark.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [updateChallengeProgress]);

  const renderLeaderboardItem = useCallback((entry: LeaderboardEntry, index: number) => {
    const isUser = entry.id === 'current-user';
    const isTop3 = entry.rank <= 3;
    const rankEmojis = ['🥇', '🥈', '🥉'];
    return (
      <View key={entry.id} style={[styles.leaderRow, isUser && styles.leaderRowUser]}>
        <View style={styles.leaderRankWrap}>
          {isTop3 ? (
            <Text style={styles.leaderRankEmoji}>{rankEmojis[entry.rank - 1]}</Text>
          ) : (
            <Text style={styles.leaderRankNum}>{entry.rank}</Text>
          )}
        </View>
        <View style={[styles.leaderAvatar, isUser && styles.leaderAvatarUser]}>
          <Text style={styles.leaderAvatarText}>{entry.display_name.charAt(0)}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={[styles.leaderName, isUser && styles.leaderNameUser]}>
            {isUser ? 'Vous' : entry.display_name}
          </Text>
          <Text style={styles.leaderHandle}>@{entry.username}</Text>
        </View>
        <View style={styles.leaderRight}>
          <Text style={styles.leaderXp}>{entry.xp.toLocaleString()}</Text>
          <Text style={styles.leaderXpLabel}>XP</Text>
        </View>
      </View>
    );
  }, []);

  const xpPercent = levelProgress.needed > 0 ? (levelProgress.current / levelProgress.needed) * 100 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gamification</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.levelSection}>
        <View style={styles.levelRow}>
          <View style={styles.levelLeft}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLabel}>Niveau</Text>
          </View>
          <View style={styles.levelCenter}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
            </View>
            <Text style={styles.xpText}>{levelProgress.current}/{levelProgress.needed} XP</Text>
          </View>
          <View style={styles.levelRight}>
            <View style={styles.streakPill}>
              <Flame size={12} color="#FF6B35" />
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          </View>
        </View>
        <View style={styles.levelStatsRow}>
          <Text style={styles.levelStatText}>{xp.toLocaleString()} XP total</Text>
          <Text style={styles.levelStatDot}>·</Text>
          <Text style={styles.levelStatText}>{earnedBadges.length}/{badges.length} badges</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: 'badges' as GamifTab, label: 'Badges', icon: Trophy },
          { key: 'challenges' as GamifTab, label: 'Défis', icon: Target },
          { key: 'leaderboard' as GamifTab, label: 'Classement', icon: Crown },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => { setActiveTab(tab.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              activeOpacity={0.7}
            >
              <tab.icon size={14} color={isActive ? '#fff' : Colors.dark.textSecondary} />
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {activeTab === 'badges' && (
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>Tous</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat.key && styles.filterChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredBadges.map(renderBadgeItem)}
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Défis actifs</Text>
            {activeChallenges.map(renderChallengeItem)}
            {completedChallenges.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Complétés</Text>
                {completedChallenges.map(ch => (
                  <View key={ch.id} style={[styles.challengeRow, { opacity: 0.5 }]}>
                    <View style={styles.challengeLeft}>
                      <Text style={styles.challengeEmoji}>{ch.icon}</Text>
                    </View>
                    <View style={styles.challengeCenter}>
                      <Text style={styles.challengeTitle}>{ch.title}</Text>
                      <Text style={styles.challengeDesc}>{ch.description}</Text>
                    </View>
                    <CheckCircle size={18} color={Colors.dark.success} />
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Classement hebdomadaire</Text>
            <Text style={styles.sectionSub}>Basé sur les XP gagnés cette semaine</Text>
            {leaderboard.map(renderLeaderboardItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const },
  levelSection: { marginHorizontal: 16, marginBottom: 16 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelLeft: { alignItems: 'center' },
  levelNum: { color: Colors.dark.text, fontSize: 28, fontWeight: '800' as const, lineHeight: 32 },
  levelLabel: { color: Colors.dark.textTertiary, fontSize: 10, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  levelCenter: { flex: 1 },
  xpBarBg: { height: 6, backgroundColor: Colors.dark.cardElevated, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.dark.primary, borderRadius: 3 },
  xpText: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 4 },
  levelRight: { alignItems: 'center' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255, 107, 53, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  streakNum: { color: '#FF6B35', fontSize: 13, fontWeight: '700' as const },
  levelStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  levelStatText: { color: Colors.dark.textSecondary, fontSize: 12 },
  levelStatDot: { color: Colors.dark.textTertiary, fontSize: 12 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.dark.card },
  tabBtnActive: { backgroundColor: Colors.dark.primary },
  tabBtnText: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: '600' as const },
  tabBtnTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16 },
  sectionLabel: { color: Colors.dark.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
  sectionSub: { color: Colors.dark.textSecondary, fontSize: 13, marginTop: -8, marginBottom: 16 },
  filterRow: { gap: 8, paddingBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.dark.card },
  filterChipActive: { backgroundColor: Colors.dark.primary },
  filterChipText: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '500' as const },
  filterChipTextActive: { color: '#fff' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  badgeRowLocked: { opacity: 0.6 },
  badgeIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  badgeIconWrapUnlocked: { backgroundColor: Colors.dark.primaryLight },
  badgeEmoji: { fontSize: 22 },
  badgeContent: { flex: 1 },
  badgeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeName: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const },
  badgeNameLocked: { color: Colors.dark.textSecondary },
  badgeDesc: { color: Colors.dark.textTertiary, fontSize: 12, marginTop: 2 },
  badgeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badgeBarBg: { flex: 1, height: 3, backgroundColor: Colors.dark.cardElevated, borderRadius: 2, overflow: 'hidden' },
  badgeBarFill: { height: '100%', backgroundColor: Colors.dark.primary, borderRadius: 2 },
  badgeProgressText: { color: Colors.dark.textTertiary, fontSize: 10, fontWeight: '600' as const },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  challengeLeft: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  challengeEmoji: { fontSize: 20 },
  challengeCenter: { flex: 1 },
  challengeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeTitle: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' as const, flex: 1 },
  challengeTime: { color: Colors.dark.textTertiary, fontSize: 11 },
  challengeDesc: { color: Colors.dark.textTertiary, fontSize: 12, marginTop: 2 },
  challengeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  challengeBarBg: { flex: 1, height: 3, backgroundColor: Colors.dark.cardElevated, borderRadius: 2, overflow: 'hidden' },
  challengeBarFill: { height: '100%', backgroundColor: Colors.dark.primary, borderRadius: 2 },
  challengeProgressNum: { color: Colors.dark.textTertiary, fontSize: 10, fontWeight: '600' as const },
  challengeFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  challengeTypePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: Colors.dark.card },
  challengeTypeText: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: '600' as const },
  challengeXp: { color: Colors.dark.gold, fontSize: 11, fontWeight: '700' as const },
  challengeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.primaryLight, alignItems: 'center', justifyContent: 'center' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.borderLight },
  leaderRowUser: { backgroundColor: Colors.dark.primaryLight, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 10 },
  leaderRankWrap: { width: 28, alignItems: 'center' },
  leaderRankEmoji: { fontSize: 18 },
  leaderRankNum: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '700' as const },
  leaderAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  leaderAvatarUser: { borderWidth: 1.5, borderColor: Colors.dark.primary },
  leaderAvatarText: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' as const },
  leaderInfo: { flex: 1 },
  leaderName: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' as const },
  leaderNameUser: { color: Colors.dark.primary },
  leaderHandle: { color: Colors.dark.textTertiary, fontSize: 11, marginTop: 1 },
  leaderRight: { alignItems: 'flex-end' },
  leaderXp: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' as const },
  leaderXpLabel: { color: Colors.dark.textTertiary, fontSize: 10 },
});