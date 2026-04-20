import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';

const AnimatedNumber = ({ value = 0, decimals = 0, suffix = '', style, start }) => {
  const targetValue = Number(value || 0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!start || hasStarted.current) return;
    hasStarted.current = true;

    const listenerId = animatedValue.addListener(({ value: current }) => {
      setDisplayValue(current);
    });

    Animated.timing(animatedValue, {
      toValue: targetValue,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [animatedValue, start, targetValue]);

  const formatted =
    decimals > 0
      ? Number(displayValue).toFixed(decimals)
      : Math.round(displayValue).toLocaleString('he-IL');

  return <Text style={style}>{`${formatted}${suffix}`}</Text>;
};

export default AnimatedNumber;
