import React from 'react';
import { View } from 'react-native';
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
            backgroundColor: '#5D3587', // Solid dark purple background
            borderTopWidth: 3,
            borderTopColor: '#FFD1E3', // Pink top border for visual separation
            height: 90,
            paddingBottom: 20,
            paddingTop: 10,
            position: 'absolute',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          },
          tabBarActiveTintColor: '#FFD1E3', // Pink for active state
          tabBarInactiveTintColor: '#B8A3D1', // Lighter purple for inactive (still visible)
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600', // Bolder for better readability
            marginTop: 4,
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
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 35,
                    height: 35,
                    borderRadius: 17.5,
                    backgroundColor: 'rgba(93, 53, 135, 0.5)',
                  }} />
                )}
                <PurchasesButton 
                  width={25} 
                  height={25}
                />
              </View>
            ),
          }}
        />
        {/* Chat button hidden for now */}
        {/* <Tab.Screen 
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
        /> */}
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen}
          options={{ 
            title: 'יומן',
            tabBarLabel: 'יומן',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 35,
                    height: 35,
                    borderRadius: 17.5,
                    backgroundColor: 'rgba(93, 53, 135, 0.5)',
                  }} />
                )}
                <CalendarButton 
                  width={25} 
                  height={25}
                />
              </View>
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
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 35,
                    height: 35,
                    borderRadius: 17.5,
                    backgroundColor: 'rgba(93, 53, 135, 0.5)',
                  }} />
                )}
                <ProfileButton 
                  width={25} 
                  height={25}
                />
              </View>
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
              tabBarIcon: ({ color, size, focused }) => (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  {focused && (
                    <View style={{
                      position: 'absolute',
                      width: 35,
                      height: 35,
                      borderRadius: 17.5,
                      backgroundColor: 'rgba(93, 53, 135, 0.5)',
                    }} />
                  )}
                  <ProfileButton width={25} height={25} />
                </View>
              ),
            }}
          />
        )}
      </Tab.Navigator>
    </AuthenticatedLayout>
  );
};

export default TabNavigator;
