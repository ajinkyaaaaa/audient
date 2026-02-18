import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from './types';
import CustomDrawerContent from './CustomDrawerContent';
import GeoSenseScreen from '../screens/GeoSenseScreen';
import HomeNavigator from './HomeNavigator';
import EngagementsNavigator from './EngagementsNavigator';
import TasksScreen from '../screens/TasksScreen';

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
    <NavigationContainer>
      <Drawer.Navigator
          screenOptions={{
            headerShown: false,
            drawerType: 'permanent',
            drawerStyle: {
              width: 64,
              backgroundColor: 'transparent',
            },
            overlayColor: 'transparent',
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
        </Drawer.Navigator>
    </NavigationContainer>
  );
}
