import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTS } from '../../utils/constants';
import { CREATE_TRANSACTION } from '../../services/graphql/mutations';
import ProductCard from '../../components/ProductCard';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';

const ProductsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, transactions, updateTransactions } = useAuth();
  const [purchasingProductId, setPurchasingProductId] = useState(null);

  const [createTransaction] = useMutation(CREATE_TRANSACTION, {
    onCompleted: (data) => {
      if (data?.createTransaction) {
        // Update context with new transaction (merge with existing)
        const updatedTransactions = [...(transactions || []), data.createTransaction];
        updateTransactions(updatedTransactions);
        showSuccessToast('הרכישה בוצעה בהצלחה!');
        setPurchasingProductId(null);
      }
    },
    onError: (error) => {
      console.error('Purchase error:', error);
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
      const input = {
        transactionType: product.type,
        amount: product.price,
        invoiceId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      // Add type-specific fields
      if (product.type === 'subscription') {
        input.monthlyEntries = product.monthlyEntries;
      } else if (product.type === 'punch_card') {
        input.totalEntries = product.totalEntries;
      }

      await createTransaction({
        variables: { input },
      });
    } catch (error) {
      console.error('Purchase failed:', error);
      setPurchasingProductId(null);
    }
  };

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
