import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
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
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function AdminDashboardScreen() {
  const { currentUser } = useApp();
  const { colors: themeColors } = useTheme();
  const styles = createStyles(themeColors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
      category: 'User Management',
      items: [
        {
          title: 'Users',
          icon: Users,
          description: 'Manage all users',
          route: '/admin/users',
          color: '#4A90E2',
          gradient: ['#4A90E2', '#357ABD'],
          visible: true,
        },
        {
          title: 'Relationships',
          icon: Heart,
          description: 'Manage relationships',
          route: '/admin/relationships',
          color: '#E74C3C',
          gradient: ['#E74C3C', '#C0392B'],
          visible: true,
        },
        {
          title: 'Admins & Moderators',
          icon: UserCog,
          description: 'Manage admin roles',
          route: '/admin/roles',
          color: '#9B59B6',
          gradient: ['#9B59B6', '#8E44AD'],
          visible: currentUser.role === 'super_admin',
        },
      ],
    },
    {
      category: 'Content Management',
      items: [
        {
          title: 'Posts Review',
          icon: FileText,
          description: 'Review posts',
          route: '/admin/posts-review',
          color: '#1ABC9C',
          gradient: ['#1ABC9C', '#16A085'],
          visible: true,
        },
        {
          title: 'Reels Review',
          icon: Video,
          description: 'Review reels',
          route: '/admin/reels-review',
          color: '#E67E22',
          gradient: ['#E67E22', '#D35400'],
          visible: true,
        },
        {
          title: 'Reported Content',
          icon: AlertTriangle,
          description: 'Review reports',
          route: '/admin/reports',
          color: '#F39C12',
          gradient: ['#F39C12', '#E67E22'],
          visible: true,
        },
        {
          title: 'Stickers',
          icon: Smile,
          description: 'Manage stickers',
          route: '/admin/stickers',
          color: '#FF6B9D',
          gradient: ['#FF6B9D', '#FF8E9B'],
          visible: true,
        },
      ],
    },
    {
      category: 'Business & Marketing',
      items: [
        {
          title: 'Advertisements',
          icon: DollarSign,
          description: 'Manage ads',
          route: '/admin/advertisements',
          color: '#2ECC71',
          gradient: ['#2ECC71', '#27AE60'],
          visible: true,
        },
        {
          title: 'Analytics',
          icon: BarChart3,
          description: 'View analytics',
          route: '/admin/analytics',
          color: '#3498DB',
          gradient: ['#3498DB', '#2980B9'],
          visible: true,
        },
      ],
    },
    {
      category: 'Safety & Compliance',
      items: [
        {
          title: 'Disputes',
          icon: Shield,
          description: 'Handle disputes',
          route: '/admin/disputes',
          color: '#E74C3C',
          gradient: ['#E74C3C', '#C0392B'],
          visible: true,
        },
        {
          title: 'Trigger Words',
          icon: ShieldAlert,
          description: 'Manage infidelity detection',
          route: '/admin/trigger-words',
          color: '#E67E22',
          gradient: ['#E67E22', '#D35400'],
          visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
        },
        {
          title: 'Warning Templates',
          icon: FileText,
          description: 'Customize warnings',
          route: '/admin/warning-templates',
          color: '#F39C12',
          gradient: ['#F39C12', '#E67E22'],
          visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
        },
        {
          title: 'Ban Appeals',
          icon: AlertTriangle,
          description: 'Review appeals',
          route: '/admin/ban-appeals',
          color: '#C0392B',
          gradient: ['#C0392B', '#A93226'],
          visible: currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'moderator',
        },
      ],
    },
    {
      category: 'Verification',
      items: [
        {
          title: 'ID Verifications',
          icon: Shield,
          description: 'Review ID requests',
          route: '/admin/id-verifications',
          color: '#16A085',
          gradient: ['#16A085', '#138D75'],
          visible: currentUser.role === 'super_admin' || currentUser.role === 'admin',
        },
        {
          title: 'Face Matching',
          icon: ScanFace,
          description: 'Face recognition',
          route: '/admin/face-matching',
          color: '#8E44AD',
          gradient: ['#8E44AD', '#7D3C98'],
          visible: currentUser.role === 'super_admin' || currentUser.role === 'admin',
        },
        {
          title: 'Verification Services',
          icon: Shield,
          description: 'SMS & Email config',
          route: '/admin/verification-services',
          color: '#2980B9',
          gradient: ['#2980B9', '#1F618D'],
          visible: currentUser.role === 'super_admin',
        },
      ],
    },
    {
      category: 'System',
      items: [
        {
          title: 'Legal & Policies',
          icon: FileText,
          description: 'Manage legal docs',
          route: '/admin/legal-policies',
          color: '#6C5CE7',
          gradient: ['#6C5CE7', '#5A4FCF'],
          visible: currentUser.role === 'super_admin',
        },
        {
          title: 'App Settings',
          icon: Settings,
          description: 'Configure app',
          route: '/admin/settings',
          color: '#9B59B6',
          gradient: ['#9B59B6', '#8E44AD'],
          visible: currentUser.role === 'super_admin',
        },
        {
          title: 'Activity Logs',
          icon: FileText,
          description: 'View activity logs',
          route: '/admin/logs',
          color: '#7F8C8D',
          gradient: ['#7F8C8D', '#5D6D7E'],
          visible: currentUser.role === 'super_admin',
        },
      ],
    },
  ];

  const visibleSections = adminSections.map(category => ({
    ...category,
    items: category.items.filter(item => item.visible),
  })).filter(category => category.items.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Admin Dashboard', 
          headerShown: true,
          headerStyle: { backgroundColor: themeColors.primary },
          headerTintColor: themeColors.text.white,
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <LayoutDashboard size={28} color={themeColors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{currentUser.fullName}</Text>
              </View>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: themeColors.primary }]}>
              <Shield size={16} color={themeColors.text.white} />
              <Text style={styles.roleText}>
                {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Categories */}
        <Animated.View style={[styles.sectionsContainer, { opacity: fadeAnim }]}>
          {visibleSections.map((category, categoryIndex) => (
            <View key={category.category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryHeaderLine} />
                <Text style={styles.categoryTitle}>{category.category}</Text>
                <View style={styles.categoryHeaderLine} />
              </View>
              
              <View style={styles.cardsGrid}>
                {category.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.sectionCard}
                      onPress={() => router.push(item.route as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.cardGradient, { backgroundColor: item.gradient[0] + '15' }]}>
                        <View style={[styles.iconContainer, { backgroundColor: item.gradient[0] + '20' }]}>
                          <Icon size={28} color={item.gradient[0]} />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.sectionTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.sectionDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        </View>
                        <View style={styles.cardFooter}>
                          <ChevronRight size={18} color={item.gradient[0]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
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
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  headerContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text.primary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text.white,
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
});
