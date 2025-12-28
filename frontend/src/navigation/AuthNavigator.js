import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/auth/HomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterStep1Screen from '../screens/auth/RegisterStep1Screen';
import RegisterStep2Screen from '../screens/auth/RegisterStep2Screen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false, // Hide header for custom design
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="RegisterStep1" 
        component={RegisterStep1Screen}
      />
      <Stack.Screen 
        name="RegisterStep2" 
        component={RegisterStep2Screen}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;








