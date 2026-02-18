import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';

export default function TasksScreen() {
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Oswald_700Bold',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Oswald_500Medium',
    color: '#4a5568',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Oswald_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
  },
});
