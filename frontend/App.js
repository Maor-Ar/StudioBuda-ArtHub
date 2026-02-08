import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { ApolloProvider } from '@apollo/client';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  MiriamLibre_400Regular,
} from '@expo-google-fonts/miriam-libre';
import Toast from 'react-native-toast-message';
import client from './src/config/apollo';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toast';

// Custom theme with dark purple background to prevent white flash
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#5D3587', // Dark purple - global background color
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({ MiriamLibre_400Regular });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5D3587' }}>
        <ActivityIndicator size="large" color="#FFE2ED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: '#5D3587' }}>
      <ApolloProvider client={client}>
        <AuthProvider>
          <NavigationContainer theme={AppTheme}>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
          <Toast config={toastConfig} />
        </AuthProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
