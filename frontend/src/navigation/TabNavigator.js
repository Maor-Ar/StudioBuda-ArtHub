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
            paddingTop: 25, // Increased from 10 to add more margin above buttons
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
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#FFD1E3', // Bright pink background for active state
                    opacity: 0.3,
                    shadowColor: '#FFD1E3',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 5,
                  }} />
                )}
                <View style={{ opacity: focused ? 1 : 0.6 }}>
                  <PurchasesButton 
                    width={25} 
                    height={25}
                  />
                </View>
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
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#FFD1E3', // Bright pink background for active state
                    opacity: 0.3,
                    shadowColor: '#FFD1E3',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 5,
                  }} />
                )}
                <View style={{ opacity: focused ? 1 : 0.6 }}>
                  <CalendarButton 
                    width={25} 
                    height={25}
                  />
                </View>
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
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#FFD1E3', // Bright pink background for active state
                    opacity: 0.3,
                    shadowColor: '#FFD1E3',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 5,
                  }} />
                )}
                <View style={{ opacity: focused ? 1 : 0.6 }}>
                  <ProfileButton 
                    width={25} 
                    height={25}
                  />
                </View>
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
                <View style={{ alignItems: 'center', justifyContent: 'center', width: 50, height: 50 }}>
                  {focused && (
                    <View style={{
                      position: 'absolute',
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: '#FFD1E3', // Bright pink background for active state
                      opacity: 0.3,
                      shadowColor: '#FFD1E3',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                      elevation: 5,
                    }} />
                  )}
                  <View style={{ opacity: focused ? 1 : 0.6 }}>
                    <ProfileButton 
                      width={25} 
                      height={25}
                    />
                  </View>
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
