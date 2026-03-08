import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { UserPlus, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useAuth } from '@/providers/AuthProvider';
import * as Haptics from 'expo-haptics';

interface SuggestedAccount {
  id: string;
  name: string;
  handle: string;
  description: string;
  avatar: string;
  verified: boolean;
}

const SUGGESTED_ACCOUNTS: SuggestedAccount[] = [
  { id: '1', name: 'CinéScope', handle: '@cinescope', description: 'Critiques & analyses de films', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=CS&backgroundColor=2563EB', verified: true },
  { id: '2', name: 'Séries Addict', handle: '@seriesaddict', description: 'Toute l\'actu séries TV', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=SA&backgroundColor=7C3AED', verified: true },
  { id: '3', name: 'AlloCiné', handle: '@allocine', description: 'Le guide du cinéma et des séries', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=AC&backgroundColor=F59E0B', verified: true },
  { id: '4', name: 'Le Fossoyeur', handle: '@lefossoyeur', description: 'Vidéaste & passionné de cinéma', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=LF&backgroundColor=EF4444', verified: false },
  { id: '5', name: 'Netflix France', handle: '@netflixfr', description: 'Compte officiel Netflix France', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=NF&backgroundColor=E50914', verified: true },
  { id: '6', name: 'Disney+ FR', handle: '@disneyplusfr', description: 'La magie Disney en streaming', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=D+&backgroundColor=1D4FBF', verified: true },
  { id: '7', name: 'Premiere.fr', handle: '@premierefr', description: 'Magazine cinéma n°1', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=PR&backgroundColor=DC2626', verified: true },
  { id: '8', name: 'FilmFan_Paris', handle: '@filmfan_paris', description: 'Cinéphile parisien, critiques quotidiennes', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=FP&backgroundColor=059669', verified: false },
  { id: '9', name: 'Canal+ Séries', handle: '@canalseries', description: 'Les meilleures séries sur Canal+', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=C+&backgroundColor=1F2937', verified: true },
  { id: '10', name: 'Oscar Buzz', handle: '@oscarbuzz', description: 'Pronostics & news Oscars', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=OB&backgroundColor=CA8A04', verified: false },
  { id: '11', name: 'Horror Club', handle: '@horrorclub', description: 'Communauté de fans d\'horreur', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=HC&backgroundColor=7F1D1D', verified: false },
  { id: '12', name: 'SciFi Universe', handle: '@scifiuniverse', description: 'Science-fiction & fantastique', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=SU&backgroundColor=6366F1', verified: false },
];

export default function FollowSuggestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: onboardingData, updateData, completeOnboarding } = useOnboarding();
  const { signUp } = useAuth();
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const toggleFollow = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFollowAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allIds = SUGGESTED_ACCOUNTS.map(a => a.id);
    if (followed.size === allIds.length) {
      setFollowed(new Set());
    } else {
      setFollowed(new Set(allIds));
    }
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateData({ followedAccounts: Array.from(followed) });
    await completeOnboarding();
    await signUp('demo@plus.app', 'demo1234', onboardingData.username || 'user', onboardingData.username || 'User');
    router.replace('/');
  };

  const allFollowed = followed.size === SUGGESTED_ACCOUNTS.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Follow Accounts</Text>
        <TouchableOpacity onPress={handleFollowAll} activeOpacity={0.7}>
          <Text style={styles.followAllText}>
            {allFollowed ? 'Unfollow all' : 'Follow all'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Suivez des comptes</Text>
          <Text style={styles.subtitle}>
            Personnalisez votre feed en suivant des comptes qui vous intéressent.
          </Text>

          {SUGGESTED_ACCOUNTS.map(account => {
            const isFollowed = followed.has(account.id);
            return (
              <View key={account.id} style={styles.accountRow}>
                <Image source={{ uri: account.avatar }} style={styles.avatar} contentFit="cover" />
                <View style={styles.accountInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                    {account.verified && (
                      <View style={styles.verifiedBadge}>
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.accountHandle}>{account.handle}</Text>
                  <Text style={styles.accountDesc} numberOfLines={1}>{account.description}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.followButton, isFollowed && styles.followedButton]}
                  onPress={() => toggleFollow(account.id)}
                  activeOpacity={0.7}
                >
                  {isFollowed ? (
                    <Text style={styles.followedText}>Suivi</Text>
                  ) : (
                    <>
                      <UserPlus size={14} color="#fff" />
                      <Text style={styles.followText}>Suivre</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          testID="follow-continue"
        >
          <Text style={styles.continueText}>Continue</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  followAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHandle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  accountDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followedButton: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  followText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  followedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
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
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});