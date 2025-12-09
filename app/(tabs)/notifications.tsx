import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { Heart, Check, X } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function NotificationsScreen() {
  const { getPendingRequests, acceptRelationshipRequest, rejectRelationshipRequest } =
    useApp();
  const pendingRequests = getPendingRequests();

  const getRelationshipTypeLabel = (type: string) => {
    const labels = {
      married: 'Married',
      engaged: 'Engaged',
      serious: 'Serious Relationship',
      dating: 'Dating',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleAccept = async (requestId: string) => {
    await acceptRelationshipRequest(requestId);
  };

  const handleReject = async (requestId: string) => {
    await rejectRelationshipRequest(requestId);
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestHeaderLeft}>
          <View style={styles.iconContainer}>
            <Heart size={24} color={colors.danger} fill={colors.danger} />
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>Relationship Request</Text>
            <Text style={styles.requestText}>
              <Text style={styles.requestName}>{item.fromUserName}</Text> wants to
              register you as their partner in a{' '}
              {getRelationshipTypeLabel(item.relationshipType).toLowerCase()}
            </Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <X size={20} color={colors.text.white} />
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item.id)}
        >
          <Check size={20} color={colors.text.white} />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.subtitle}>
          {pendingRequests.length}{' '}
          {pendingRequests.length === 1 ? 'request' : 'requests'} pending
        </Text>
      </View>

      {pendingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={64} color={colors.text.tertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptyText}>
            You&apos;ll be notified when someone sends you a relationship request
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
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
    paddingBottom: 20,
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
  emptyContainer: {
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
  requestCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  requestHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    gap: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  requestText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  requestName: {
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  requestDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rejectButton: {
    backgroundColor: colors.text.tertiary,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
});
