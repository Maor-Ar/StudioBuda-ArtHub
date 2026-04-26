import React, { useLayoutEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useMutation } from '@apollo/client';
import { RESET_PASSWORD } from '../../services/graphql/mutations';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';

function getTokenFromWebQuery() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  const p = new URLSearchParams(window.location.search);
  return p.get('token') || p.get('resetToken');
}

const ResetPasswordScreen = ({ navigation, route }) => {
  const fromQuery = getTokenFromWebQuery();
  const tokenFromParams = route?.params?.token;

  const [token, setToken] = useState(() => fromQuery || tokenFromParams || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /** True when the reset token comes from the email link (query or deep link), not manual entry. */
  const [fromEmailLink, setFromEmailLink] = useState(
    () => Boolean(fromQuery || tokenFromParams)
  );

  const [resetPasswordMutation, { loading }] = useMutation(RESET_PASSWORD, {
    onCompleted: () => {
      showSuccessToast('הסיסמה אופסה בהצלחה');
      navigation.navigate('Login');
    },
    onError: (error) => {
      showErrorToast(getGraphQLErrorMessage(error));
    },
  });

  useLayoutEffect(() => {
    const t = getTokenFromWebQuery() || route?.params?.token;
    if (t) {
      setFromEmailLink(true);
      setToken((prev) => prev || t);
    }
  }, [route?.params?.token]);

  const handleSubmit = async () => {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      showErrorToast(fromEmailLink ? 'קוד האיפוס חסר. נא לבקש קישור חדש.' : 'נא להזין קוד איפוס');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showErrorToast('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorToast('הסיסמאות אינן תואמות');
      return;
    }

    await resetPasswordMutation({
      variables: {
        input: {
          token: normalizedToken,
          newPassword,
        },
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>איפוס סיסמה</Text>
      <Text style={styles.subtitle}>
        {fromEmailLink
          ? 'הזינו סיסמה חדשה לאימות'
          : 'הזן/י את קוד האיפוס שקיבלת במייל וסיסמה חדשה'}
      </Text>

      {!fromEmailLink && (
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="קוד איפוס"
          placeholderTextColor="#7A5792"
          textAlign="right"
          autoCapitalize="none"
        />
      )}
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="סיסמה חדשה"
        placeholderTextColor="#7A5792"
        secureTextEntry
        textAlign="right"
      />
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="אימות סיסמה חדשה"
        placeholderTextColor="#7A5792"
        secureTextEntry
        textAlign="right"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.disabledBtn]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.primaryBtnText}>{loading ? 'שומר...' : 'עדכון סיסמה'}</Text>
      </TouchableOpacity>
      {!fromEmailLink && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryBtnText}>חזרה להתחברות</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AB5FBD',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#FFD1E3',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFE2ED',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#FFD1E3',
    borderRadius: 14,
    color: '#4E0D66',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#4E0D66',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFE2ED',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 209, 227, 0.25)',
  },
  secondaryBtnText: {
    color: '#FFE2ED',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

export default ResetPasswordScreen;
