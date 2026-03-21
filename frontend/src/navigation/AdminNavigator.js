import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';
import AdminTransactionsScreen from '../screens/admin/AdminTransactionsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';

const Stack = createStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent', flex: 1 },
      }}
    >
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
