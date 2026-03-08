import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoGridProps {
  photos: string[];
  maxWidth?: number;
  onPhotoPress?: (index: number) => void;
}

export default function PhotoGrid({ photos, maxWidth, onPhotoPress }: PhotoGridProps) {
  const containerWidth = maxWidth ?? SCREEN_WIDTH - 32;
  const count = photos.length;

  if (count === 0) return null;

  if (count >= 5) {
    return <PhotoCarousel photos={photos} containerWidth={containerWidth} onPhotoPress={onPhotoPress} />;
  }

  const Wrapper = onPhotoPress ? TouchableOpacity : View;

  if (count === 1) {
    return (
      <View style={[gridStyles.container, { width: containerWidth }]}>
        <TouchableOpacity onPress={() => onPhotoPress?.(0)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[0] }} style={[gridStyles.singlePhoto, { width: containerWidth, height: containerWidth * 0.65 }]} contentFit="cover" />
        </TouchableOpacity>
      </View>
    );
  }

  if (count === 2) {
    const size = (containerWidth - 4) / 2;
    return (
      <View style={[gridStyles.container, gridStyles.row, { width: containerWidth }]}>
        <TouchableOpacity onPress={() => onPhotoPress?.(0)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[0] }} style={[gridStyles.photo, { width: size, height: size }]} contentFit="cover" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPhotoPress?.(1)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[1] }} style={[gridStyles.photo, { width: size, height: size }]} contentFit="cover" />
        </TouchableOpacity>
      </View>
    );
  }

  if (count === 3) {
    const halfW = (containerWidth - 4) / 2;
    return (
      <View style={[gridStyles.container, gridStyles.row, { width: containerWidth, height: halfW * 1.2 }]}>
        <TouchableOpacity onPress={() => onPhotoPress?.(0)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[0] }} style={[gridStyles.photo, { width: halfW, height: halfW * 1.2 }]} contentFit="cover" />
        </TouchableOpacity>
        <View style={[gridStyles.col, { gap: 4 }]}>
          <TouchableOpacity onPress={() => onPhotoPress?.(1)} activeOpacity={0.9} disabled={!onPhotoPress}>
            <Image source={{ uri: photos[1] }} style={[gridStyles.photo, { width: halfW, height: (halfW * 1.2 - 4) / 2 }]} contentFit="cover" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPhotoPress?.(2)} activeOpacity={0.9} disabled={!onPhotoPress}>
            <Image source={{ uri: photos[2] }} style={[gridStyles.photo, { width: halfW, height: (halfW * 1.2 - 4) / 2 }]} contentFit="cover" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const halfW = (containerWidth - 4) / 2;
  const halfH = (halfW - 2);
  return (
    <View style={[gridStyles.container, { width: containerWidth }]}>
      <View style={[gridStyles.row, { marginBottom: 4 }]}>
        <TouchableOpacity onPress={() => onPhotoPress?.(0)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[0] }} style={[gridStyles.photo, { width: halfW, height: halfH }]} contentFit="cover" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPhotoPress?.(1)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[1] }} style={[gridStyles.photo, { width: halfW, height: halfH }]} contentFit="cover" />
        </TouchableOpacity>
      </View>
      <View style={gridStyles.row}>
        <TouchableOpacity onPress={() => onPhotoPress?.(2)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[2] }} style={[gridStyles.photo, { width: halfW, height: halfH }]} contentFit="cover" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPhotoPress?.(3)} activeOpacity={0.9} disabled={!onPhotoPress}>
          <Image source={{ uri: photos[3] }} style={[gridStyles.photo, { width: halfW, height: halfH }]} contentFit="cover" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PhotoCarousel({ photos, containerWidth, onPhotoPress }: { photos: string[]; containerWidth: number; onPhotoPress?: (index: number) => void }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const itemWidth = containerWidth * 0.85;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (itemWidth + 8));
    setActiveIndex(idx);
  }, [itemWidth]);

  return (
    <View>
      <Animated.FlatList
        data={photos.slice(0, 10)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + 8}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={{ paddingRight: containerWidth - itemWidth }}
        keyExtractor={(_, i) => `carousel-${i}`}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => onPhotoPress?.(index)} activeOpacity={0.9} disabled={!onPhotoPress}>
            <Image
              source={{ uri: item }}
              style={{
                width: itemWidth,
                height: itemWidth * 0.65,
                borderRadius: 12,
                marginRight: 8,
                backgroundColor: Colors.dark.cardElevated,
              }}
              contentFit="cover"
            />
          </TouchableOpacity>
        )}
      />
      <View style={carouselStyles.dots}>
        {photos.slice(0, 10).map((_, i) => (
          <View
            key={i}
            style={[
              carouselStyles.dot,
              i === activeIndex && carouselStyles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 4 },
  col: { flex: 1 },
  singlePhoto: { borderRadius: 12 },
  photo: { borderRadius: 4, backgroundColor: Colors.dark.cardElevated },
});

const carouselStyles = StyleSheet.create({
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 8, gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.dark.textTertiary,
  },
  dotActive: {
    backgroundColor: Colors.dark.primary,
    width: 8, height: 8, borderRadius: 4,
  },
});