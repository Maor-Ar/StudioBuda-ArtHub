import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { CREATE_PAYMENT_SESSION } from '../../services/graphql/mutations';
import { GET_ME, GET_MY_TRANSACTIONS, GET_PRODUCTS } from '../../services/graphql/queries';
import ProductCard from '../../components/ProductCard';
import PaymentModal from '../../components/PaymentModal';
import { showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';
import { useShouldShowLocalLoader } from '../../context/LoadingContext';

const ProductsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updateUser, updateTransactions } = useAuth();
  const [purchasingProductId, setPurchasingProductId] = useState(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentSessionUrl, setPaymentSessionUrl] = useState(null);
  const [paymentUniqueId, setPaymentUniqueId] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);

  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(GET_PRODUCTS, {
    skip: !user,
    fetchPolicy: 'network-only',
  });
  const showProductsLoading = useShouldShowLocalLoader(productsLoading);

  const { refetch: refetchTransactions } = useQuery(GET_MY_TRANSACTIONS, {
    skip: true,
  });
  const [fetchMe] = useLazyQuery(GET_ME, { fetchPolicy: 'network-only' });

  const [createPaymentSession] = useMutation(CREATE_PAYMENT_SESSION, {
    onCompleted: (data) => {
      if (data?.createPaymentSession) {
        setPaymentSessionUrl(data.createPaymentSession.sessionUrl);
        setPaymentUniqueId(data.createPaymentSession.uniqueId);
        setIsRecurring(data.createPaymentSession.isRecurring);
        setPaymentModalVisible(true);
      }
    },
    onError: (error) => {
      console.error('[Products] Create payment session error:', error);
      showErrorToast(getGraphQLErrorMessage(error));
      setPurchasingProductId(null);
    },
  });

  const handlePurchase = async (product) => {
    if (!user) {
      showErrorToast('יש להתחבר כדי לבצע רכישה');
      return;
    }

    setPurchasingProductId(product.id);

    try {
      await createPaymentSession({
        variables: { productId: product.id },
      });
    } catch (error) {
      console.error('[Products] Purchase failed:', error);
      setPurchasingProductId(null);
    }
  };

  const closePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
    setPaymentSessionUrl(null);
    setPaymentUniqueId(null);
    setPurchasingProductId(null);
  }, []);

  const handlePaymentSuccess = useCallback(async () => {
    closePaymentModal();

    try {
      const [{ data: txData }, meResult] = await Promise.all([
        refetchTransactions(),
        fetchMe(),
      ]);
      if (txData?.myTransactions) {
        updateTransactions(txData.myTransactions);
      }
      if (meResult?.data?.me) {
        updateUser(meResult.data.me);
      }
    } catch (error) {
      console.warn('[Products] Failed to refresh purchase data:', error);
    }

    navigation.navigate('Calendar');
  }, [closePaymentModal, fetchMe, navigation, refetchTransactions, updateTransactions, updateUser]);

  const handlePaymentCancel = useCallback(() => {
    closePaymentModal();
    showErrorToast('התשלום בוטל');
  }, [closePaymentModal]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>סטודיו בודה</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.productsTitleContainer}>
          <Text style={styles.title}>רכישות</Text>
          <Text style={styles.subtitle}>בחרו את המנוי או הכרטיסייה המתאימה לכם</Text>
        </View>

        <View style={styles.productsList}>
          {!user ? (
            <Text style={styles.errorText}>יש להתחבר כדי לצפות במוצרים ולבצע רכישה.</Text>
          ) : productsLoading ? (
            showProductsLoading ? (
            <ActivityIndicator size="large" color="#FFD1E3" style={{ marginTop: 24 }} />
            ) : null
          ) : productsError ? (
            <Text style={styles.errorText}>לא ניתן לטעון מוצרים. נסו שוב מאוחר יותר.</Text>
          ) : (
            (productsData?.products || []).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPurchase={() => handlePurchase(product)}
                isPurchasing={purchasingProductId === product.id}
              />
            ))
          )}
        </View>
      </ScrollView>

      <PaymentModal
        visible={paymentModalVisible}
        sessionUrl={paymentSessionUrl}
        uniqueId={paymentUniqueId}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        onClose={closePaymentModal}
        isRecurring={isRecurring}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFD1E3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  productsTitleContainer: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFD1E3',
    textAlign: 'center',
    textShadowColor: 'rgba(78, 13, 102, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD1E3',
    textAlign: 'center',
    opacity: 0.9,
  },
  productsList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  errorText: {
    textAlign: 'center',
    color: '#FFD1E3',
    marginTop: 24,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});

export default ProductsScreen;
