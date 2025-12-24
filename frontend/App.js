import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ApolloProvider } from '@apollo/client';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import client from './src/config/apollo';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AuthProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
