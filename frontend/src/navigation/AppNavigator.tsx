import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from './types';
import CustomDrawerContent from './CustomDrawerContent';
import GeoSenseScreen from '../screens/GeoSenseScreen';
import HomeNavigator from './HomeNavigator';
import EngagementsNavigator from './EngagementsNavigator';
import TasksScreen from '../screens/TasksScreen';
import SentryNavigator from './SentryNavigator';
import ConfigScreen from '../screens/ConfigScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { OrgConfig } from '../services/api';

type User = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
  role?: string;
  organization_id?: number;
};

type Props = {
  user: User;
  token: string;
  onLogout: () => void;
  orgConfig: OrgConfig;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const isWeb = Platform.OS === 'web';

export default function AppNavigator({ user, token, onLogout, orgConfig }: Props) {
  return (
    <NavigationContainer>
      <Drawer.Navigator
          screenOptions={{
            headerShown: false,
            drawerType: isWeb ? 'permanent' : 'front',
            drawerStyle: isWeb
              ? { width: 64, backgroundColor: 'transparent' }
              : { width: 280 },
            overlayColor: isWeb ? 'transparent' : 'rgba(0,0,0,0.5)',
            sceneContainerStyle: {
              backgroundColor: '#f5f5f0',
            },
          }}
          drawerContent={(props) => (
            <CustomDrawerContent {...props} user={user} onLogout={onLogout} />
          )}
        >
          <Drawer.Screen name="Home">
            {() => <HomeNavigator user={user} token={token} onLogout={onLogout} />}
          </Drawer.Screen>
          <Drawer.Screen name="Geo-Sense">
            {() => <GeoSenseScreen token={token} />}
          </Drawer.Screen>
          <Drawer.Screen name="Engagements">
            {() => <EngagementsNavigator token={token} />}
          </Drawer.Screen>
          <Drawer.Screen name="Tasks" component={TasksScreen} />
          {user.role === 'admin' && (
            <Drawer.Screen name="Sentry">
              {() => <SentryNavigator token={token} currentUserId={user.id} userName={user.name} />}
            </Drawer.Screen>
          )}
          <Drawer.Screen name="Settings">
            {() => <SettingsScreen user={user} />}
          </Drawer.Screen>
          {user.role === 'admin' && (
            <Drawer.Screen name="Config">
              {() => <ConfigScreen token={token} />}
            </Drawer.Screen>
          )}
        </Drawer.Navigator>
    </NavigationContainer>
  );
}
