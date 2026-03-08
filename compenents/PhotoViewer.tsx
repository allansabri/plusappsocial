import React, { useState, useCallback } from 'react';
import {
  View, Modal, StyleSheet, TouchableOpacity, FlatList, Dimensions, Text,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoViewer({ visible, photos, initialIndex, onClose }: PhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  }, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  const renderItem = useCallback(({ item }: { item: string }) => (
    <View style={pvStyles.imageContainer}>
      <Image source={{ uri: item }} style={pvStyles.image} contentFit="contain" />
    </View>
  ), []);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={pvStyles.container}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={(_, i) => `pv-${i}`}
          renderItem={renderItem}
        />
        <TouchableOpacity
          style={[pvStyles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <View style={pvStyles.closeBtnBg}>
            <X size={22} color="#fff" />
          </View>
        </TouchableOpacity>
        {photos.length > 1 && (
          <View style={[pvStyles.indicator, { bottom: insets.bottom + 24 }]}>
            <Text style={pvStyles.indicatorText}>{currentIndex + 1} / {photos.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const pvStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});