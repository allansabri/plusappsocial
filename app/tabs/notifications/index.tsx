import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Bell, UserPlus, Repeat2, AtSign, Settings, MessageCircle, Trophy, Calendar, ChevronLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

type NotifTab = 'all' | 'priority' | 'mentions';

interface NotificationItem {
  id: string;
  type: 'like' | 'follow' | 'repost' | 'mention' | 'comment' | 'badge' | 'reminder' | 'post_group';
  avatars: string[];
  mainUser: string;
  otherCount: number;
  message: string;
  preview?: string;
  thumbnail?: string;
  timestamp: string;
  read: boolean;
  isPriority?: boolean;
  isMention?: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1', type: 'like', avatars: ['A', 'L', 'E', 'M', 'T', 'S', 'J'],
    mainUser: 'Alexis', otherCount: 58,
    message: 'et 58 autres personnes ont aimé votre post.',
    preview: 'Le dernier épisode de "A Knight of the Seven Kingdoms" est disponible sur HBO Max.',
    thumbnail: 'https://image.tmdb.org/t/p/w185/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    timestamp: '12 m', read: false, isPriority: true,
  },
  {
    id: 'n2', type: 'post_group', avatars: ['H', 'G', 'M', 'B'],
    mainUser: 'HBO', otherCount: 3,
    message: 'Nouvelles notifications de posts pour HBO et 3 autres personnes',
    timestamp: '41 m', read: false, isPriority: true,
  },
  {
    id: 'n3', type: 'like', avatars: ['T', 'G', 'N', 'E', 'C', 'M', 'K'],
    mainUser: 'Tãd GN', otherCount: 99,
    message: 'et 99 autres personnes ont aimé votre post.',
    preview: 'La saison 1 de "A Knight of the Seven Kingdoms" est terminée...',
    thumbnail: 'https://image.tmdb.org/t/p/w185/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg',
    timestamp: '49 m', read: false, isPriority: true,
  },
  {
    id: 'n4', type: 'like', avatars: ['J'],
    mainUser: 'Jonathan', otherCount: 0,
    message: 'a aimé votre post.',
    preview: "J'ai énormément avancé sur l'application...",
    timestamp: '1 h', read: false,
  },
  {
    id: 'n5', type: 'like', avatars: ['K', 'C', 'A', 'M', 'T', 'L', 'S'],
    mainUser: 'Klaayn', otherCount: 31,
    message: 'et 31 autres personnes ont aimé votre post.',
    preview: 'L\'épisode 6 de "A Knight of the Seven Kingdoms" sera diffusé demain...',
    thumbnail: 'https://image.tmdb.org/t/p/w185/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    timestamp: '1 h', read: true, isPriority: true,
  },
  {
    id: 'n6', type: 'follow', avatars: ['R'],
    mainUser: 'Rizzy', otherCount: 0,
    message: 'vous suit',
    timestamp: '1 h', read: true,
  },
  {
    id: 'n7', type: 'repost', avatars: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mainUser: 'أيغون', otherCount: 14,
    message: 'et 14 autres personnes ont reposté votre post.',
    preview: 'La saison 1 de "A Knight of the Seven Kingdoms" est terminée...',
    thumbnail: 'https://image.tmdb.org/t/p/w185/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg',
    timestamp: '3 h', read: true,
  },
  {
    id: 'n8', type: 'follow', avatars: ['A'],
    mainUser: 'alice', otherCount: 0,
    message: 'vous suit',
    timestamp: '3 h', read: true,
  },
  {
    id: 'n9', type: 'like', avatars: ['S'],
    mainUser: 'sam', otherCount: 0,
    message: 'a aimé 2 de vos posts.',
    preview: 'Le film "Joker : Folie à Deux" arrive le 4 mars sur HBO Max.',
    thumbnail: 'https://image.tmdb.org/t/p/w185/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    timestamp: '5 h', read: true,
  },
  {
    id: 'n10', type: 'mention', avatars: ['M'],
    mainUser: 'Marie', otherCount: 0,
    message: 'vous a mentionné dans un commentaire',
    preview: '@vous super recommandation merci !',
    timestamp: '6 h', read: true, isMention: true,
  },
  {
    id: 'n11', type: 'comment', avatars: ['L', 'T'],
    mainUser: 'Lucas', otherCount: 1,
    message: 'et 1 autre personne ont commenté votre post.',
    preview: 'Totalement d\'accord avec ton avis sur Oppenheimer',
    timestamp: '8 h', read: true,
  },
  {
    id: 'n12', type: 'mention', avatars: ['E'],
    mainUser: 'Emma', otherCount: 0,
    message: 'vous a mentionné dans un post',
    preview: 'Avec @vous on a regardé Dune 2 hier soir, incroyable !',
    timestamp: '12 h', read: true, isMention: true,
  },
];

const ICON_MAP: Record<string, { icon: typeof Heart; color: string; fill?: boolean }> = {
  like: { icon: Heart, color: '#FF4D67', fill: true },
  follow: { icon: UserPlus, color: Colors.dark.primary },
  repost: { icon: Repeat2, color: Colors.dark.success },
  mention: { icon: AtSign, color: Colors.dark.primary },
  comment: { icon: MessageCircle, color: Colors.dark.blue },
  badge: { icon: Trophy, color: Colors.dark.gold },
  reminder: { icon: Calendar, color: Colors.dark.warning },
  post_group: { icon: Bell, color: Colors.dark.primary },
};

const AVATAR_COLORS = ['#FF4D67', '#2563EB', '#30D158', '#FF9F0A', '#8B5CF6', '#06B6D4', '#F472B6'];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotifTab>('all');

  const filteredNotifications = MOCK_NOTIFICATIONS.filter(n => {
    if (activeTab === 'priority') return n.isPriority;
    if (activeTab === 'mentions') return n.isMention;
    return true;
  });

  const renderAvatarStack = useCallback((avatars: string[], max: number = 6) => {
    const shown = avatars.slice(0, max);
    return (
      <View style={styles.avatarStack}>
        {shown.map((initial, i) => {
          const bg = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <View
              key={i}
              style={[styles.avatarSquare, { backgroundColor: bg, marginLeft: i > 0 ? -10 : 0, zIndex: max - i }]}
            >
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          );
        })}
      </View>
    );
  }, []);

  const renderNotification = useCallback((notif: NotificationItem) => {
    const iconData = ICON_MAP[notif.type] || ICON_MAP.like;
    const IconComponent = iconData.icon;

    return (
      <TouchableOpacity
        key={notif.id}
        style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
        activeOpacity={0.7}
      >
        <View style={styles.notifIconWrap}>
          <IconComponent
            size={18}
            color={iconData.color}
            fill={iconData.fill ? iconData.color : 'transparent'}
          />
        </View>

        <View style={styles.notifContent}>
          {renderAvatarStack(notif.avatars)}

          <View style={styles.notifTextBlock}>
            <Text style={styles.notifMessage} numberOfLines={2}>
              <Text style={styles.notifUsername}>{notif.mainUser} </Text>
              {notif.message}
              <Text style={styles.notifTime}> · {notif.timestamp}</Text>
            </Text>
            {notif.preview && (
              <Text style={styles.notifPreview} numberOfLines={2}>{notif.preview}</Text>
            )}
          </View>
        </View>

        {notif.thumbnail ? (
          <View style={styles.notifThumbWrap}>
            <Image
              source={{ uri: notif.thumbnail }}
              style={styles.notifThumbImg}
              contentFit="cover"
            />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }, [renderAvatarStack]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity hitSlop={12}>
          <Settings size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {([
          { key: 'all' as NotifTab, label: 'Tous' },
          { key: 'priority' as NotifTab, label: 'Priorité' },
          { key: 'mentions' as NotifTab, label: 'Mentions' },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab(tab.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {filteredNotifications.map(renderNotification)}
        {filteredNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Bell size={36} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' as const },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.borderLight,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.dark.primary },
  tabText: { color: Colors.dark.textSecondary, fontSize: 14, fontWeight: '500' as const },
  tabTextActive: { color: Colors.dark.text, fontWeight: '700' as const },
  notifRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.borderLight,
  },
  notifRowUnread: { backgroundColor: 'rgba(37, 99, 235, 0.04)' },
  notifIconWrap: {
    width: 34,
    alignItems: 'center',
    paddingTop: 2,
  },
  notifContent: { flex: 1, marginLeft: 4 },
  avatarStack: { flexDirection: 'row', marginBottom: 8 },
  avatarSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  avatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  notifTextBlock: {},
  notifMessage: { color: Colors.dark.text, fontSize: 14, lineHeight: 20 },
  notifUsername: { fontWeight: '700' as const },
  notifTime: { color: Colors.dark.textTertiary, fontSize: 13, fontWeight: '400' as const },
  notifPreview: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  notifThumbWrap: {
    marginLeft: 12,
    alignSelf: 'center',
  },
  notifThumbImg: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.dark.textSecondary, fontSize: 14 },
});