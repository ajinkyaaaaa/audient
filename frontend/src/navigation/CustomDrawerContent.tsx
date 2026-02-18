import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
];

export default function CustomDrawerContent({ user, onLogout, state, navigation }: Props) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        {[...baseMenuItems, ...(user.role === 'admin' ? adminMenuItems : [])].map((item) => {
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

const styles = StyleSheet.create({
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
});
