import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

const RatingStars = React.memo(({ rating, maxStars = 5, size = 24, onChange, readonly = false }: RatingStarsProps) => {
  const handlePress = useCallback((star: number) => {
    if (readonly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRating = star === rating ? 0 : star;
    onChange?.(newRating);
  }, [rating, onChange, readonly]);

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={readonly}
          activeOpacity={0.6}
          style={{ padding: 2 }}
        >
          <Star
            size={size}
            color={star <= rating ? Colors.dark.gold : Colors.dark.textTertiary}
            fill={star <= rating ? Colors.dark.gold : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
});

RatingStars.displayName = 'RatingStars';

export default RatingStars;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});