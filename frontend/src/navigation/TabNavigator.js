import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CalendarScreen from '../screens/main/CalendarScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ProductsScreen from '../screens/main/ProductsScreen';
import AdminNavigator from './AdminNavigator';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import SelectionBar from '../components/SelectionBar';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useAuth();
  const isManager = user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.ADMIN;

  return (
    <AuthenticatedLayout>
      <Tab.Navigator
        tabBar={(props) => <SelectionBar {...props} />}
        screenOptions={{
          headerShown: false,
          // CRITICAL: Make the scene container transparent so AuthenticatedLayout shows through
          sceneContainerStyle: {
            backgroundColor: 'transparent',
            paddingBottom: 160, // Space for SelectionBar (154px from Figma)
          },
        }}
      >
        <Tab.Screen name="Products" component={ProductsScreen} options={{ title: 'רכישות' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'יומן' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'פרופיל' }} />
        {isManager && (
          <Tab.Screen name="Admin" component={AdminNavigator} options={{ title: 'ניהול' }} />
        )}
      </Tab.Navigator>
    </AuthenticatedLayout>
  );
};

export default TabNavigator;
