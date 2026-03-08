import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { WatchlistProvider } from "@/providers/WatchlistProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
import { PostProvider } from "@/providers/PostProvider";
import { GamificationProvider } from "@/providers/GamificationProvider";
import { SocialProvider } from "@/providers/SocialProvider";
import { CommunityRatingProvider } from "@/providers/CommunityRatingProvider";
import { PosterOverrideProvider } from "@/providers/PosterOverrideProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOnboardingComplete } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isOnboardingComplete === null) return;

    const inAuth = (segments[0] as string) === "auth";
    const inOnboarding = (segments[0] as string) === "onboarding";

    if (!isAuthenticated && !isOnboardingComplete && !inOnboarding) {
      router.replace("/onboarding" as any);
    } else if (isAuthenticated && (inAuth || inOnboarding)) {
      router.replace("/");
    } else if (!isAuthenticated && isOnboardingComplete && !inAuth) {
      router.replace("/auth/login" as any);
    }
  }, [isAuthenticated, isLoading, isOnboardingComplete, segments]);

  useEffect(() => {
    if (!isLoading && isOnboardingComplete !== null) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isOnboardingComplete]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen
        name="media/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="create-post"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="create-review"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="post/create"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="story/create"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="category/[slug]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="person/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="journal/index"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="stats/index"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="gamification/index"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="production/index"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <WatchlistProvider>
            <CommunityRatingProvider>
              <PostProvider>
                <GamificationProvider>
                  <SocialProvider>
                    <PosterOverrideProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <StatusBar style="light" />
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                    </PosterOverrideProvider>
                  </SocialProvider>
                </GamificationProvider>
              </PostProvider>
            </CommunityRatingProvider>
          </WatchlistProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}