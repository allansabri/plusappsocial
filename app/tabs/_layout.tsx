import React from 'react';
import { Tabs } from 'expo-router';
import { View, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Search, User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedTabBarVisible } from '@/stores/feedScrollStore';

const TAB_ICONS: Record<string, typeof Home> = {
  '(feed)': Home,
  discover: Search,
  profile: User,
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const activeRouteName = state.routes[state.index]?.name;

  React.useEffect(() => {
    if (activeRouteName !== '(feed)') {
      Animated.timing(feedTabBarVisible, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [activeRouteName]);

  const translateY = feedTabBarVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <Animated.View
      style={[
        tabStyles.container,
        {
          paddingBottom: insets.bottom,
          opacity: feedTabBarVisible,
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const isFocused = state.index === index;
        const IconComponent = TAB_ICONS[route.name];
        if (!IconComponent) return null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            }}
            style={tabStyles.tab}
            activeOpacity={0.7}
          >
            <IconComponent
              size={24}
              color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
            />
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="(feed)" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="publish" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.dark.tabBar,
    borderTopColor: Colors.dark.border,
    borderTopWidth: 0.5,
    zIndex: 100,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});