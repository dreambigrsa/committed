import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, CheckCircle2, X } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function SearchScreen() {
  const router = useRouter();
  const { searchUsers, getUserRelationship } = useApp();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    setIsSearching(true);

    if (!text.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setTimeout(async () => {
      const searchResults = await searchUsers(text);
      setResults(searchResults);
      setIsSearching(false);
    }, 300);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const getRelationshipTypeLabel = (type: string) => {
    const labels = {
      married: 'Married',
      engaged: 'Engaged',
      serious: 'Serious Relationship',
      dating: 'Dating',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const relationship = getUserRelationship(item.id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => router.push(`/profile/${item.id}` as any)}
      >
        <View style={styles.userLeft}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>{item.fullName.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.fullName}</Text>
              {item.verifications.phone && (
                <CheckCircle2 size={16} color={colors.secondary} />
              )}
            </View>

            {relationship ? (
              <>
                <Text style={styles.relationshipInfo}>
                  {relationship.status === 'verified' ? '❤️ ' : '⏳ '}
                  In a {getRelationshipTypeLabel(relationship.type).toLowerCase()} with{' '}
                  {relationship.partnerName}
                </Text>
                {relationship.status === 'verified' && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>
                      Verified Relationship
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noRelationship}>No registered relationship</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find verified relationship statuses
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone number"
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : query.length === 0 ? (
        <View style={styles.centerContainer}>
          <SearchIcon size={64} color={colors.text.tertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Search for People</Text>
          <Text style={styles.emptyText}>
            Enter a name or phone number to search for verified relationships
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <SearchIcon size={64} color={colors.text.tertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            Try searching with a different name or phone number
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  clearButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  relationshipInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  noRelationship: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontStyle: 'italic' as const,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.badge.verified,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.badge.verifiedText,
  },
});
