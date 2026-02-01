import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTS } from '../../utils/constants';
import { CREATE_PAYMENT_SESSION } from '../../services/graphql/mutations';
import { GET_MY_TRANSACTIONS } from '../../services/graphql/queries';
import ProductCard from '../../components/ProductCard';
import PaymentModal from '../../components/PaymentModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';

const ProductsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, transactions, updateTransactions } = useAuth();
  const [purchasingProductId, setPurchasingProductId] = useState(null);
  
  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentSessionUrl, setPaymentSessionUrl] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);

  // Refetch transactions query
  const { refetch: refetchTransactions } = useQuery(GET_MY_TRANSACTIONS, {
    skip: true, // Don't fetch on mount
  });

  // Create payment session mutation
  const [createPaymentSession] = useMutation(CREATE_PAYMENT_SESSION, {
    onCompleted: (data) => {
      if (data?.createPaymentSession) {
        console.log('[Products] Payment session created:', data.createPaymentSession);
        setPaymentSessionUrl(data.createPaymentSession.sessionUrl);
        setIsRecurring(data.createPaymentSession.isRecurring);
        setPaymentModalVisible(true);
      }
    },
    onError: (error) => {
      console.error('[Products] Create payment session error:', error);
      showErrorToast(getGraphQLErrorMessage(error));
      setPurchasingProductId(null);
      setCurrentProduct(null);
    },
  });

  // Handle purchase - initiate payment flow
  const handlePurchase = async (product) => {
    if (!user) {
      showErrorToast('יש להתחבר כדי לבצע רכישה');
      return;
    }

    console.log('[Products] Starting purchase for product:', product.id);
    setPurchasingProductId(product.id);
    setCurrentProduct(product);

    try {
      await createPaymentSession({
        variables: {
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            type: product.type,
            price: product.price,
            monthlyEntries: product.monthlyEntries || null,
            totalEntries: product.totalEntries || null,
          },
        },
      });
    } catch (error) {
      console.error('[Products] Purchase failed:', error);
      setPurchasingProductId(null);
      setCurrentProduct(null);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    console.log('[Products] Payment success!');
    setPaymentModalVisible(false);
    setPaymentSessionUrl(null);
    setPurchasingProductId(null);
    
    // Refetch transactions to get the new one
    try {
      const { data } = await refetchTransactions();
      if (data?.myTransactions) {
        updateTransactions(data.myTransactions);
      }
    } catch (error) {
      console.warn('[Products] Failed to refetch transactions:', error);
    }
    
    showSuccessToast('הרכישה בוצעה בהצלחה! 🎉');
    setCurrentProduct(null);
  }, [refetchTransactions, updateTransactions]);

  // Handle payment cancel
  const handlePaymentCancel = useCallback(() => {
    console.log('[Products] Payment cancelled');
    setPaymentModalVisible(false);
    setPaymentSessionUrl(null);
    setPurchasingProductId(null);
    setCurrentProduct(null);
    showErrorToast('התשלום בוטל');
  }, []);

  // Handle payment modal close
  const handlePaymentClose = useCallback(() => {
    console.log('[Products] Payment modal closed');
    setPaymentModalVisible(false);
    setPaymentSessionUrl(null);
    setPurchasingProductId(null);
    setCurrentProduct(null);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - Studio Buda */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>סטודיו בודה</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Products Section Title */}
        <View style={styles.productsTitleContainer}>
          <Text style={styles.title}>רכישות</Text>
          <Text style={styles.subtitle}>בחרו את המנוי או הכרטיסייה המתאימה לכם</Text>
        </View>

        {/* Products List */}
        <View style={styles.productsList}>
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPurchase={() => handlePurchase(product)}
              isPurchasing={purchasingProductId === product.id}
            />
          ))}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentModalVisible}
        sessionUrl={paymentSessionUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        onClose={handlePaymentClose}
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
    backgroundColor: '#FFD1E3', // Pink header background
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple
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
    paddingBottom: 120, // Space for bottom navigation
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
    color: '#FFD1E3', // Pink text
    textAlign: 'center',
    textShadowColor: 'rgba(78, 13, 102, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD1E3', // Pink text
    textAlign: 'center',
    opacity: 0.9,
  },
  productsList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});

export default ProductsScreen;
