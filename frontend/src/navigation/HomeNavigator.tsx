import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import RecordingDetailScreen from '../screens/RecordingDetailScreen';
import VisitDetailScreen from '../screens/VisitDetailScreen';

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
      <Stack.Screen
        name="VisitDetail"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <VisitDetailScreen
            visitId={props.route.params.visitId}
            clientCode={props.route.params.clientCode}
            clientName={props.route.params.clientName}
            time={props.route.params.time}
            location={props.route.params.location}
            status={props.route.params.status}
            type={props.route.params.type}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
