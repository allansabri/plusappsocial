import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { getImageUrl } from '@/services/tmdb';

interface MovieCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage?: number;
  mediaType: 'movie' | 'tv';
  year?: string;
  size?: 'small' | 'medium' | 'large';
}

const MovieCard = React.memo(({ id, title, posterPath, voteAverage, mediaType, year, size = 'medium' }: MovieCardProps) => {
  const router = useRouter();
  const posterUrl = getImageUrl(posterPath, size === 'small' ? 'w185' : 'w342');

  const dimensions = {
    small: { width: 100, height: 150 },
    medium: { width: 130, height: 195 },
    large: { width: 160, height: 240 },
  };

  const { width, height } = dimensions[size];

  const handlePress = useCallback(() => {
    router.push(`/media/${id}?type=${mediaType}` as any);
  }, [id, mediaType, router]);

  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={handlePress} activeOpacity={0.8}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={[styles.poster, { width, height }]} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder, { width, height }]}>
          <Text style={styles.posterPlaceholderTitle} numberOfLines={2}>{title}</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {year ? <Text style={styles.year}>{year.substring(0, 4)}</Text> : null}
    </TouchableOpacity>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  poster: {
    backgroundColor: Colors.dark.cardElevated,
    borderRadius: 0,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  posterPlaceholderTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
    lineHeight: 16,
  },
  year: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
});