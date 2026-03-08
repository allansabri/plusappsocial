import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

interface MentionTextProps {
  text: string;
  style?: any;
  numberOfLines?: number;
}

export default function MentionText({ text, style, numberOfLines }: MentionTextProps) {
  const router = useRouter();

  const parts = text.split(/(@\w+)/g);

  const handleMentionPress = (username: string) => {
    console.log('[MentionText] Tapped mention:', username);
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          return (
            <Text
              key={index}
              style={styles.mention}
              onPress={() => handleMentionPress(part.substring(1))}
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
  mention: {
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
});