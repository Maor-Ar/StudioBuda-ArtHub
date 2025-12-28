import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoLightPink from '../../assets/LogoLightPink.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.contentWrapper}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <LogoLightPink 
            width={SCREEN_WIDTH} 
            height={SCREEN_HEIGHT * 0.33}
            preserveAspectRatio="xMidYMid meet"
          />
        </View>

        {/* Branding text */}
        <View style={styles.brandingContainer}>
          <Text style={styles.brandTitle}>Studio Buda</Text>
          <Text style={styles.brandSubtitle}>מכניסים אומנות לחיים</Text>
        </View>

        {/* Buttons container */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>כניסה</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('RegisterStep1')}
          >
            <Text style={styles.registerButtonText}>הרשמה</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5D3587', // Dark purple background
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  logoContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.33, // Approximately 269px on 812px screen
    marginBottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.05, // Approximately 40px spacing
    marginBottom: SCREEN_HEIGHT * 0.15, // Space before buttons
    paddingHorizontal: 20,
  },
  brandTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFD1E3', // Pink color
    marginBottom: 8,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#FFD1E3', // Pink color
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: SCREEN_HEIGHT * 0.05,
  },
  loginButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#FFD1E3', // Pink background
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14, // Space between buttons (723 - 665 - 44 = 14)
  },
  loginButtonText: {
    color: '#4E0D66', // Dark purple text
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#5D3587', // Dark purple background
    borderWidth: 1,
    borderColor: '#FFD1E3', // Pink border
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFD1E3', // Pink text
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;








