import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== 'web') {
  // Dynamic import for native platforms
  WebView = require('react-native-webview').WebView;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PaymentModal Component
 * 
 * Displays ZCredit payment page in an iframe/WebView for secure payment entry.
 * 
 * Props:
 * - visible: boolean - Whether modal is visible
 * - sessionUrl: string - ZCredit checkout URL to load
 * - onSuccess: function - Called when payment succeeds
 * - onCancel: function - Called when user cancels
 * - onClose: function - Called to close the modal
 * - isRecurring: boolean - Whether this is a subscription payment
 */
const PaymentModal = ({
  visible,
  sessionUrl,
  onSuccess,
  onCancel,
  onClose,
  isRecurring = false,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);

  // Security message in Hebrew
  const securityMessage = isRecurring
    ? 'פרטי התשלום שלך לא נשמרים אצלנו.\nהתשלום מבוצע באמצעות ZCredit בצורה מאובטחת.\nהחיובים החודשיים יבוצעו דרך MAX.'
    : 'פרטי התשלום שלך לא נשמרים אצלנו.\nהתשלום מבוצע באמצעות ZCredit בצורה מאובטחת.';

  // Handle WebView messages (for success/cancel detection)
  const handleMessage = useCallback((event) => {
    console.log('[Payment] Received message from WebView:', event.nativeEvent.data);
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'payment_success') {
        console.log('[Payment] Payment success detected');
        onSuccess?.();
      } else if (data.type === 'payment_cancel') {
        console.log('[Payment] Payment cancelled');
        onCancel?.();
      }
    } catch (e) {
      // Not JSON, might be a string message
      if (event.nativeEvent.data === 'payment_success') {
        onSuccess?.();
      } else if (event.nativeEvent.data === 'payment_cancel') {
        onCancel?.();
      }
    }
  }, [onSuccess, onCancel]);

  // Handle URL navigation to detect success/cancel pages
  const handleNavigationStateChange = useCallback((navState) => {
    console.log('[Payment] Navigation state change:', navState.url);
    
    // Check if navigated to success URL
    if (navState.url.includes('/payment/success')) {
      console.log('[Payment] Detected success URL');
      onSuccess?.();
      return false;
    }
    
    // Check if navigated to cancel URL
    if (navState.url.includes('/payment/cancel')) {
      console.log('[Payment] Detected cancel URL');
      onCancel?.();
      return false;
    }
    
    // Check if navigated to failure URL
    if (navState.url.includes('/payment/failure')) {
      console.log('[Payment] Detected failure URL');
      setError('התשלום נכשל. אנא נסה שנית.');
      return false;
    }
    
    return true;
  }, [onSuccess, onCancel]);

  // Render WebView for native platforms
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
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          console.error('[Payment] WebView error:', e.nativeEvent);
          setError('שגיאה בטעינת עמוד התשלום');
          setLoading(false);
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
        // Inject JS to detect payment completion
        injectedJavaScript={`
          (function() {
            // Listen for custom events from ZCredit
            window.addEventListener('message', function(event) {
              window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
            });
            
            // Monitor for success/cancel elements
            const observer = new MutationObserver(function() {
              const successElement = document.querySelector('.payment-success');
              const cancelElement = document.querySelector('.payment-cancel');
              
              if (successElement) {
                window.ReactNativeWebView.postMessage('payment_success');
              } else if (cancelElement) {
                window.ReactNativeWebView.postMessage('payment_cancel');
              }
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
          })();
          true;
        `}
      />
    );
  };

  // Render iframe for web platform
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
          title="ZCredit Payment"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('שגיאה בטעינת עמוד התשלום');
            setLoading(false);
          }}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>תשלום מאובטח</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Security Message */}
        <View style={styles.securityMessageContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.securityMessage}>{securityMessage}</Text>
        </View>

        {/* Payment Content */}
        <View style={styles.contentContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  if (webViewRef.current) {
                    webViewRef.current.reload();
                  }
                }}
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

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4E0D66" />
              <Text style={styles.loadingText}>טוען עמוד תשלום...</Text>
            </View>
          )}
        </View>

        {/* Cancel Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>ביטול</Text>
          </TouchableOpacity>
        </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 40,
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
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default PaymentModal;
