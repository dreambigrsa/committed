import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import colors from '@/constants/colors';
import { ReportedContent } from '@/types';

export default function AdminReportsScreen() {
  const { currentUser } = useApp();
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reported_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedReports: ReportedContent[] = data.map((r: any) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reportedUserId: r.reported_user_id,
          contentType: r.content_type,
          contentId: r.content_id,
          reason: r.reason,
          description: r.description,
          status: r.status,
          reviewedBy: r.reviewed_by,
          reviewedAt: r.reviewed_at,
          actionTaken: r.action_taken,
          createdAt: r.created_at,
        }));
        setReports(formattedReports);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string, action: 'resolved' | 'dismissed', actionTaken?: string) => {
    try {
      await supabase
        .from('reported_content')
        .update({
          status: action,
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString(),
          action_taken: actionTaken || action,
        })
        .eq('id', reportId);

      Alert.alert('Success', `Report ${action}`);
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const handleDeleteReportedContent = async (report: ReportedContent) => {
    if (!report.contentId) return;

    Alert.alert(
      'Delete Content',
      'Are you sure you want to delete this content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const tableName = report.contentType === 'post' ? 'posts' : 
                               report.contentType === 'reel' ? 'reels' :
                               report.contentType === 'comment' ? 'comments' : null;

              if (tableName) {
                await supabase
                  .from(tableName)
                  .delete()
                  .eq('id', report.contentId);

                await handleReviewReport(report.id, 'resolved', 'Content deleted');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete content');
            }
          },
        },
      ]
    );
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Reports', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Reported Content', headerShown: true }} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {reports.filter(r => r.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {reports.filter(r => r.status === 'reviewing').length}
              </Text>
              <Text style={styles.statLabel}>Reviewing</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {reports.filter(r => r.status === 'resolved').length}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>

          <View style={styles.reportsList}>
            {reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <AlertTriangle size={24} color={colors.danger} />
                  <View style={[
                    styles.statusBadge,
                    report.status === 'pending' ? styles.pendingBadge :
                    report.status === 'reviewing' ? styles.reviewingBadge :
                    report.status === 'resolved' ? styles.resolvedBadge :
                    styles.dismissedBadge
                  ]}>
                    <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.reportContent}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={styles.metaValue}>{report.contentType}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Reason:</Text>
                    <Text style={styles.metaValue}>{report.reason}</Text>
                  </View>
                  {report.description && (
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>{report.description}</Text>
                    </View>
                  )}
                  <Text style={styles.dateText}>
                    Reported: {new Date(report.createdAt).toLocaleString()}
                  </Text>
                  {report.actionTaken && (
                    <Text style={styles.actionText}>Action: {report.actionTaken}</Text>
                  )}
                </View>

                {report.status === 'pending' && (
                  <View style={styles.reportActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteContentButton]}
                      onPress={() => handleDeleteReportedContent(report)}
                    >
                      <Text style={styles.actionButtonText}>Delete Content</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.resolveButton]}
                      onPress={() => handleReviewReport(report.id, 'resolved', 'Warning sent')}
                    >
                      <CheckCircle size={16} color={colors.text.white} />
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dismissButton]}
                      onPress={() => handleReviewReport(report.id, 'dismissed')}
                    >
                      <XCircle size={16} color={colors.text.white} />
                      <Text style={styles.actionButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {reports.length === 0 && (
              <View style={styles.emptyState}>
                <AlertTriangle size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No reports yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  reportsList: {
    padding: 16,
    gap: 16,
  },
  reportCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: colors.accent,
  },
  reviewingBadge: {
    backgroundColor: colors.primary,
  },
  resolvedBadge: {
    backgroundColor: colors.secondary,
  },
  dismissedBadge: {
    backgroundColor: colors.text.tertiary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  reportContent: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '600' as const,
  },
  metaValue: {
    fontSize: 14,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  descriptionBox: {
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  deleteContentButton: {
    backgroundColor: '#8B0000',
  },
  resolveButton: {
    backgroundColor: colors.secondary,
  },
  dismissButton: {
    backgroundColor: colors.text.tertiary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
});
