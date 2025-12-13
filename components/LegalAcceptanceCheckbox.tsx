import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Check, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LegalDocument } from '@/types';

interface LegalAcceptanceCheckboxProps {
  document: LegalDocument;
  isAccepted: boolean;
  onToggle: (documentId: string, accepted: boolean) => void;
  onViewDocument: (document: LegalDocument) => void;
  required?: boolean;
}

export default function LegalAcceptanceCheckbox({
  document,
  isAccepted,
  onToggle,
  onViewDocument,
  required = false,
}: LegalAcceptanceCheckboxProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onToggle(document.id, !isAccepted)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isAccepted && styles.checkboxChecked]}>
          {isAccepted && <Check size={18} color={colors.text.white} />}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>
            {required && <Text style={styles.required}>* </Text>}
            I accept the{' '}
            <Text
              style={styles.link}
              onPress={() => onViewDocument(document)}
            >
              {document.title}
            </Text>
          </Text>
          {document.version && (
            <Text style={styles.version}>Version {document.version}</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  required: {
    color: colors.danger,
    fontWeight: '700' as const,
  },
  link: {
    color: colors.primary,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  version: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
});

