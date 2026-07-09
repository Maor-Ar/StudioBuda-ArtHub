import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { setApolloLoadingHandler } from '../config/apollo';
import { resolveLoadingMessage } from '../utils/loadingMessages';

const LOADER_HIDE_DELAY_MS = 200;
const FADE_IN_MS = 150;
const FADE_OUT_MS = 300;

const LoadingContext = createContext({
  isGlobalLoading: false,
  loadingMessage: null,
});

export const LoadingProvider = ({ children }) => {
  const operationCountsRef = useRef(new Map());
  const hideTimerRef = useRef(null);
  const lastMessageRef = useRef(null);
  const [state, setState] = useState({ isGlobalLoading: false, loadingMessage: null });

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    setApolloLoadingHandler(({ delta, operationName }) => {
      const name = operationName || 'Unknown';
      const previous = operationCountsRef.current.get(name) || 0;
      const next = Math.max(0, previous + delta);

      if (next === 0) {
        operationCountsRef.current.delete(name);
      } else {
        operationCountsRef.current.set(name, next);
      }

      const activeOperationNames = [...operationCountsRef.current.keys()];
      const totalInFlight = [...operationCountsRef.current.values()].reduce((sum, count) => sum + count, 0);
      const resolvedMessage = resolveLoadingMessage(activeOperationNames);

      if (resolvedMessage) {
        lastMessageRef.current = resolvedMessage;
      }

      if (totalInFlight > 0) {
        clearHideTimer();
        setState({
          isGlobalLoading: true,
          loadingMessage: resolvedMessage || lastMessageRef.current,
        });
        return;
      }

      if (!hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          setState((prev) => ({
            isGlobalLoading: false,
            loadingMessage: prev.loadingMessage || lastMessageRef.current,
          }));
          hideTimerRef.current = null;
        }, LOADER_HIDE_DELAY_MS);
      }
    });

    return () => {
      clearHideTimer();
      setApolloLoadingHandler(null);
      operationCountsRef.current.clear();
      lastMessageRef.current = null;
      setState({ isGlobalLoading: false, loadingMessage: null });
    };
  }, []);

  return (
    <LoadingContext.Provider value={state}>
      {children}
      <GlobalLoadingOverlay active={state.isGlobalLoading} message={state.loadingMessage} />
    </LoadingContext.Provider>
  );
};

function GlobalLoadingOverlay({ active, message }) {
  const [mounted, setMounted] = useState(false);
  const [displayMessage, setDisplayMessage] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const fadeAnimRef = useRef(null);

  const stopFade = () => {
    if (fadeAnimRef.current) {
      fadeAnimRef.current.stop();
      fadeAnimRef.current = null;
    }
  };

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
    }
  }, [message]);

  useEffect(() => {
    if (active) {
      stopFade();
      setMounted(true);
      if (message) {
        setDisplayMessage(message);
      }
      fadeAnimRef.current = Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      });
      fadeAnimRef.current.start(() => {
        fadeAnimRef.current = null;
      });
      return;
    }

    if (!mounted) {
      return;
    }

    stopFade();
    fadeAnimRef.current = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    });
    fadeAnimRef.current.start(({ finished }) => {
      fadeAnimRef.current = null;
      if (finished) {
        setMounted(false);
        setDisplayMessage(null);
        opacity.setValue(0);
      }
    });
  }, [active, mounted, message, opacity]);

  useEffect(() => () => stopFade(), []);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity }]} pointerEvents={active ? 'auto' : 'none'}>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#AB5FBD" />
          {displayMessage ? <Text style={styles.loadingText}>{displayMessage}</Text> : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

export function useGlobalLoading() {
  return useContext(LoadingContext);
}

export function useShouldShowLocalLoader(isLoading) {
  const { isGlobalLoading } = useGlobalLoading();
  return Boolean(isLoading) && !isGlobalLoading;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 180,
    minHeight: 108,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#4E0D66',
    fontWeight: '600',
    textAlign: 'center',
  },
});
