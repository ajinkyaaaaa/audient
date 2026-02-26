import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';

type Props = {
  visitId: string;
  clientName: string;
};

export default function VisitDetailScreen({ visitId: _visitId, clientName }: Props) {
  const navigation = useNavigation<any>();

  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  if (!fontsLoaded) return null;

  const topPad = Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 40 : 24;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerClient} numberOfLines={1}>{clientName}</Text>
          <Text style={styles.headerSub}>Visit Details</Text>
        </View>
      </View>

      {/* Placeholder body */}
      <View style={styles.body}>
        <Ionicons name="construct-outline" size={48} color="#D1C8B8" />
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderSub}>
          Visit details, check-in / check-out, notes, and stakeholder log will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4EF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1 },
  headerClient: {
    fontFamily: 'Oswald_700Bold', fontSize: 20, color: '#1a1a1a',
  },
  headerSub: {
    fontFamily: 'Oswald_400Regular', fontSize: 13, color: '#A89070', marginTop: 2,
  },

  body: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  placeholderTitle: {
    fontFamily: 'Oswald_600SemiBold', fontSize: 22, color: '#6B5540',
  },
  placeholderSub: {
    fontFamily: 'Oswald_400Regular', fontSize: 14, color: '#A89070',
    textAlign: 'center', lineHeight: 22,
  },
});
