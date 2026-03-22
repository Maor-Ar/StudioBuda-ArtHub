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
import { setApolloAuthFailureHandler } from './src/config/apollo';
import { AuthProvider } from './src/context/AuthContext';
import { useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toast';
import { showErrorToast } from './src/utils/toast';
import { attachServiceWorkerUpdateFlow } from './src/utils/pwaUpdate';

// Custom theme with dark purple background to prevent white flash
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent', 
  },
};

const ApolloAuthBridge = () => {
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setApolloAuthFailureHandler(async () => {
      if (!isAuthenticated) return;
      await logout();
      showErrorToast('החיבור פג תוקף, יש להתחבר מחדש');
    });

    return () => {
      setApolloAuthFailureHandler(null);
    };
  }, [isAuthenticated, logout]);

  return null;
};

export default function App() {
  const [fontsLoaded] = useFonts({ MiriamLibre_400Regular });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = '#5D3587';
      document.body.style.backgroundColor = '#5D3587';

      const ensureMeta = (name, content) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = name;
          document.head.appendChild(meta);
        }
        meta.content = content;
      };

      const ensureLink = (rel, href) => {
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = href;
      };

      ensureMeta('theme-color', '#5D3587');
      ensureMeta('apple-mobile-web-app-capable', 'yes');
      ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
      ensureMeta('apple-mobile-web-app-title', 'StudioBuda');
      ensureMeta('mobile-web-app-capable', 'yes');
      ensureLink('manifest', '/manifest.json');
      ensureLink('apple-touch-icon', '/icons/apple-touch-icon.png');
    }
  }, []);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('[PWA] Service worker registered');
          attachServiceWorkerUpdateFlow(registration);
        } catch (error) {
          console.warn('[PWA] Service worker registration failed:', error);
        }
      };

      // Register after page load for a safer startup path.
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker, { once: true });
      }
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
          <ApolloAuthBridge />
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
