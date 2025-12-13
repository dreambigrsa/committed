import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LegalDocument } from '@/types';
import LegalAcceptanceCheckbox from './LegalAcceptanceCheckbox';
import { saveUserAcceptance } from '@/lib/legal-enforcement';
import { useApp } from '@/contexts/AppContext';

interface LegalAcceptanceModalProps {
  visible: boolean;
  missingDocuments: LegalDocument[];
  needsReAcceptance: LegalDocument[];
  onComplete: () => void;
  onViewDocument: (document: LegalDocument) => void;
}

export default function LegalAcceptanceModal({
  visible,
  missingDocuments,
  needsReAcceptance,
  onComplete,
  onViewDocument,
}: LegalAcceptanceModalProps) {
  const { colors } = useTheme();
  const { currentUser } = useApp();
  const styles = createStyles(colors);

  const [acceptances, setAcceptances] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const allDocuments = [...missingDocuments, ...needsReAcceptance];

  const handleToggle = (documentId: string, accepted: boolean) => {
    setAcceptances((prev) => ({
      ...prev,
      [documentId]: accepted,
    }));
  };

  const handleSave = async () => {
    const requiredDocs = allDocuments.filter((doc) => doc.isRequired);
    const allRequiredAccepted = requiredDocs.every(
      (doc) => acceptances[doc.id] === true
    );

    if (requiredDocs.length > 0 && !allRequiredAccepted) {
      alert('Please accept all required documents to continue');
      return;
    }

    if (!currentUser?.id) {
      alert('User not found');
      return;
    }

    setIsSaving(true);
    try {
      const acceptancesToSave = Object.entries(acceptances)
        .filter(([_, accepted]) => accepted)
        .map(([documentId, _]) => {
          const doc = allDocuments.find((d) => d.id === documentId);
          return {
            documentId,
            version: doc?.version || '1.0.0',
          };
        });

      for (const { documentId, version } of acceptancesToSave) {
        await saveUserAcceptance(
          currentUser.id,
          documentId,
          version,
          needsReAcceptance.find((d) => d.id === documentId) ? 'update' : 'manual'
        );
      }

      onComplete();
    } catch (error) {
      console.error('Failed to save acceptances:', error);
      alert('Failed to save acceptances. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AlertTriangle size={24} color={colors.danger} />
          </View>
          <Text style={styles.title}>Legal Documents Required</Text>
          <Text style={styles.subtitle}>
            {missingDocuments.length > 0 && needsReAcceptance.length > 0
              ? 'You need to accept new and updated legal documents to continue using the app.'
              : missingDocuments.length > 0
              ? 'You need to accept required legal documents to continue using the app.'
              : 'Some legal documents have been updated. Please review and accept them to continue.'}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {missingDocuments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Required Documents</Text>
              {missingDocuments.map((doc) => (
                <LegalAcceptanceCheckbox
                  key={doc.id}
                  document={doc}
                  isAccepted={acceptances[doc.id] || false}
                  onToggle={handleToggle}
                  onViewDocument={onViewDocument}
                  required={doc.isRequired}
                />
              ))}
            </View>
          )}

          {needsReAcceptance.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Updated Documents</Text>
              <Text style={styles.sectionSubtitle}>
                These documents have been updated. Please review and accept the new versions.
              </Text>
              {needsReAcceptance.map((doc) => (
                <LegalAcceptanceCheckbox
                  key={doc.id}
                  document={doc}
                  isAccepted={acceptances[doc.id] || false}
                  onToggle={handleToggle}
                  onViewDocument={onViewDocument}
                  required={doc.isRequired}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : (
              <Text style={styles.saveButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    padding: 24,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
});

