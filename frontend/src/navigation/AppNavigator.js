import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

const Stack = createStackNavigator();

const SessionBootstrapLoader = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color="#FFE2ED" />
    <Text style={styles.loaderText}>בודק חיבור...</Text>
  </View>
);

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SessionBootstrapLoader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5D3587',
    gap: 12,
  },
  loaderText: {
    color: '#FFE2ED',
    fontSize: 16,
  },
});

export default AppNavigator;
