import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { X, Smile } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { StickerPack, Sticker } from '@/types';

interface StickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: Sticker) => void;
}

export default function StickerPicker({
  visible,
  onClose,
  onSelectSticker,
}: StickerPickerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<StickerPack | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStickers, setIsLoadingStickers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadStickerPacks();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedPack) {
      loadStickers(selectedPack.id);
    }
  }, [selectedPack]);

  const loadStickerPacks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sticker_packs')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const packsData: StickerPack[] = data.map((pack) => ({
          id: pack.id,
          name: pack.name,
          description: pack.description,
          iconUrl: pack.icon_url,
          isActive: pack.is_active,
          isFeatured: pack.is_featured,
          displayOrder: pack.display_order,
          createdBy: pack.created_by,
          createdAt: pack.created_at,
          updatedAt: pack.updated_at,
        }));
        setPacks(packsData);
        
        // Select first pack by default
        if (packsData.length > 0) {
          setSelectedPack(packsData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load sticker packs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStickers = async (packId: string) => {
    try {
      setIsLoadingStickers(true);
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('pack_id', packId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const stickersData: Sticker[] = data.map((sticker) => ({
          id: sticker.id,
          packId: sticker.pack_id,
          name: sticker.name,
          imageUrl: sticker.image_url,
          isAnimated: sticker.is_animated,
          displayOrder: sticker.display_order,
          createdAt: sticker.created_at,
          updatedAt: sticker.updated_at,
        }));
        setStickers(stickersData);
      }
    } catch (error) {
      console.error('Failed to load stickers:', error);
    } finally {
      setIsLoadingStickers(false);
    }
  };

  const handleSelectSticker = (sticker: Sticker) => {
    onSelectSticker(sticker);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Smile size={24} color={colors.primary} />
            <Text style={styles.headerTitle}>Stickers</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading stickers...</Text>
          </View>
        ) : (
          <>
            {/* Pack Selector */}
            {packs.length > 0 && (
              <View style={styles.packSelector}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={packs}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.packItem,
                        selectedPack?.id === item.id && styles.packItemSelected,
                      ]}
                      onPress={() => setSelectedPack(item)}
                    >
                      {item.iconUrl ? (
                        <Image
                          source={{ uri: item.iconUrl }}
                          style={styles.packIcon}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.packIconPlaceholder}>
                          <Smile size={20} color={colors.text.secondary} />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.packName,
                          selectedPack?.id === item.id && styles.packNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.packSelectorContent}
                />
              </View>
            )}

            {/* Stickers Grid */}
            {isLoadingStickers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : stickers.length > 0 ? (
              <FlatList
                data={stickers}
                numColumns={4}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.stickersGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.stickerItem}
                    onPress={() => handleSelectSticker(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.stickerImage}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Smile size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No stickers available</Text>
                <Text style={styles.emptySubtext}>
                  {selectedPack
                    ? 'This pack is empty'
                    : 'No sticker packs found'}
                </Text>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  packSelector: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingVertical: 12,
  },
  packSelectorContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  packItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    marginRight: 8,
    minWidth: 80,
  },
  packItemSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  packIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginBottom: 4,
  },
  packIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  packName: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500' as const,
  },
  packNameSelected: {
    color: colors.primary,
    fontWeight: '700' as const,
  },
  stickersGrid: {
    padding: 12,
    gap: 8,
  },
  stickerItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

