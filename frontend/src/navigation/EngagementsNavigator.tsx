import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EngagementsStackParamList } from './types';
import EngagementsScreen from '../screens/EngagementsScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';

type Props = {
  token: string;
};

const Stack = createNativeStackNavigator<EngagementsStackParamList>();

export default function EngagementsNavigator({ token }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EngagementsList">
        {() => <EngagementsScreen token={token} />}
      </Stack.Screen>
      <Stack.Screen
        name="ClientDetail"
        options={{ animation: 'slide_from_right' }}
      >
        {(props) => (
          <ClientDetailScreen
            token={token}
            clientId={props.route.params.clientId}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
