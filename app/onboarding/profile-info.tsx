import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AtSign, ChevronDown, Calendar, CircleCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/providers/OnboardingProvider';
import * as Haptics from 'expo-haptics';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function ProfileInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, updateData } = useOnboarding();
  const [username, setUsername] = useState(data.username);
  const [bio, setBio] = useState(data.bio);
  const [gender, setGender] = useState(data.gender);
  const [dob, setDob] = useState(data.dateOfBirth);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateDay, setDateDay] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateYear, setDateYear] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!username.trim()) {
      setUsernameValid(null);
      return;
    }
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(() => {
      const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
      setUsernameValid(isValid);
    }, 500);
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username]);

  const handleFinish = () => {
    if (!username.trim() || !usernameValid) return;
    const dateStr = dateDay && dateMonth && dateYear ? `${dateDay}/${dateMonth}/${dateYear}` : dob;
    updateData({ username, bio, gender, dateOfBirth: dateStr });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/favorite-movies' as any);
  };

  const handleDateConfirm = () => {
    if (dateDay && dateMonth && dateYear) {
      setDob(`${dateDay}/${dateMonth}/${dateYear}`);
    }
    setShowDateModal(false);
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
        <View style={[styles.progressFill, { width: '66%' }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Almost There!{'\n'}Let's Complete{'\n'}Your Profile</Text>
            <Text style={styles.subtitle}>
              Add a username, a short bio, and your details to personalize your experience.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose a Username</Text>
              <View style={[
                styles.inputWrapper,
                usernameValid === true && styles.inputValid,
                usernameValid === false && styles.inputInvalid,
              ]}>
                <AtSign size={18} color={usernameValid === true ? Colors.dark.success : Colors.dark.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  placeholderTextColor={Colors.dark.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="profile-username"
                />
                {usernameValid === true && (
                  <CircleCheck size={20} color={Colors.dark.success} style={styles.validIcon} />
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tell Us About Yourself</Text>
              <TextInput
                style={[styles.inputWrapper, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Add a short bio"
                placeholderTextColor={Colors.dark.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="profile-bio"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowGenderModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectText, !gender && styles.placeholderText]}>
                  {gender || 'Select gender'}
                </Text>
                <ChevronDown size={18} color={Colors.dark.textTertiary} style={styles.chevron} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => setShowDateModal(true)}
                activeOpacity={0.7}
              >
                <Calendar size={18} color={Colors.dark.textTertiary} style={styles.inputIcon} />
                <Text style={[styles.selectText, !dob && styles.placeholderText]}>
                  {dob || 'dd/mm/yy'}
                </Text>
                <Calendar size={18} color={Colors.dark.textTertiary} style={styles.chevron} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.continueButton, (!username.trim() || !usernameValid) && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={!username.trim() || !usernameValid}
          activeOpacity={0.8}
          testID="profile-finish"
        >
          <Text style={styles.continueText}>Finish Setup</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showGenderModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderModal(false)}
        >
          <View style={styles.modalContent}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.modalOption, gender === g && styles.modalOptionSelected]}
                onPress={() => { setGender(g); setShowGenderModal(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.modalOptionText, gender === g && styles.modalOptionTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Date of Birth</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="DD"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
                value={dateDay}
                onChangeText={setDateDay}
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="MM"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
                value={dateMonth}
                onChangeText={setDateMonth}
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={[styles.dateInput, { width: 80 }]}
                placeholder="YYYY"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
                value={dateYear}
                onChangeText={setDateYear}
              />
            </View>
            <TouchableOpacity style={styles.dateConfirmBtn} onPress={handleDateConfirm}>
              <Text style={styles.dateConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.dark.text,
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    paddingHorizontal: 4,
  },
  inputValid: {
    borderColor: Colors.dark.success,
  },
  inputInvalid: {
    borderColor: Colors.dark.danger,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  validIcon: {
    marginRight: 14,
  },
  bioInput: {
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 90,
    textAlignVertical: 'top' as const,
  },
  selectText: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  placeholderText: {
    color: Colors.dark.textTertiary,
  },
  chevron: {
    marginRight: 14,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalOptionSelected: {
    backgroundColor: Colors.dark.primaryLight,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  modalOptionTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dateInput: {
    width: 56,
    height: 48,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  dateSeparator: {
    fontSize: 20,
    color: Colors.dark.textTertiary,
  },
  dateConfirmBtn: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});