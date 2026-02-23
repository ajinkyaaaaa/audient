import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = DrawerContentComponentProps & {
  user: { name: string; email: string; role?: string };
  onLogout: () => void;
};

const baseMenuItems = [
  { label: 'Home', route: 'Home', icon: 'home' as const },
  { label: 'Geo-Sense', route: 'Geo-Sense', icon: 'location' as const },
  { label: 'Engagements', route: 'Engagements', icon: 'briefcase' as const },
  { label: 'Tasks', route: 'Tasks', icon: 'checkbox' as const },
];

const adminMenuItems = [
  { label: 'Sentry', route: 'Sentry', icon: 'eye' as const },
  { label: 'Config', route: 'Config', icon: 'settings' as const },
];

export default function CustomDrawerContent({ user, onLogout, state, navigation }: Props) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuItems = [...baseMenuItems, ...(user.role === 'admin' ? adminMenuItems : [])];

  // Web: icon-only 64px ribbon
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2d4a3e', '#1f3830']}
          style={StyleSheet.absoluteFill}
        />

        {/* Brand Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
        </View>

        {/* Nav Items */}
        <View style={styles.navSection}>
          {menuItems.map((item) => {
            const isActive = state.routes[state.index]?.name === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigation.navigate(item.route)}
              >
                <Ionicons
                  name={isActive ? item.icon : (`${item.icon}-outline` as any)}
                  size={22}
                  color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom section - Logout */}
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.navItem} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mobile: full-panel drawer with icon + label
  return (
    <View style={styles.mobileContainer}>
      <LinearGradient
        colors={['#2d4a3e', '#1f3830']}
        style={StyleSheet.absoluteFill}
      />

      {/* User info header */}
      <View style={styles.mobileHeader}>
        <View style={styles.mobileAvatar}>
          <Text style={styles.mobileAvatarText}>{initials}</Text>
        </View>
        <View style={styles.mobileUserInfo}>
          <Text style={styles.mobileUserName}>{user.name}</Text>
          <Text style={styles.mobileUserEmail}>{user.email}</Text>
        </View>
      </View>

      {/* Nav Items */}
      <View style={styles.mobileNavSection}>
        {menuItems.map((item) => {
          const isActive = state.routes[state.index]?.name === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.mobileNavItem, isActive && styles.mobileNavItemActive]}
              onPress={() => navigation.navigate(item.route)}
            >
              <Ionicons
                name={isActive ? item.icon : (`${item.icon}-outline` as any)}
                size={22}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[styles.mobileNavLabel, isActive && styles.mobileNavLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom section - Logout */}
      <View style={styles.mobileBottomSection}>
        <TouchableOpacity style={styles.mobileNavItem} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.6)" />
          <Text style={styles.mobileNavLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web icon-ribbon styles
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoSection: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'Oswald_700Bold',
    color: '#FFFFFF',
  },
  navSection: {
    flex: 1,
    paddingTop: 8,
    gap: 4,
  },
  navItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bottomSection: {
    paddingBottom: 24,
  },

  // Mobile full-panel styles
  mobileContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 24,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    gap: 14,
  },
  mobileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAvatarText: {
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: '#FFFFFF',
  },
  mobileUserInfo: {
    flex: 1,
  },
  mobileUserName: {
    fontSize: 16,
    fontFamily: 'Oswald_600SemiBold',
    color: '#FFFFFF',
  },
  mobileUserEmail: {
    fontSize: 12,
    fontFamily: 'Oswald_400Regular',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  mobileNavSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 2,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 14,
  },
  mobileNavItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mobileNavLabel: {
    fontSize: 15,
    fontFamily: 'Oswald_500Medium',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  mobileNavLabelActive: {
    color: '#FFFFFF',
  },
  mobileBottomSection: {
    paddingHorizontal: 12,
  },
});
