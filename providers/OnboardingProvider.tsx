import React, { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'plus_onboarding_state';

interface OnboardingData {
  email: string;
  password: string;
  avatarUrl: string | null;
  username: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  favoriteMovies: number[];
  favoriteSeries: number[];
  followedAccounts: string[];
  completed: boolean;
}

const defaultData: OnboardingData = {
  email: '',
  password: '',
  avatarUrl: null,
  username: '',
  bio: '',
  gender: '',
  dateOfBirth: '',
  favoriteMovies: [],
  favoriteSeries: [],
  followedAccounts: [],
  completed: false,
};

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingData;
        setData(parsed);
        setIsOnboardingComplete(parsed.completed);
      } else {
        setIsOnboardingComplete(false);
      }
    } catch {
      setIsOnboardingComplete(false);
    }
  };

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const completeOnboarding = useCallback(async () => {
    const finalData = { ...data, completed: true };
    setData(finalData);
    setIsOnboardingComplete(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(finalData));
    console.log('[Onboarding] Completed');
  }, [data]);

  const resetOnboarding = useCallback(async () => {
    setData(defaultData);
    setIsOnboardingComplete(false);
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  }, []);

  return {
    data,
    updateData,
    completeOnboarding,
    resetOnboarding,
    isOnboardingComplete,
  };
});