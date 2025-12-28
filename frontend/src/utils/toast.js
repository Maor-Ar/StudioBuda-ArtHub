/**
 * Toast Notification Helper
 * Provides consistent, styled toast notifications throughout the app
 */

import Toast, { BaseToast } from 'react-native-toast-message';

/**
 * Shows a success toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults to empty)
 */
export const showSuccessToast = (message, title = '') => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    text2Style: {
      fontSize: 14,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });
};

/**
 * Shows an error toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults to empty)
 */
export const showErrorToast = (message, title = '') => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    text2Style: {
      fontSize: 14,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });
};

/**
 * Shows an info toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults to empty)
 */
export const showInfoToast = (message, title = '') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    text2Style: {
      fontSize: 14,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });
};

/**
 * Shows a warning toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults to empty)
 */
export const showWarningToast = (message, title = '') => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3500,
    autoHide: true,
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    text2Style: {
      fontSize: 14,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
  });
};

/**
 * Hides any visible toast
 */
export const hideToast = () => {
  Toast.hide();
};

/**
 * Custom toast configuration for the app's theme
 */
export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#4CAF50',
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        direction: 'rtl',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#4E0D66',
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: 14,
        color: '#4E0D66',
        textAlign: 'right',
      }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#F44336',
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        direction: 'rtl',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#4E0D66',
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: 14,
        color: '#4E0D66',
        textAlign: 'right',
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#2196F3',
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        direction: 'rtl',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#4E0D66',
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: 14,
        color: '#4E0D66',
        textAlign: 'right',
      }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#FF9800',
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 15,
        direction: 'rtl',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#4E0D66',
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: 14,
        color: '#4E0D66',
        textAlign: 'right',
      }}
    />
  ),
};
