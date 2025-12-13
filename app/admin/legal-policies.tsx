import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LegalDocument } from '@/types';
import colors from '@/constants/colors';

export default function AdminLegalPoliciesScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { colors: themeColors } = useTheme();
  const styles = createStyles(themeColors);

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [acceptanceStats, setAcceptanceStats] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    version: '1.0.0',
    isActive: true,
    isRequired: false,
    displayLocation: [] as string[],
  });

  useEffect(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin')) {
      loadDocuments();
      loadAcceptanceStats();
    }
  }, [currentUser]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const docs = data.map((doc) => ({
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          content: doc.content,
          version: doc.version,
          isActive: doc.is_active,
          isRequired: doc.is_required,
          displayLocation: doc.display_location || [],
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          createdBy: doc.created_by,
          lastUpdatedBy: doc.last_updated_by,
        }));
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      Alert.alert('Error', 'Failed to load legal documents');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAcceptanceStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_legal_acceptances')
        .select('document_id');

      if (error) throw error;

      const stats: Record<string, number> = {};
      data?.forEach((acceptance) => {
        stats[acceptance.document_id] = (stats[acceptance.document_id] || 0) + 1;
      });
      setAcceptanceStats(stats);
    } catch (error) {
      console.error('Failed to load acceptance stats:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingDoc(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      version: '1.0.0',
      isActive: true,
      isRequired: false,
      displayLocation: [],
    });
    setShowEditor(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      version: doc.version,
      isActive: doc.isActive,
      isRequired: doc.isRequired,
      displayLocation: doc.displayLocation,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        version: formData.version,
        is_active: formData.isActive,
        is_required: formData.isRequired,
        display_location: formData.displayLocation,
        last_updated_by: currentUser?.id,
      };

      if (editingDoc) {
        // Update existing
        const { error } = await supabase
          .from('legal_documents')
          .update(updateData)
          .eq('id', editingDoc.id);

        if (error) throw error;
        Alert.alert('Success', 'Document updated successfully');
      } else {
        // Create new
        updateData.created_by = currentUser?.id;
        const { error } = await supabase
          .from('legal_documents')
          .insert(updateData);

        if (error) throw error;
        Alert.alert('Success', 'Document created successfully');
      }

      setShowEditor(false);
      loadDocuments();
      loadAcceptanceStats();
    } catch (error: any) {
      console.error('Failed to save document:', error);
      Alert.alert('Error', error.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (doc: LegalDocument) => {
    try {
      const { error } = await supabase
        .from('legal_documents')
        .update({
          is_active: !doc.isActive,
          last_updated_by: currentUser?.id,
        })
        .eq('id', doc.id);

      if (error) throw error;
      loadDocuments();
    } catch (error) {
      console.error('Failed to toggle document:', error);
      Alert.alert('Error', 'Failed to update document');
    }
  };

  const handleDelete = (doc: LegalDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('legal_documents')
                .delete()
                .eq('id', doc.id);

              if (error) throw error;
              Alert.alert('Success', 'Document deleted successfully');
              loadDocuments();
            } catch (error) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const toggleDisplayLocation = (location: string) => {
    const current = formData.displayLocation || [];
    if (current.includes(location)) {
      setFormData({
        ...formData,
        displayLocation: current.filter((l) => l !== location),
      });
    } else {
      setFormData({
        ...formData,
        displayLocation: [...current, location],
      });
    }
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Legal & Policies', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>You don't have admin permissions</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Legal & Policies',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
          <Plus size={20} color={themeColors.text.white} />
          <Text style={styles.createButtonText}>Create New Document</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentTitleRow}>
                  <FileText size={20} color={themeColors.primary} />
                  <Text style={styles.documentTitle}>{item.title}</Text>
                  {item.isActive ? (
                    <CheckCircle2 size={18} color={themeColors.secondary} />
                  ) : (
                    <XCircle size={18} color={themeColors.text.tertiary} />
                  )}
                </View>
                <View style={styles.documentMeta}>
                  <Text style={styles.documentMetaText}>v{item.version}</Text>
                  {acceptanceStats[item.id] && (
                    <View style={styles.acceptanceBadge}>
                      <Users size={12} color={themeColors.primary} />
                      <Text style={styles.acceptanceCount}>
                        {acceptanceStats[item.id]} acceptances
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.documentInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Required:</Text>
                  <Text style={styles.infoValue}>{item.isRequired ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Display Locations:</Text>
                  <Text style={styles.infoValue}>
                    {item.displayLocation.length > 0
                      ? item.displayLocation.join(', ')
                      : 'None'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Updated:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/legal/${item.slug}` as any)}
                >
                  <Eye size={18} color={themeColors.primary} />
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Edit size={18} color={themeColors.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleActive(item)}
                >
                  {item.isActive ? (
                    <>
                      <XCircle size={18} color={themeColors.danger} />
                      <Text style={[styles.actionButtonText, styles.dangerText]}>Deactivate</Text>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} color={themeColors.secondary} />
                      <Text style={[styles.actionButtonText, styles.successText]}>Activate</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDelete(item)}
                >
                  <Trash2 size={18} color={themeColors.danger} />
                  <Text style={[styles.actionButtonText, styles.dangerText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditor(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingDoc ? 'Edit Document' : 'Create New Document'}
            </Text>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <X size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Terms of Service"
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Slug * (URL-friendly)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.slug}
                onChangeText={(text) => setFormData({ ...formData, slug: text.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g., terms-of-service"
                placeholderTextColor={themeColors.text.tertiary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Version *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.version}
                onChangeText={(text) => setFormData({ ...formData, version: text })}
                placeholder="e.g., 1.0.0"
                placeholderTextColor={themeColors.text.tertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Content * (HTML/Markdown supported)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                placeholder="Enter document content..."
                placeholderTextColor={themeColors.text.tertiary}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{
                    false: themeColors.border.light,
                    true: themeColors.primary + '50',
                  }}
                  thumbColor={formData.isActive ? themeColors.primary : themeColors.text.tertiary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Required</Text>
                <Switch
                  value={formData.isRequired}
                  onValueChange={(value) => setFormData({ ...formData, isRequired: value })}
                  trackColor={{
                    false: themeColors.border.light,
                    true: themeColors.primary + '50',
                  }}
                  thumbColor={formData.isRequired ? themeColors.primary : themeColors.text.tertiary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Locations</Text>
              {['signup', 'settings', 'search', 'relationship'].map((location) => (
                <TouchableOpacity
                  key={location}
                  style={styles.checkboxRow}
                  onPress={() => toggleDisplayLocation(location)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      formData.displayLocation.includes(location) && styles.checkboxChecked,
                    ]}
                  >
                    {formData.displayLocation.includes(location) && (
                      <CheckCircle2 size={16} color={themeColors.text.white} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    {location.charAt(0).toUpperCase() + location.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditor(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={themeColors.text.white} />
              ) : (
                <>
                  <Save size={18} color={themeColors.text.white} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  documentCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  documentHeader: {
    marginBottom: 16,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  documentTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  acceptanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  acceptanceCount: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  documentInfo: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dangerButton: {
    backgroundColor: colors.danger + '15',
    borderColor: colors.danger + '30',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  dangerText: {
    color: colors.danger,
  },
  successText: {
    color: colors.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  formTextArea: {
    minHeight: 200,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
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

