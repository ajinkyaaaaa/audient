import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';

type SettingsScreenProps = {
  user: { name: string; email: string; role?: string };
};

export default function SettingsScreen({ user }: SettingsScreenProps) {
  const navigation = useNavigation<any>();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const isAdmin = user.role === 'admin';

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
                <Ionicons name="menu" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
            <Ionicons name="settings" size={24} color="#C05800" />
            <Text style={styles.title}>Settings</Text>
          </View>
          <Text style={styles.subtitle}>App preferences and configuration</Text>
        </View>

        {/* Admin Settings — only visible to admins */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminRow}
            onPress={() => navigation.navigate('Config')}
            activeOpacity={0.75}
          >
            <View style={styles.adminRowLeft}>
              <View style={styles.adminIconWrap}>
                <Ionicons name="shield-checkmark" size={20} color="#C05800" />
              </View>
              <View>
                <Text style={styles.adminRowTitle}>Admin Settings</Text>
                <Text style={styles.adminRowSub}>Work hours, timezone, location sync</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A89070" />
          </TouchableOpacity>
        )}

        {/* Placeholder — future employee settings go here */}
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={36} color="#D4C8A0" />
          <Text style={styles.emptyTitle}>More settings coming soon</Text>
          <Text style={styles.emptySubtitle}>Personal preferences and notifications will appear here.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingBottom: 40,
    maxWidth: 640,
  },

  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hamburger: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Oswald_400Regular',
    color: '#4a5568',
    marginTop: 4,
    marginLeft: 34,
  },

  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    padding: 16,
    marginBottom: 16,
  },
  adminRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  adminIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(192,88,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminRowTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#1a1a1a',
  },
  adminRowSub: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: '#A89070',
    marginTop: 2,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#A89070',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#C4B898',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
