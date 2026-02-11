import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import LogoLightPink from '../assets/LogoLightPink.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AuthenticatedLayout = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Content area - logo behind, tab content on top */}
      <View style={styles.content}>
        {/* Background Logo - behind content (between purple bg and screens) */}
        <View style={styles.logoContainer} pointerEvents="none">
          <LogoLightPink
            width={SCREEN_WIDTH * 0.7}
            height={SCREEN_HEIGHT * 0.4}
            style={styles.logo}
          />
        </View>
        {/* Tab content - rendered above logo */}
        <View style={styles.tabContent}>
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  content: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  logoContainer: {
    position: 'absolute',
    // distance from the bottom – tweak this so it sits nicely above the SelectionBar
    bottom: 160,            // e.g. same as TabNavigator scene paddingBottom
    left: -70,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.4,
    justifyContent: 'flex-end',  // logo at bottom of this box
    alignItems: 'flex-start',    // and aligned to the left
    zIndex: 0,
    elevation: 0,
  },
  logo: {
    opacity: 0.5,
    ...(Platform.OS === 'web' && {
      display: 'block',
      position: 'relative',
    }),
  },
  tabContent: {
    flex: 1,
    zIndex: 1,
    elevation: 1,
    backgroundColor: 'transparent',
  },
});

export default AuthenticatedLayout;
