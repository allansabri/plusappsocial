import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Pressable,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { feedTabBarVisible } from '@/stores/feedScrollStore';

interface FloatingCreateButtonProps {
  bottomOffset?: number;
}

export default function FloatingCreateButton({ bottomOffset = 0 }: FloatingCreateButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const toggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (expanded) {
      Animated.parallel([
        Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setExpanded(false));
    } else {
      setExpanded(true);
      Animated.parallel([
        Animated.spring(expandAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [expanded, expandAnim, rotateAnim]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setExpanded(false));
  }, [expandAnim, rotateAnim]);

  const handleOption = useCallback((type: 'story' | 'post') => {
    close();
    setTimeout(() => {
      if (type === 'story') {
        router.push('/story/create' as any);
      } else {
        router.push('/create-post' as any);
      }
    }, 250);
  }, [close, router]);

  const handlePressIn = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.9, useNativeDriver: true, speed: 30 }).start();
  }, [buttonScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [buttonScale]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const TAB_BAR_HEIGHT = 48;
  const fabBaseBottom = insets.bottom + TAB_BAR_HEIGHT + 16 + bottomOffset;

  const fabTranslateY = feedTabBarVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [TAB_BAR_HEIGHT + bottomOffset, 0],
  });

  return (
    <>
      {expanded && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000', opacity: backdropOpacity, zIndex: 998 },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
      )}

      {expanded && (
        <Animated.View
          style={[
            styles.optionsContainer,
            {
              bottom: fabBaseBottom + 62,
              transform: [{ translateY: fabTranslateY }],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleOption('story')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>Publier une Story</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            style={{
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
                {
                  scale: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleOption('post')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>Publier un Post</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: fabBaseBottom,
            transform: [{ translateY: fabTranslateY }, { scale: buttonScale }],
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={toggle}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          testID="floating-create-btn"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  optionsContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
    alignItems: 'flex-end',
    gap: 10,
  },
  optionBtn: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});