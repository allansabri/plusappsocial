import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

interface HashtagTextProps {
  text: string;
  style?: any;
  numberOfLines?: number;
}

export default function HashtagText({ text, style, numberOfLines }: HashtagTextProps) {
  const router = useRouter();

  const parts = text.split(/([@#]\w+)/g);

  const handlePress = (tag: string) => {
    if (tag.startsWith('#')) {
      console.log('[HashtagText] Tapped hashtag:', tag);
    } else if (tag.startsWith('@')) {
      console.log('[HashtagText] Tapped mention:', tag);
    }
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.startsWith('#') || part.startsWith('@')) {
          return (
            <Text
              key={index}
              style={styles.highlight}
              onPress={() => handlePress(part)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
});