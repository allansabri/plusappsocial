import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import * as Haptics from 'expo-haptics';

const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/png?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Aneka&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Milo&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Luna&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Oliver&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Sophia&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Zara&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Leo&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Maya&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Noah&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Ivy&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/png?seed=Kai&backgroundColor=ffdfbf',
];

export default function AvatarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData } = useOnboarding();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(data.avatarUrl);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedAvatar(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedAvatar(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectAvatar = (url: string) => {
    setSelectedAvatar(url);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = () => {
    updateData({ avatarUrl: selectedAvatar });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/profile-info' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Setup Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '33%' }]} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Choose Your Avatar</Text>
          <Text style={styles.subtitle}>
            Pick an avatar or upload your own photo. You can change this later.
          </Text>

          <TouchableOpacity style={styles.mainAvatar} onPress={handlePickImage} activeOpacity={0.8}>
            {selectedAvatar ? (
              <Image source={{ uri: selectedAvatar }} style={styles.mainAvatarImage} contentFit="cover" />
            ) : (
              <View style={styles.mainAvatarPlaceholder} />
            )}
            <View style={styles.cameraIcon}>
              <Camera size={16} color={Colors.dark.text} />
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Pick an Avatar</Text>

          <View style={styles.avatarGrid}>
            {AVATARS.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.avatarCell,
                  selectedAvatar === url && styles.avatarCellSelected,
                ]}
                onPress={() => handleSelectAvatar(url)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: url }} style={styles.avatarImage} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          testID="avatar-continue"
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 32,
  },
  mainAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.card,
    alignSelf: 'center',
    marginBottom: 32,
    overflow: 'visible',
  },
  mainAvatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  mainAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.cardElevated,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.card,
    borderWidth: 2,
    borderColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCell: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarCellSelected: {
    borderColor: Colors.dark.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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