import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Users,
  Heart,
  Shield,
  UserCog,
  Settings,
  BarChart3,
  AlertTriangle,
  FileText,
  MessageSquare,
  DollarSign,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function AdminDashboardScreen() {
  const { currentUser } = useApp();

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Admin Dashboard', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Shield size={64} color={colors.danger} />
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>You don&apos;t have admin permissions</Text>
        </View>
      </SafeAreaView>
    );
  }

  const adminSections = [
    {
      title: 'Users',
      icon: Users,
      description: 'Manage all users',
      route: '/admin/users',
      color: colors.primary,
      visible: true,
    },
    {
      title: 'Relationships',
      icon: Heart,
      description: 'Manage relationships',
      route: '/admin/relationships',
      color: colors.secondary,
      visible: true,
    },
    {
      title: 'Admins & Moderators',
      icon: UserCog,
      description: 'Manage admin roles',
      route: '/admin/roles',
      color: colors.accent,
      visible: currentUser.role === 'super_admin',
    },
    {
      title: 'Reported Content',
      icon: AlertTriangle,
      description: 'Review reports',
      route: '/admin/reports',
      color: colors.danger,
      visible: true,
    },
    {
      title: 'Disputes',
      icon: Shield,
      description: 'Handle disputes',
      route: '/admin/disputes',
      color: '#FF6B6B',
      visible: true,
    },
    {
      title: 'Advertisements',
      icon: DollarSign,
      description: 'Manage ads',
      route: '/admin/advertisements',
      color: '#4ECDC4',
      visible: true,
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      description: 'View analytics',
      route: '/admin/analytics',
      color: '#95E1D3',
      visible: true,
    },
    {
      title: 'Activity Logs',
      icon: FileText,
      description: 'View activity logs',
      route: '/admin/logs',
      color: '#C7CEEA',
      visible: currentUser.role === 'super_admin',
    },
    {
      title: 'App Settings',
      icon: Settings,
      description: 'Configure app',
      route: '/admin/settings',
      color: '#9B59B6',
      visible: currentUser.role === 'super_admin',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Admin Dashboard', 
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.white,
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{currentUser.fullName}</Text>
          <View style={styles.roleBadge}>
            <Shield size={16} color={colors.text.white} />
            <Text style={styles.roleText}>
              {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionsGrid}>
          {adminSections.filter(section => section.visible).map((section) => {
            const Icon = section.icon;
            return (
              <TouchableOpacity
                key={section.route}
                style={styles.sectionCard}
                onPress={() => router.push(section.route as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: section.color + '20' }]}>
                  <Icon size={32} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDescription}>{section.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.white,
  },
  sectionsGrid: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
