import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CalendarScreen from '../screens/main/CalendarScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ProductsScreen from '../screens/main/ProductsScreen';
import AdminNavigator from './AdminNavigator';
import AuthenticatedLayout from '../components/AuthenticatedLayout';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';
import PurchasesButton from '../assets/icons/PurchasesButton.svg';
import ChatButton from '../assets/icons/ChatButton.svg';
import CalendarButton from '../assets/icons/calendarButton.svg';
import ProfileButton from '../assets/icons/ProfileButton.svg';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useAuth();
  const isManager = user?.role === USER_ROLES.MANAGER || user?.role === USER_ROLES.ADMIN;

  return (
    <AuthenticatedLayout>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          // CRITICAL: Make the scene container transparent so AuthenticatedLayout shows through
          sceneContainerStyle: {
            backgroundColor: 'transparent',
          },
          tabBarStyle: {
            backgroundColor: 'rgba(255, 226, 237, 0.4)', // Semi-transparent pink
            borderTopWidth: 0,
            height: 90,
            paddingBottom: 20,
            paddingTop: 10,
            position: 'absolute',
            // Remove shadow
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: '#FFD1E3',
          tabBarInactiveTintColor: '#FFD1E3',
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen 
          name="Products" 
          component={ProductsScreen}
          options={{ 
            title: 'רכישות',
            tabBarLabel: 'רכישות',
            tabBarIcon: ({ color, size, focused }) => (
              <PurchasesButton 
                width={25} 
                height={25}
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Chat" 
          component={ProductsScreen}
          options={{ 
            title: 'צ\'אט',
            tabBarLabel: 'צ\'אט',
            tabBarIcon: ({ color, size, focused }) => (
              <ChatButton 
                width={25} 
                height={25}
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen}
          options={{ 
            title: 'יומן',
            tabBarLabel: 'יומן',
            tabBarIcon: ({ color, size, focused }) => (
              <CalendarButton 
                width={25} 
                height={25}
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ 
            title: 'פרופיל',
            tabBarLabel: 'פרופיל',
            tabBarIcon: ({ color, size, focused }) => (
              <ProfileButton 
                width={25} 
                height={25}
              />
            ),
          }}
        />
        {isManager && (
          <Tab.Screen 
            name="Admin" 
            component={AdminNavigator}
            options={{ 
              title: 'ניהול',
              tabBarLabel: 'ניהול',
              tabBarIcon: ({ color, size }) => (
                <ProfileButton width={25} height={25} />
              ),
            }}
          />
        )}
      </Tab.Navigator>
    </AuthenticatedLayout>
  );
};

export default TabNavigator;
