import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

const RevealOnView = ({ children, style, threshold = 0.25 }) => {
  const hostRef = useRef(null);
  const progressRef = useRef(new Animated.Value(0));
  const [isVisibleOnce, setIsVisibleOnce] = useState(false);

  useEffect(() => {
    if (isVisibleOnce) return;

    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsVisibleOnce(true);
      return;
    }

    const target = hostRef.current;
    if (!target) return undefined;

    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisibleOnce(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isVisibleOnce, threshold]);

  useEffect(() => {
    if (!isVisibleOnce) return;
    Animated.timing(progressRef.current, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isVisibleOnce]);

  const containerStyle = {
    opacity: progressRef.current,
    transform: [
      {
        translateY: progressRef.current.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  return (
    <View ref={hostRef} collapsable={false}>
      <Animated.View style={[containerStyle, style]}>
        {typeof children === 'function'
          ? children({ visible: isVisibleOnce, progress: progressRef.current })
          : children}
      </Animated.View>
    </View>
  );
};

export default RevealOnView;
