import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';
import AdminTransactionsScreen from '../screens/admin/AdminTransactionsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';

const Stack = createStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AdminEvents" 
        component={AdminEventsScreen}
        options={{ title: 'ניהול אירועים' }}
      />
      <Stack.Screen 
        name="AdminTransactions" 
        component={AdminTransactionsScreen}
        options={{ title: 'ניהול עסקאות' }}
      />
      <Stack.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen}
        options={{ title: 'ניהול משתמשים' }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;






