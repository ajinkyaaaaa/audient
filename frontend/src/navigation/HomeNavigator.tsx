import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import RecordingDetailScreen from '../screens/RecordingDetailScreen';

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

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigator({ user, token, onLogout }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain">
        {() => <HomeScreen user={user} token={token} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="RecordingDetail"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <RecordingDetailScreen
            token={token}
            recordingId={props.route.params.recordingId}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
