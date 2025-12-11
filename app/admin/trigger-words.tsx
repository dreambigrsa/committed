import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Edit2, Trash2, Shield, X, Save } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';
import { TriggerWord } from '@/types';

export default function TriggerWordsManagementScreen() {
  const { currentUser, getTriggerWords, addTriggerWord, updateTriggerWord, deleteTriggerWord } = useApp();
  const [triggerWords, setTriggerWords] = useState<TriggerWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWord, setEditingWord] = useState<TriggerWord | null>(null);
  
  const [newWord, setNewWord] = useState({
    wordPhrase: '',
    severity: 'low' as 'low' | 'medium' | 'high',
    category: 'general' as 'romantic' | 'intimate' | 'suspicious' | 'meetup' | 'secret' | 'general',
  });

  useEffect(() => {
    loadTriggerWords();
  }, []);

  const loadTriggerWords = async () => {
    setLoading(true);
    try {
      const words = await getTriggerWords();
      setTriggerWords(words);
    } catch (error) {
      console.error('Error loading trigger words:', error);
      Alert.alert('Error', 'Failed to load trigger words');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newWord.wordPhrase.trim()) {
      Alert.alert('Error', 'Please enter a word or phrase');
      return;
    }

    const success = await addTriggerWord(newWord.wordPhrase, newWord.severity, newWord.category);
    if (success) {
      Alert.alert('Success', 'Trigger word added successfully');
      setShowAddModal(false);
      setNewWord({ wordPhrase: '', severity: 'low', category: 'general' });
      loadTriggerWords();
    } else {
      Alert.alert('Error', 'Failed to add trigger word');
    }
  };

  const handleEdit = async () => {
    if (!editingWord || !editingWord.wordPhrase.trim()) {
      Alert.alert('Error', 'Please enter a word or phrase');
      return;
    }

    const success = await updateTriggerWord(editingWord.id, {
      wordPhrase: editingWord.wordPhrase,
      severity: editingWord.severity,
      category: editingWord.category,
      active: editingWord.active,
    });
    if (success) {
      Alert.alert('Success', 'Trigger word updated successfully');
      setShowEditModal(false);
      setEditingWord(null);
      loadTriggerWords();
    } else {
      Alert.alert('Error', 'Failed to update trigger word');
    }
  };

  const handleDelete = (word: TriggerWord) => {
    Alert.alert(
      'Delete Trigger Word',
      `Are you sure you want to delete "${word.wordPhrase}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTriggerWord(word.id);
            if (success) {
              Alert.alert('Success', 'Trigger word deleted successfully');
              loadTriggerWords();
            } else {
              Alert.alert('Error', 'Failed to delete trigger word');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (word: TriggerWord) => {
    const success = await updateTriggerWord(word.id, { active: !word.active });
    if (success) {
      loadTriggerWords();
    } else {
      Alert.alert('Error', 'Failed to update trigger word');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#2196F3';
      default: return colors.text.secondary;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'romantic': return '#E91E63';
      case 'intimate': return '#9C27B0';
      case 'suspicious': return '#F44336';
      case 'meetup': return '#FF9800';
      case 'secret': return '#607D8B';
      default: return colors.text.secondary;
    }
  };

  if (!currentUser || !['admin', 'super_admin', 'moderator'].includes(currentUser.role)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Trigger Words', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Shield size={64} color={colors.danger} />
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>Only admins can manage trigger words</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeWords = triggerWords.filter(w => w.active);
  const inactiveWords = triggerWords.filter(w => !w.active);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Trigger Words Management', headerShown: true }} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Trigger Words</Text>
          <Text style={styles.headerSubtitle}>
            Manage words and phrases that trigger infidelity warnings
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color={colors.text.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Active Words ({activeWords.length})
              </Text>
              {activeWords.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No active trigger words</Text>
                </View>
              ) : (
                activeWords.map((word) => (
                  <View key={word.id} style={styles.wordCard}>
                    <View style={styles.wordInfo}>
                      <Text style={styles.wordPhrase}>{word.wordPhrase}</Text>
                      <View style={styles.wordTags}>
                        <View style={[styles.tag, { backgroundColor: getSeverityColor(word.severity) + '20' }]}>
                          <Text style={[styles.tagText, { color: getSeverityColor(word.severity) }]}>
                            {word.severity.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: getCategoryColor(word.category) + '20' }]}>
                          <Text style={[styles.tagText, { color: getCategoryColor(word.category) }]}>
                            {word.category}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.wordActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setEditingWord(word);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit2 size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleActive(word)}
                      >
                        <Text style={styles.deactivateText}>Deactivate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(word)}
                      >
                        <Trash2 size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {inactiveWords.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Inactive Words ({inactiveWords.length})
                </Text>
                {inactiveWords.map((word) => (
                  <View key={word.id} style={[styles.wordCard, styles.inactiveCard]}>
                    <View style={styles.wordInfo}>
                      <Text style={[styles.wordPhrase, styles.inactiveText]}>
                        {word.wordPhrase}
                      </Text>
                      <View style={styles.wordTags}>
                        <View style={[styles.tag, { backgroundColor: getSeverityColor(word.severity) + '20' }]}>
                          <Text style={[styles.tagText, { color: getSeverityColor(word.severity) }]}>
                            {word.severity.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: getCategoryColor(word.category) + '20' }]}>
                          <Text style={[styles.tagText, { color: getCategoryColor(word.category) }]}>
                            {word.category}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.wordActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setEditingWord(word);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit2 size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleActive(word)}
                      >
                        <Text style={styles.activateText}>Activate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(word)}
                      >
                        <Trash2 size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Trigger Word</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Word or Phrase</Text>
                <TextInput
                  style={styles.input}
                  value={newWord.wordPhrase}
                  onChangeText={(text) => setNewWord({ ...newWord, wordPhrase: text })}
                  placeholder="e.g., i love you"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Severity</Text>
                <View style={styles.severityButtons}>
                  {(['low', 'medium', 'high'] as const).map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        styles.severityButton,
                        newWord.severity === severity && styles.severityButtonActive,
                        { borderColor: getSeverityColor(severity) },
                      ]}
                      onPress={() => setNewWord({ ...newWord, severity })}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          newWord.severity === severity && { color: getSeverityColor(severity) },
                        ]}
                      >
                        {severity.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryButtons}>
                  {(['romantic', 'intimate', 'suspicious', 'meetup', 'secret', 'general'] as const).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        newWord.category === category && styles.categoryButtonActive,
                        { borderColor: getCategoryColor(category) },
                      ]}
                      onPress={() => setNewWord({ ...newWord, category })}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          newWord.category === category && { color: getCategoryColor(category) },
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                <Save size={18} color={colors.text.white} />
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Trigger Word</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {editingWord && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Word or Phrase</Text>
                  <TextInput
                    style={styles.input}
                    value={editingWord.wordPhrase}
                    onChangeText={(text) => setEditingWord({ ...editingWord, wordPhrase: text })}
                    placeholder="e.g., i love you"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Severity</Text>
                  <View style={styles.severityButtons}>
                    {(['low', 'medium', 'high'] as const).map((severity) => (
                      <TouchableOpacity
                        key={severity}
                        style={[
                          styles.severityButton,
                          editingWord.severity === severity && styles.severityButtonActive,
                          { borderColor: getSeverityColor(severity) },
                        ]}
                        onPress={() => setEditingWord({ ...editingWord, severity })}
                      >
                        <Text
                          style={[
                            styles.severityButtonText,
                            editingWord.severity === severity && { color: getSeverityColor(severity) },
                          ]}
                        >
                          {severity.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.categoryButtons}>
                    {(['romantic', 'intimate', 'suspicious', 'meetup', 'secret', 'general'] as const).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryButton,
                          editingWord.category === category && styles.categoryButtonActive,
                          { borderColor: getCategoryColor(category) },
                        ]}
                        onPress={() => setEditingWord({ ...editingWord, category })}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            editingWord.category === category && { color: getCategoryColor(category) },
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Status</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      editingWord.active ? styles.toggleButtonActive : styles.toggleButtonInactive,
                    ]}
                    onPress={() => setEditingWord({ ...editingWord, active: !editingWord.active })}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        editingWord.active ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
                      ]}
                    >
                      {editingWord.active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
                <Save size={18} color={colors.text.white} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.white,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  wordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  wordInfo: {
    flex: 1,
  },
  wordPhrase: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inactiveText: {
    textDecorationLine: 'line-through',
  },
  wordTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  wordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  deleteButton: {
    marginLeft: 4,
  },
  deactivateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  activateText: {
    fontSize: 12,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  toggleButtonInactive: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.primary,
  },
  toggleButtonTextInactive: {
    color: colors.text.secondary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.white,
  },
});

