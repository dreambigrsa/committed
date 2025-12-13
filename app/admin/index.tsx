import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
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
  Video,
  ScanFace,
  ShieldAlert,
  Smile,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import colors from '@/constants/colors';

export default function AdminDashboardScreen() {
  const { currentUser } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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
      title: 'Posts Review',
      icon: FileText,
      description: 'Review posts',
      route: '/admin/posts-review',
      color: '#4ECDC4',
      visible: true,
    },
    {
      title: 'Reels Review',
      icon: Video,
      description: 'Review reels',
      route: '/admin/reels-review',
      color: '#95E1D3',
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
      title: 'Stickers',
      icon: Smile,
      description: 'Manage stickers',
      route: '/admin/stickers',
      color: '#FFB6C1',
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
    {
      title: 'Face Matching',
      icon: ScanFace,
      description: 'Manage face recognition providers',
      route: '/admin/face-matching',
      color: '#E74C3C',
      visible: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    },
    {
      title: 'Trigger Words',
      icon: ShieldAlert,
      description: 'Manage infidelity detection words',
      route: '/admin/trigger-words',
      color: '#E67E22',
      visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
    },
    {
      title: 'Warning Templates',
      icon: FileText,
      description: 'Customize infidelity warning messages',
      route: '/admin/warning-templates',
      color: '#FF6B6B',
      visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
    },
    {
      title: 'Verification Services',
      icon: Shield,
      description: 'Configure SMS and Email services',
      route: '/admin/verification-services',
      color: '#3498DB',
      visible: currentUser.role === 'super_admin',
    },
    {
      title: 'ID Verifications',
      icon: Shield,
      description: 'Review ID verification requests',
      route: '/admin/id-verifications',
      color: '#2ECC71',
      visible: currentUser.role === 'super_admin' || currentUser.role === 'admin',
    },
    {
      title: 'Ban Appeals',
      icon: AlertTriangle,
      description: 'Review ban and restriction appeals',
      route: '/admin/ban-appeals',
      color: '#E74C3C',
      visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
    },
    {
      title: 'Legal & Policies',
      icon: FileText,
      description: 'Manage legal documents and policies',
      route: '/admin/legal-policies',
      color: '#6C5CE7',
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
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{currentUser.fullName}</Text>
          <View style={styles.roleBadge}>
            <Shield size={16} color={colors.text.white} />
            <Text style={styles.roleText}>
              {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.sectionsGrid, { opacity: fadeAnim }]}>
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
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    padding: 28,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  sectionsGrid: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
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
