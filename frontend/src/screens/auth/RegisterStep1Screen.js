import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { LOGIN_WITH_OAUTH } from '../../services/graphql/mutations';
import authService from '../../services/authService';
import { OAUTH_PROVIDERS } from '../../utils/constants';
import { validateEmail } from '../../utils/validation';
import { getOAuthErrorMessage } from '../../utils/errorMessages';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import AppleIcon from '../../assets/icons/Apple.svg';
import GoogleIcon from '../../assets/icons/Google.svg';
import FacebookIcon from '../../assets/icons/Facebook.svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RegisterStep1Screen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const { login } = useAuth();

  const [loginWithOAuthMutation] = useMutation(LOGIN_WITH_OAUTH, {
    onCompleted: async (data) => {
      try {
        await login(data.loginWithOAuth.token, data.loginWithOAuth.user);
        setOauthLoading(false);
        showSuccessToast('התחברת בהצלחה!');
      } catch (error) {
        setOauthLoading(false);
        showErrorToast('נכשל בשמירת נתוני הכניסה');
      }
    },
    onError: (error) => {
      setOauthLoading(false);
      const errorMessage = error.graphQLErrors?.[0]?.message || error.message || 'ההרשמה נכשלה';

      if (errorMessage.toLowerCase().includes('already exists')) {
        showErrorToast('כתובת האימייל כבר קיימת במערכת');
      } else if (errorMessage.toLowerCase().includes('server')) {
        showErrorToast('אופס, נראה שיש בעיה בשרת, תנסה שוב מאוחר יותר');
      } else {
        showErrorToast('משהו השתבש, נסה שוב');
      }
    },
  });

  const handleEmailChange = (text) => {
    setEmail(text);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const handleEmailContinue = () => {
    // Validate email
    const validation = validateEmail(email);

    if (!validation.isValid) {
      setEmailError(validation.error);
      showErrorToast(validation.error);
      return;
    }

    // Navigate to step 2 with email
    navigation.navigate('RegisterStep2', { email: email.trim().toLowerCase() });
  };

  const handleOAuth = async (provider) => {
    try {
      setOauthLoading(true);

      // Get OAuth token from the authentication service
      const oauthResult = await authService.getOAuthToken(provider);

      // Call the backend with the OAuth token
      await loginWithOAuthMutation({
        variables: {
          provider: oauthResult.provider,
          token: oauthResult.token,
        },
      });
    } catch (error) {
      setOauthLoading(false);
      console.error('OAuth error:', error);

      // Get friendly error message
      const friendlyError = getOAuthErrorMessage(error, provider);

      // Only show error if it's not a cancellation
      if (friendlyError) {
        showErrorToast(friendlyError);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>הרשמה</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>בואו ניצור לכם משתמש</Text>

      {/* Email Input */}
      <TextInput
        style={[styles.input, emailError && styles.inputError]}
        placeholder="אימייל"
        placeholderTextColor="#4E0D66"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign="right"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !email.trim() && styles.continueButtonDisabled]}
        onPress={handleEmailContinue}
        disabled={!email.trim()}
      >
        <Text style={styles.continueButtonText}>המשך</Text>
      </TouchableOpacity>

      {/* Or Separator */}
      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>או</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* OAuth Buttons */}
      <View style={styles.oauthContainer}>
        {/* Apple Button */}
        <TouchableOpacity
          style={styles.appleButton}
          onPress={() => handleOAuth(OAUTH_PROVIDERS.APPLE)}
          disabled={oauthLoading}
        >
          <AppleIcon width={20} height={20} style={styles.icon} />
          <Text style={styles.appleButtonText}>המשך עם אפל</Text>
        </TouchableOpacity>

        {/* Google Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => handleOAuth(OAUTH_PROVIDERS.GOOGLE)}
          disabled={oauthLoading}
        >
          <GoogleIcon width={20} height={20} style={styles.icon} />
          <Text style={styles.googleButtonText}>המשך עם גוגל</Text>
        </TouchableOpacity>

        {/* Facebook Button - Temporarily disabled */}
        {/* <TouchableOpacity
          style={styles.facebookButton}
          onPress={() => handleOAuth(OAUTH_PROVIDERS.FACEBOOK)}
          disabled={oauthLoading}
        >
          <FacebookIcon width={20} height={20} style={styles.icon} />
          <Text style={styles.facebookButtonText}>המשך עם פייסבוק</Text>
        </TouchableOpacity> */}
      </View>

        {/* Footer Link */}
        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.footerLinkText}>כבר יש לך חשבון? היכנס</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* OAuth Loading Overlay */}
      {oauthLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#AB5FBD" />
            <Text style={styles.loadingText}>מתחבר...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AB5FBD',
    paddingHorizontal: 26,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
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
  continueButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#4E0D66',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 28,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: '600',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginHorizontal: 9,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFD1E3',
  },
  separatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 10,
  },
  oauthContainer: {
    width: '100%',
  },
  appleButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#000000',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  appleButtonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  googleButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButtonText: {
    color: '#4E0D66',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  facebookButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#49A8FF',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  facebookButtonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
  footerLink: {
    marginTop: 30,
    alignSelf: 'center',
    marginBottom: 20,
  },
  footerLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#4E0D66',
    fontWeight: '600',
  },
});

export default RegisterStep1Screen;
