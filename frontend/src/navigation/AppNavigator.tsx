import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from './types';
import CustomDrawerContent from './CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import GeoSenseScreen from '../screens/GeoSenseScreen';

type User = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
};

type Props = {
  user: User;
  token: string;
  onLogout: () => void;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppNavigator({ user, token, onLogout }: Props) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{
            headerShown: false,
            drawerType: 'front',
            drawerStyle: {
              width: 280,
              backgroundColor: 'transparent',
            },
            overlayColor: 'rgba(0,0,0,0.6)',
          }}
          drawerContent={(props) => (
            <CustomDrawerContent {...props} user={user} onLogout={onLogout} />
          )}
        >
          <Drawer.Screen name="Home">
            {() => <HomeScreen user={user} onLogout={onLogout} />}
          </Drawer.Screen>
          <Drawer.Screen name="Geo-Sense">
            {() => <GeoSenseScreen token={token} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
