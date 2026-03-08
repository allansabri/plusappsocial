import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#A8E6CF', '#FF9A9E', Colors.dark.primary, Colors.dark.success];

function ConfettiPiece({ delay, x, color, size }: { delay: number; x: number; color: string; size: number }) {
  const fallAnim = useRef(new Animated.Value(-50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(fallAnim, { toValue: 400, duration: 2500 + Math.random() * 1000, delay, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 2000, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
        transform: [{ translateY: fallAnim }, { rotate }],
        opacity: opacityAnim,
      }}
    />
  );
}

export default function ConfirmedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/avatar' as any);
  };

  const confettiPieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    delay: Math.random() * 800,
    x: Math.random() * SCREEN_WIDTH,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 8 + Math.random() * 12,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.confettiLayer}>
        {confettiPieces.map(p => (
          <ConfettiPiece key={p.id} delay={p.delay} x={p.x} color={p.color} size={p.size} />
        ))}
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.badgeOuter, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.badgeInner}>
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Check size={48} color="#fff" strokeWidth={3} />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>You're All Set 🎉</Text>
          <Text style={styles.subtitle}>
            Your profile is ready. Let's see what's happening around you.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
          testID="confirmed-start"
        >
          <Text style={styles.startText}>Start Exploring</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  confettiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    overflow: 'hidden',
    zIndex: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeOuter: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: Colors.dark.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: Colors.dark.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    transform: [{ rotate: '12deg' }],
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  startButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});