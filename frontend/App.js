import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
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
    background: 'transparent', 
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({ MiriamLibre_400Regular });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = '#5D3587';
      document.body.style.backgroundColor = '#5D3587';
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#5D3587';
      document.head.appendChild(meta);
    }
  }, []);

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
