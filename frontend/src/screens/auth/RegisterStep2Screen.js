import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { REGISTER } from '../../services/graphql/mutations';
import { validateName, validatePhone, validatePassword, validatePasswordMatch } from '../../utils/validation';
import { getGraphQLErrorMessage, SUCCESS_MESSAGES } from '../../utils/errorMessages';
import { showErrorToast, showSuccessToast } from '../../utils/toast';

const RegisterStep2Screen = ({ navigation, route }) => {
  const email = route?.params?.email || '';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field-level errors
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const { login } = useAuth();

  const [registerMutation, { loading }] = useMutation(REGISTER, {
    onCompleted: async (data) => {
      try {
        await login(data.register.token, data.register.user, data.register.activeTransactions || []);
        showSuccessToast(SUCCESS_MESSAGES.REGISTER_SUCCESS);
      } catch (error) {
        showErrorToast('נכשל בשמירת נתוני ההרשמה');
      }
    },
    onError: (error) => {
      const friendlyMessage = getGraphQLErrorMessage(error);
      showErrorToast(friendlyMessage);
    },
  });

  /**
   * Clears error for a specific field when user starts typing
   */
  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  /**
   * Handles first name input change
   */
  const handleFirstNameChange = (text) => {
    setFirstName(text);
    clearFieldError('firstName');
  };

  /**
   * Handles last name input change
   */
  const handleLastNameChange = (text) => {
    setLastName(text);
    clearFieldError('lastName');
  };

  /**
   * Handles phone input change
   */
  const handlePhoneChange = (text) => {
    setPhone(text);
    clearFieldError('phone');
  };

  /**
   * Handles password input change
   */
  const handlePasswordChange = (text) => {
    setPassword(text);
    clearFieldError('password');
  };

  /**
   * Handles confirm password input change
   */
  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    clearFieldError('confirmPassword');
  };

  /**
   * Validates all fields before submission
   */
  const validateAllFields = () => {
    const newErrors = {};
    let isValid = true;

    // Validate first name
    const firstNameValidation = validateName(firstName, 'שם פרטי');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error;
      isValid = false;
    }

    // Validate last name
    const lastNameValidation = validateName(lastName, 'שם משפחה');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error;
      isValid = false;
    }

    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error;
      isValid = false;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
      isValid = false;
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordMatch(password, confirmPassword);
    if (!confirmValidation.isValid) {
      newErrors.confirmPassword = confirmValidation.error;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handles registration submission
   */
  const handleRegister = async () => {
    // Validate all fields
    const isValid = validateAllFields();

    if (!isValid) {
      // Show first error in toast
      const firstError = Object.values(errors).find((err) => err);
      if (firstError) {
        showErrorToast(firstError);
      }
      return;
    }

    try {
      await registerMutation({
        variables: {
          input: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password,
          },
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>השלמת הרשמה</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>אנא מלא את הפרטים הבאים</Text>

        {/* First Name Input */}
        <TextInput
          style={[styles.input, errors.firstName && styles.inputError]}
          placeholder="שם פרטי"
          placeholderTextColor="#4E0D66"
          value={firstName}
          onChangeText={handleFirstNameChange}
          autoCapitalize="words"
          textAlign="right"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
        />
        {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

        {/* Last Name Input */}
        <TextInput
          style={[styles.input, errors.lastName && styles.inputError]}
          placeholder="שם משפחה"
          placeholderTextColor="#4E0D66"
          value={lastName}
          onChangeText={handleLastNameChange}
          autoCapitalize="words"
          textAlign="right"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
        />
        {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

        {/* Phone Input */}
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="טלפון"
          placeholderTextColor="#4E0D66"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          textAlign="right"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

        {/* Email Input (Read-only) */}
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="אימייל"
          placeholderTextColor="#4E0D66"
          value={email}
          editable={false}
          textAlign="right"
          autoComplete="off"
        />

        {/* Password Input */}
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="סיסמה"
          placeholderTextColor="#4E0D66"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          textAlign="right"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
        />
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        {/* Confirm Password Input */}
        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          placeholder="אימות סיסמה"
          placeholderTextColor="#4E0D66"
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          secureTextEntry
          textAlign="right"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
        />
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        ) : null}

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'נרשם...' : 'סיום הרשמה'}
          </Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
          <Text style={styles.linkText}>חזרה</Text>
        </TouchableOpacity>

        {/* Home Indicator */}
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#AB5FBD',
    paddingTop: 60,
    paddingHorizontal: 26,
    paddingBottom: 50,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD1E3',
    textAlign: 'center',
    marginBottom: 7,
    textShadowColor: 'rgba(78, 13, 102, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFD1E3',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 44,
    backgroundColor: '#FFD1E3',
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 4,
    color: '#4E0D66',
    fontSize: 16,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  inputError: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: '#E8B4D6',
  },
  errorText: {
    color: '#FFD1E3',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 10,
    textAlign: 'right',
    textShadowColor: 'rgba(78, 13, 102, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    width: '100%',
    height: 44,
    backgroundColor: '#4E0D66',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  homeIndicator: {
    marginTop: 30,
    alignItems: 'center',
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: '#000000',
    borderRadius: 100,
  },
});

export default RegisterStep2Screen;
