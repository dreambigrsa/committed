import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { Heart, Check, X, AlertTriangle, MessageCircle, Bell, UserPlus, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { Notification, NotificationType } from '@/types';

export default function NotificationsScreen() {
  const { 
    getPendingRequests, 
    acceptRelationshipRequest, 
    rejectRelationshipRequest,
    notifications,
    cheatingAlerts,
    markNotificationAsRead,
  } = useApp();
  const pendingRequests = getPendingRequests();
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');

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

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'relationship_request':
        return <Heart size={24} color={colors.danger} fill={colors.danger} />;
      case 'cheating_alert':
        return <AlertTriangle size={24} color={colors.accent} />;
      case 'relationship_verified':
        return <CheckCircle2 size={24} color={colors.secondary} />;
      case 'relationship_ended':
        return <Heart size={24} color={colors.text.tertiary} />;
      case 'post_like':
        return <Heart size={24} color={colors.danger} />;
      case 'post_comment':
        return <MessageCircle size={24} color={colors.primary} />;
      case 'message':
        return <MessageCircle size={24} color={colors.primary} />;
      case 'follow':
        return <UserPlus size={24} color={colors.secondary} />;
      default:
        return <Bell size={24} color={colors.text.secondary} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadAlerts = cheatingAlerts.filter(a => !a.read);

  const allNotifications = [
    ...notifications.map(n => ({ ...n, source: 'notification' as const })),
    ...cheatingAlerts.map(a => ({
      id: a.id,
      userId: a.userId,
      type: 'cheating_alert' as NotificationType,
      title: 'Cheating Alert',
      message: a.description,
      data: { partnerUserId: a.partnerUserId, alertType: a.alertType },
      read: a.read,
      createdAt: a.createdAt,
      source: 'alert' as const,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleNotificationPress = async (notification: Notification & { source: 'notification' | 'alert' }) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification & { source: 'notification' | 'alert' } }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconContainer, !item.read && styles.unreadIconContainer]}>
        {getNotificationIcon(item.type)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={[styles.notificationText, !item.read && styles.unreadText]}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All {unreadNotifications.length + unreadAlerts.length > 0 && `(${unreadNotifications.length + unreadAlerts.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'all' ? (
        allNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You&apos;ll be notified about important events and updates here
            </Text>
          </View>
        ) : (
          <FlatList
            data={allNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        pendingRequests.length === 0 ? (
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
        )
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
  tabs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.white,
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
  notificationCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  unreadNotification: {
    backgroundColor: colors.badge.pending,
    borderColor: colors.primary + '30',
  },
  unreadIconContainer: {
    backgroundColor: colors.background.primary,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  notificationText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
