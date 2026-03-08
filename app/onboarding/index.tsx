import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getTrending, getImageUrl } from '@/services/tmdb';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POSTER_GAP = 4;
const COLS = 3;
const POSTER_W = (SCREEN_WIDTH - POSTER_GAP * (COLS + 1)) / COLS;
const POSTER_H = POSTER_W * 1.35;

export default function OnboardingLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [posters, setPosters] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-posters'],
    queryFn: () => getTrending('all', 'week'),
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (data?.results) {
      const urls = data.results
        .filter((item: any) => item.poster_path)
        .slice(0, 12)
        .map((item: any) => getImageUrl(item.poster_path, 'w342') as string);
      setPosters(urls);
    }
  }, [data]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = (type: 'google' | 'apple' | 'email') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === 'email') {
      router.push('/onboarding/email-signup' as any);
    } else {
      router.push('/onboarding/email-signup' as any);
    }
  };

  const renderPosterGrid = () => {
    if (posters.length === 0) return null;

    const rows = [];
    for (let i = 0; i < 4; i++) {
      const rowPosters = [];
      for (let j = 0; j < COLS; j++) {
        const idx = (i * COLS + j) % posters.length;
        rowPosters.push(
          <View
            key={`${i}-${j}`}
            style={[
              styles.posterCell,
              {
                width: POSTER_W,
                height: POSTER_H,
                marginLeft: j === 0 ? POSTER_GAP : POSTER_GAP / 2,
                marginRight: j === COLS - 1 ? POSTER_GAP : POSTER_GAP / 2,
                transform: [{ rotate: (i % 2 === 0 ? -2 : 2) + 'deg' }],
              },
            ]}
          >
            <Image
              source={{ uri: posters[idx] }}
              style={styles.posterImage}
              contentFit="cover"
            />
          </View>
        );
      }
      rows.push(
        <View key={i} style={[styles.posterRow, { marginTop: i === 0 ? 0 : POSTER_GAP }]}>
          {rowPosters}
        </View>
      );
    }
    return rows;
  };

  return (
    <View style={styles.container}>
      <View style={styles.posterGrid}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
          </View>
        ) : (
          renderPosterGrid()
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.4)', 'rgba(10,10,15,0.85)', Colors.dark.background]}
          locations={[0, 0.3, 0.6, 0.85]}
          style={styles.posterOverlay}
        />
      </View>

      <Animated.View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>
          Découvrez ce qui{'\n'}se passe autour{'\n'}de vous
        </Text>
        <Text style={styles.subtitle}>
          Explorez des films, séries, avis et moments partagés par la communauté.
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handlePress('google')}
            activeOpacity={0.8}
            testID="onboarding-google"
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continuer avec Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.appleButton}
            onPress={() => handlePress('apple')}
            activeOpacity={0.8}
            testID="onboarding-apple"
          >
            <Text style={styles.appleIcon}></Text>
            <Text style={styles.appleText}>Continuer avec Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => handlePress('email')}
            activeOpacity={0.8}
            testID="onboarding-email"
          >
            <Mail size={18} color={Colors.dark.text} />
            <Text style={styles.emailText}>Continuer avec Email</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  posterGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
    overflow: 'hidden',
  },
  posterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  posterCell: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonsContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    borderRadius: 28,
    paddingVertical: 16,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 28,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  appleIcon: {
    fontSize: 20,
    color: Colors.dark.text,
  },
  appleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 28,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
});