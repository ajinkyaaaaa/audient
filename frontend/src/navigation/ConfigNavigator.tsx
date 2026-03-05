import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConfigStackParamList } from './types';
import ConfigScreen from '../screens/ConfigScreen';
import BaseLocationPickerScreen from '../screens/BaseLocationPickerScreen';

const Stack = createNativeStackNavigator<ConfigStackParamList>();

export default function ConfigNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConfigMain" component={ConfigScreen} />
      <Stack.Screen
        name="BaseLocationPicker"
        options={{ animation: 'slide_from_right' }}
        component={BaseLocationPickerScreen}
      />
    </Stack.Navigator>
  );
}
