import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export default function TasksScreen() {
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.hamburger}
        >
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Placeholder */}
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No tasks yet</Text>
        <Text style={styles.emptySubtext}>Task management coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerBar: {
    width: 22,
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
    marginVertical: 2.5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  headerRight: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#4a5568',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
  },
});
