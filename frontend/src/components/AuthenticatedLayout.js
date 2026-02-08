import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import LogoLightPink from '../assets/LogoLightPink.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AuthenticatedLayout = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Page Content - Layer 1 (rendered first, at the bottom) */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Background Logo - Layer 2 - Bottom Left with 0.5 opacity */}
      {/* Rendered AFTER content so it appears ON TOP, but with pointerEvents="none" */}
      <View style={styles.logoContainer} pointerEvents="none">
        <View style={styles.logoWrapper}>
          <LogoLightPink
            width={SCREEN_WIDTH * 0.7}
            height={SCREEN_HEIGHT * 0.4}
            style={styles.logo}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5D3587', // Main background color on the container itself
  },
  logoContainer: {
    position: 'absolute',
    bottom: 165, // Above SelectionBar (154px from Figma)
    left: 0,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  logoWrapper: {
    marginLeft: -50, // Partially off-screen on the left
  },
  logo: {
    opacity: 0.5,
    // Ensure SVG renders on web
    ...(Platform.OS === 'web' && {
      display: 'block',
      position: 'relative',
      zIndex: 10,
    }),
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default AuthenticatedLayout;
