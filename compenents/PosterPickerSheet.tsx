import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image as ImageIcon, Search, RotateCcw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { usePosterOverride } from '@/providers/PosterOverrideProvider';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/providers/AuthProvider';

interface PosterPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  onOpenTMDBPicker: () => void;
}

export default function PosterPickerSheet({
  visible,
  onClose,
  tmdbId,
  mediaType,
  title,
  onOpenTMDBPicker,
}: PosterPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { setUploadPoster, resetPoster, getPosterUrl } = usePosterOverride();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = React.useState(false);

  const hasOverride = Boolean(getPosterUrl(tmdbId, mediaType));

  const handleImportImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', "Autorisez l'acc\u00e8s \u00e0 votre galerie pour importer une image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      const localUri = result.assets[0].uri;
      setIsUploading(true);
      onClose();

      let finalUrl = localUri;

      if (isSupabaseConfigured && user?.id) {
        try {
          const fileName = `${user.id}/${mediaType}_${tmdbId}_${Date.now()}.jpg`;
          const formData = new FormData();
          formData.append('file', {
            uri: localUri,
            name: fileName,
            type: 'image/jpeg',
          } as any);

          const { data, error } = await supabase.storage
            .from('user-posters')
            .upload(fileName, formData, { upsert: true });

          if (!error && data) {
            const { data: urlData } = supabase.storage
              .from('user-posters')
              .getPublicUrl(data.path);
            if (urlData?.publicUrl) {
              finalUrl = urlData.publicUrl;
              console.log('[PosterPicker] Uploaded to Supabase:', finalUrl);
            }
          } else {
            console.log('[PosterPicker] Supabase upload failed, using local URI:', error?.message);
          }
        } catch (e) {
          console.log('[PosterPicker] Upload error, using local URI:', e);
        }
      }

      await setUploadPoster(tmdbId, mediaType, localUri, finalUrl !== localUri ? finalUrl : undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('[PosterPicker] Import error:', e);
      Alert.alert('Erreur', 'Impossible d\'importer l\'image.');
    } finally {
      setIsUploading(false);
    }
  }, [tmdbId, mediaType, user?.id, setUploadPoster, onClose]);

  const handleChooseTMDB = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => onOpenTMDBPicker(), 300);
  }, [onClose, onOpenTMDBPicker]);

  const handleReset = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetPoster(tmdbId, mediaType);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }, [tmdbId, mediaType, resetPoster, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          activeOpacity={1}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{"Changer l'affiche"}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={handleImportImage}
              activeOpacity={0.7}
              disabled={isUploading}
            >
              <View style={[styles.optionIcon, { backgroundColor: Colors.dark.primaryLight }]}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={Colors.dark.primary} />
                ) : (
                  <ImageIcon size={20} color={Colors.dark.primary} />
                )}
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>
                  {isUploading ? 'Importation...' : "Importer une image"}
                </Text>
                <Text style={styles.optionSub}>Depuis votre galerie, format 2:3</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.option}
              onPress={handleChooseTMDB}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: Colors.dark.goldLight }]}>
                <Search size={20} color={Colors.dark.gold} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>Choisir une nouvelle affiche</Text>
                <Text style={styles.optionSub}>Parcourir les affiches TMDB (FR / EN)</Text>
              </View>
            </TouchableOpacity>

            {hasOverride && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,69,58,0.12)' }]}>
                    <RotateCcw size={20} color={Colors.dark.danger} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: Colors.dark.danger }]}>
                      {"Réinitialiser l'affiche"}
                    </Text>
                    <Text style={styles.optionSub}>{"Revenir à l'affiche TMDB d'origine"}</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textTertiary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 2,
    maxWidth: 240,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    marginHorizontal: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  optionSub: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.dark.borderLight,
    marginLeft: 74,
  },
});