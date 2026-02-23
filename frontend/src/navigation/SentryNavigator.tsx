import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SentryStackParamList } from './types';
import SentryScreen from '../screens/SentryScreen';
import EmployeeDetailScreen from '../screens/EmployeeDetailScreen';

type Props = {
  token: string;
  currentUserId: number;
  userName: string;
};

const Stack = createNativeStackNavigator<SentryStackParamList>();

export default function SentryNavigator({ token, currentUserId, userName }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SentryList">
        {() => <SentryScreen token={token} currentUserId={currentUserId} userName={userName} />}
      </Stack.Screen>
      <Stack.Screen
        name="EmployeeDetail"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <EmployeeDetailScreen
            token={token}
            employeeId={props.route.params.employeeId}
            employeeName={props.route.params.employeeName}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
