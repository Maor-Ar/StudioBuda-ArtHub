import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import LogoLightPink from '../assets/LogoLightPink.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AuthenticatedLayout = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Background Logo - above purple bg, behind UI; needs elevation for Android stacking */}
      <View style={styles.logoContainer} pointerEvents="none">
        <View style={styles.logoWrapper}>
          <LogoLightPink
            width={SCREEN_WIDTH * 0.7}
            height={SCREEN_HEIGHT * 0.4}
            style={styles.logo}
          />
        </View>
      </View>

      {/* Page Content - on top of logo */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5D3587',
    overflow: 'visible',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 165,
    left: 0,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 0,
    elevation: 0,
  },
  logoWrapper: {
    marginLeft: -30,
  },
  logo: {
    opacity: 0.5,
    ...(Platform.OS === 'web' && {
      display: 'block',
      position: 'relative',
    }),
  },
  content: {
    flex: 1,
    zIndex: 1,
    elevation: 1,
    backgroundColor: 'transparent',
  },
});

export default AuthenticatedLayout;
