import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, FileText, Calendar, Tag, Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LegalDocument } from '@/types';

interface LegalDocumentViewerProps {
  document: LegalDocument | null;
  isLoading?: boolean;
}

export default function LegalDocumentViewer({ document, isLoading }: LegalDocumentViewerProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Loading...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!document) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Document Not Found',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <FileText size={64} color={colors.text.tertiary} />
          </View>
          <Text style={styles.errorTitle}>Document Not Found</Text>
          <Text style={styles.errorText}>
            The document you're looking for doesn't exist or has been removed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced HTML/Markdown renderer with better formatting
  const renderContent = () => {
    let content = document.content;
    
    // Remove HTML tags for now (in production, use a proper HTML renderer)
    content = content.replace(/<[^>]*>/g, '');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&#39;/g, "'");
    
    // Split by newlines and render as paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    
    return paragraphs.map((para, index) => {
      // Detect headings (lines that are short and might be headings)
      const isHeading = para.length < 100 && !para.includes('.') && para.length > 0;
      
      return (
        <Text 
          key={index} 
          style={[
            styles.paragraph,
            isHeading && styles.heading
          ]}
        >
          {para.trim()}
        </Text>
      );
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.headerBackButton}
            >
              <View style={styles.backButtonCircle}>
                <ArrowLeft size={20} color={colors.text.primary} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroHeader}>
          <View style={styles.iconContainer}>
            <Shield size={32} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{document.title}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Tag size={14} color={colors.primary} />
              <Text style={styles.badgeText}>v{document.version}</Text>
            </View>
            {document.isRequired && (
              <View style={[styles.badge, styles.requiredBadge]}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            )}
          </View>
        </View>

        {/* Meta Information Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={16} color={colors.text.secondary} />
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>Last Updated</Text>
                <Text style={styles.metaValue}>{formatDate(document.updatedAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <View style={styles.contentHeader}>
            <View style={styles.contentHeaderLine} />
            <Text style={styles.contentTitle}>Document Content</Text>
            <View style={styles.contentHeaderLine} />
          </View>
          <View style={styles.contentBody}>
            {renderContent()}
          </View>
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            By using this service, you acknowledge that you have read, understood, and agree to be bound by this document.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerBackButton: {
    marginLeft: 16,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroHeader: {
    backgroundColor: colors.background.primary,
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  requiredBadge: {
    backgroundColor: colors.danger + '15',
    borderColor: colors.danger + '30',
  },
  requiredBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.danger,
  },
  metaCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metaRow: {
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaTextContainer: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  contentCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  contentHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.secondary,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contentBody: {
    padding: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.text.primary,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 28,
  },
  footerNote: {
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
