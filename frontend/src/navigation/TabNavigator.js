import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import CalendarScreen from '../screens/main/CalendarScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ProductsScreen from '../screens/main/ProductsScreen';
import AdminNavigator from './AdminNavigator';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  const { user } = useAuth();
  const isManager = user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.ADMIN;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#gray',
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ 
          title: 'יומן',
          tabBarLabel: 'יומן',
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen}
        options={{ 
          title: 'מוצרים',
          tabBarLabel: 'מוצרים',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'פרופיל',
          tabBarLabel: 'פרופיל',
        }}
      />
      {isManager && (
        <Tab.Screen 
          name="Admin" 
          component={AdminNavigator}
          options={{ 
            title: 'ניהול',
            tabBarLabel: 'ניהול',
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;






