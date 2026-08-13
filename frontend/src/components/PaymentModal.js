import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShouldShowLocalLoader } from '../context/LoadingContext';
import { GRAPHQL_ENDPOINT } from '../utils/constants';

let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const POLL_INTERVAL_MS = 3000;

function paymentStatusUrl(uniqueId) {
  try {
    const graphqlUrl = new URL(GRAPHQL_ENDPOINT);
    return `${graphqlUrl.origin}/api/payment/status/${encodeURIComponent(uniqueId)}`;
  } catch (e) {
    return `http://localhost:4000/api/payment/status/${encodeURIComponent(uniqueId)}`;
  }
}

/**
 * Hyp does not postMessage itself. Our backend success page posts
 * { type: 'payment_success' } after VERIFY + DB write.
 * On web iframes we often miss that, so we also silently poll paymentStatus
 * every 3s while the modal is open (no loader).
 */
const PaymentModal = ({
  visible,
  sessionUrl,
  uniqueId,
  onSuccess,
  onCancel,
  onClose,
  isRecurring = false,
}) => {
  const insets = useSafeAreaInsets();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('checkout');
  const webViewRef = useRef(null);
  const settledRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const openedAtRef = useRef(Date.now());
  const showInitialLoader = useShouldShowLocalLoader(initialLoading && view === 'checkout');

  const securityMessage = isRecurring
    ? 'פרטי התשלום שלך לא נשמרים אצלנו.\nהתשלום מבוצע באמצעות Hyp בצורה מאובטחת.\nהחיובים החודשיים יבוצעו אוטומטית דרך Hyp.'
    : 'פרטי התשלום שלך לא נשמרים אצלנו.\nהתשלום מבוצע באמצעות Hyp בצורה מאובטחת.';

  const resetState = useCallback(() => {
    setInitialLoading(true);
    setError(null);
    setView('checkout');
    settledRef.current = false;
    initialLoadDoneRef.current = false;
    openedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible, sessionUrl, uniqueId, resetState]);

  const markConfirmed = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    setInitialLoading(false);
    setError(null);
    setView('success');
  }, []);

  const markFailed = useCallback((message) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setInitialLoading(false);
    setView('error');
    setError(message || 'התשלום נכשל. אנא נסה שנית.');
  }, []);

  const checkStatusOnce = useCallback(async () => {
    if (!uniqueId || settledRef.current) return null;
    try {
      // REST status is easy to spot in DevTools Network (not only GraphQL).
      const response = await fetch(paymentStatusUrl(uniqueId), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.status || null;
    } catch (statusError) {
      console.warn('[Payment] Status check failed:', statusError?.message);
      return null;
    }
  }, [uniqueId]);

  // Silent backup while checkout is open — postMessage can miss on web iframes.
  useEffect(() => {
    if (!visible || !uniqueId || view === 'success' || view === 'error') {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      const status = await checkStatusOnce();
      if (cancelled || settledRef.current) return;
      if (status === 'completed') {
        markConfirmed();
      }
    };

    // First check after a short delay so createPaymentSession finishes storing the session.
    const first = setTimeout(poll, 1500);
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [visible, uniqueId, view, checkStatusOnce, markConfirmed]);

  const handleGatewayMessage = useCallback((payload) => {
    if (!payload) return;
    const type = typeof payload === 'string' ? payload : payload.type;
    if (type === 'payment_success') {
      markConfirmed();
    } else if (type === 'payment_cancel') {
      onCancel?.();
    } else if (type === 'payment_failure') {
      markFailed('התשלום נכשל. אנא נסה שנית.');
    }
  }, [markConfirmed, markFailed, onCancel]);

  const handleMessage = useCallback((event) => {
    try {
      handleGatewayMessage(JSON.parse(event.nativeEvent.data));
    } catch (e) {
      handleGatewayMessage(event.nativeEvent.data);
    }
  }, [handleGatewayMessage]);

  const handleNavigationStateChange = useCallback((navState) => {
    const url = navState?.url || '';
    if (url.includes('/api/payment/success') || url.includes('/payment/success')) {
      // Keep checkout visible; silent poll will flip to success once DB is ready.
      checkStatusOnce().then((status) => {
        if (status === 'completed') markConfirmed();
      });
      return false;
    }
    if (url.includes('/payment/cancel')) {
      onCancel?.();
      return false;
    }
    if (url.includes('/payment/failure') || url.includes('/api/payment/failure')) {
      markFailed('התשלום נכשל. אנא נסה שנית.');
      return false;
    }
    return true;
  }, [checkStatusOnce, markConfirmed, markFailed, onCancel]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return undefined;

    const handleWindowMessage = (event) => {
      handleGatewayMessage(event?.data);
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [visible, handleGatewayMessage]);

  const handleContinue = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  const onCheckoutLoadStart = useCallback(() => {
    if (!initialLoadDoneRef.current) {
      setInitialLoading(true);
    }
  }, []);

  const onCheckoutLoadEnd = useCallback(() => {
    initialLoadDoneRef.current = true;
    setInitialLoading(false);
    // After Hyp redirects the iframe to our success URL, try a quiet status check.
    if (uniqueId && !settledRef.current) {
      checkStatusOnce().then((status) => {
        if (status === 'completed') markConfirmed();
      });
    }
  }, [uniqueId, checkStatusOnce, markConfirmed]);

  const renderNativeContent = () => {
    if (!WebView) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>WebView לא נתמך בפלטפורמה זו</Text>
        </View>
      );
    }

    return (
      <WebView
        ref={webViewRef}
        source={{ uri: sessionUrl }}
        style={styles.webView}
        onLoadStart={onCheckoutLoadStart}
        onLoadEnd={onCheckoutLoadEnd}
        onError={(e) => {
          console.error('[Payment] WebView error:', e.nativeEvent);
          setError('שגיאה בטעינת עמוד התשלום');
          setInitialLoading(false);
        }}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        injectedJavaScript={`
          (function() {
            window.addEventListener('message', function(event) {
              try {
                window.ReactNativeWebView.postMessage(
                  typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
                );
              } catch (e) {}
            });
          })();
          true;
        `}
      />
    );
  };

  const renderWebContent = () => {
    return (
      <View style={styles.iframeContainer}>
        <iframe
          src={sessionUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 8,
          }}
          title="Hyp Payment"
          allow="payment *"
          onLoad={onCheckoutLoadEnd}
          onError={() => {
            setError('שגיאה בטעינת עמוד התשלום');
            setInitialLoading(false);
          }}
        />
      </View>
    );
  };

  const renderSuccess = () => (
    <View style={styles.resultContainer}>
      <View style={styles.successBadge} accessibilityLabel="התשלום אושר">
        <Text style={styles.successCheck}>✓</Text>
      </View>
      <Text style={styles.resultTitle}>התשלום בוצע בהצלחה</Text>
      <Text style={styles.resultSubtitle}>
        הרכישה נרשמה בחשבון שלך. אפשר להמשיך ליומן ולהירשם לשיעורים.
      </Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="המשך ליומן"
      >
        <Text style={styles.continueButtonText}>המשך ליומן</Text>
      </TouchableOpacity>
    </View>
  );

  const showCheckout = view === 'checkout';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={view === 'success' ? handleContinue : onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          {view === 'success' ? (
            <View style={styles.placeholder} />
          ) : (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="סגירת תשלום"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {view === 'success' ? 'רכישה הושלמה' : 'תשלום מאובטח'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {showCheckout && (
          <View style={styles.securityMessageContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.securityMessage}>{securityMessage}</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          {view === 'success' ? (
            renderSuccess()
          ) : view === 'error' || error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  settledRef.current = false;
                  initialLoadDoneRef.current = false;
                  openedAtRef.current = Date.now();
                  setError(null);
                  setView('checkout');
                  setInitialLoading(true);
                  if (webViewRef.current) {
                    webViewRef.current.reload();
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="נסה שנית"
              >
                <Text style={styles.retryButtonText}>נסה שנית</Text>
              </TouchableOpacity>
            </View>
          ) : sessionUrl ? (
            Platform.OS === 'web' ? renderWebContent() : renderNativeContent()
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>לא נמצא קישור לתשלום</Text>
            </View>
          )}

          {showInitialLoader && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4E0D66" />
              <Text style={styles.loadingText}>טוען עמוד תשלום...</Text>
            </View>
          )}
        </View>

        {view !== 'success' && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="ביטול"
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFD1E3',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#4E0D66',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4E0D66',
  },
  placeholder: {
    width: 44,
  },
  securityMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FFF4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C6F6D5',
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityMessage: {
    flex: 1,
    fontSize: 12,
    color: '#2D5A27',
    textAlign: 'right',
    lineHeight: 18,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  iframeContainer: {
    flex: 1,
    padding: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4E0D66',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4E0D66',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 8,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFF',
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCheck: {
    fontSize: 36,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#4E0D66',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.85,
  },
  continueButton: {
    backgroundColor: '#4E0D66',
    minHeight: 48,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  continueButtonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default PaymentModal;
