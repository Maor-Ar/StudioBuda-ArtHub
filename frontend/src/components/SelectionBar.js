import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PurchasesButton from '../assets/icons/PurchasesButton.svg';
import CalendarButton from '../assets/icons/calendarButton.svg';
import ProfileButton from '../assets/icons/ProfileButton.svg';
import UsersFour from '../assets/icons/users-four.svg';

const TAB_CONFIG = [
  { name: 'Products', label: 'רכישות', Icon: PurchasesButton },
  { name: 'Calendar', label: 'יומן', Icon: CalendarButton },
  { name: 'Profile', label: 'פרופיל', Icon: ProfileButton },
];

// Admin tab for managers - added separately
const ADMIN_TAB = { name: 'Admin', label: 'ניהול', Icon: UsersFour };

const getTabConfig = (name) => {
  if (name === 'Admin') return ADMIN_TAB;
  return TAB_CONFIG.find((t) => t.name === name) || { name, label: name, Icon: ProfileButton };
};

const LABEL_WIDTH = 76; // Width for text + stroke to animate

const AnimatedLabelWithStroke = ({ label, visible }) => {
  const widthAnim = useRef(new Animated.Value(visible ? LABEL_WIDTH : 0)).current;
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: visible ? LABEL_WIDTH : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [visible, widthAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.labelWrapper,
        {
          width: widthAnim,
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.labelWithStroke}>
        <Text style={styles.label}>{label}</Text>
        <Image
          source={require('../assets/bright-Underline-stroke.png')}
          style={styles.stroke}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
};

const SelectionBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Gradient: purely visual layer, never blocks clicks (התנתק etc.) */}
      <LinearGradient
        colors={['rgba(217, 217, 217, 0)', 'rgba(255, 226, 237, 0.7)']}
        locations={[0, 1]}
        style={[styles.gradientBg, { minHeight: 154 + insets.bottom }]}
        pointerEvents="none"
      />
      {/* Pill: interactive layer on top */}
      <View style={[styles.pillWrapper, { bottom: 24 + insets.bottom }]}>
        <View style={styles.pillContainer}>
          <View style={styles.pill}>
            {state.routes.map((route) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === state.routes.findIndex((r) => r.key === route.key);
              const config = getTabConfig(route.name);
              const IconComponent = config?.Icon || ProfileButton;
              const label = config?.label || route.name;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={styles.tabButton}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tabContent, isFocused && styles.tabContentFocused]}>
                    <View style={[styles.iconWrapper, !isFocused && styles.iconWrapperInactive]}>
                      <IconComponent width={24} height={24} />
                    </View>
                    <AnimatedLabelWithStroke label={label} visible={isFocused} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  gradientBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    minHeight: 154,
    paddingTop: 65,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pillWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pillContainer: {
    width: '100%',
    maxWidth: 360,
    height: 48,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    backgroundColor: '#5D3587',
    borderRadius: 35,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentFocused: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrapper: {
    opacity: 1,
  },
  iconWrapperInactive: {
    opacity: 0.6,
  },
  labelWrapper: {
    overflow: 'hidden',
    marginRight: 6,
  },
  labelWithStroke: {
    flexDirection: 'column',
    alignItems: 'center',
    width: LABEL_WIDTH,
  },
  label: {
    fontFamily: 'MiriamLibre_400Regular',
    fontSize: 20,
    lineHeight: 24,
    color: '#FFE2ED',
  },
  stroke: {
    width: 56,
    height: 8,
    marginTop: 4,
  },
});

export default SelectionBar;
