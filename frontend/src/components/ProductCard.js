import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TRANSACTION_TYPES } from '../utils/constants';

const ProductCard = ({ product, onPurchase, isPurchasing = false }) => {
  const [showTerms, setShowTerms] = useState(false);

  const getProductTypeLabel = (type) => {
    switch (type) {
      case TRANSACTION_TYPES.SUBSCRIPTION:
        return 'מנוי';
      case TRANSACTION_TYPES.PUNCH_CARD:
        return 'כרטיסייה';
      case TRANSACTION_TYPES.TRIAL_LESSON:
        return 'שיעור ניסיון';
      default:
        return type;
    }
  };

  const formatPrice = (price) => {
    return `${price}₪`;
  };

  const getFeatures = () => {
    if (product.type === TRANSACTION_TYPES.SUBSCRIPTION) {
      if (product.monthlyEntries === 99) {
        return 'כניסות ללא הגבלה';
      }
      return `${product.monthlyEntries} כניסות בחודש`;
    } else if (product.type === TRANSACTION_TYPES.PUNCH_CARD) {
      return `${product.totalEntries} כניסות • בתוקף ${product.validityMonths} חודשים`;
    }
    return product.description;
  };

  return (
    <View style={styles.card}>
      {/* Header with Type Badge */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{getProductTypeLabel(product.type)}</Text>
        </View>
      </View>

      {/* Product Name */}
      <Text style={styles.title}>{product.name}</Text>

      {/* Features */}
      <Text style={styles.features}>{getFeatures()}</Text>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
        onPress={onPurchase}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.purchaseButtonText}>רכישה</Text>
        )}
      </TouchableOpacity>

      {/* Terms Toggle */}
      <TouchableOpacity
        style={styles.termsToggle}
        onPress={() => setShowTerms(!showTerms)}
      >
        <Text style={styles.termsToggleText}>
          {showTerms ? 'הסתר תנאים' : 'תנאים והגבלות'}
        </Text>
        <Text style={styles.termsToggleIcon}>{showTerms ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Expandable Terms */}
      {showTerms && (
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>{product.terms}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // Solid white for maximum contrast
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFD1E3', // Pink border for visual interest and accessibility
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  typeBadge: {
    backgroundColor: '#5D3587', // Dark purple background
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD1E3', // Pink border for contrast
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF', // White text on dark purple for high contrast
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple for high contrast on white
    marginBottom: 10,
    textAlign: 'right',
    lineHeight: 32,
  },
  features: {
    fontSize: 17,
    color: '#5D3587', // Dark purple instead of gray for better contrast
    marginBottom: 20,
    textAlign: 'right',
    lineHeight: 24,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFD1E3', // Pink background for price
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5D3587', // Dark purple border for contrast
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple on pink - high contrast
    letterSpacing: 1,
  },
  purchaseButton: {
    backgroundColor: '#5D3587', // Dark purple background
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFD1E3', // Pink border for visual definition
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#8B6FA8', // Lighter purple when disabled
  },
  purchaseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text on dark purple - maximum contrast
    letterSpacing: 1,
  },
  termsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0', // Light gray border for separation
  },
  termsToggleText: {
    fontSize: 13,
    color: '#5D3587', // Dark purple instead of gray
    marginLeft: 6,
    fontWeight: '600',
  },
  termsToggleIcon: {
    fontSize: 12,
    color: '#5D3587', // Dark purple for visibility
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 2,
    borderTopColor: '#FFD1E3', // Pink border for visual separation
    backgroundColor: '#F9F9F9', // Light gray background for terms
    borderRadius: 12,
    padding: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#4E0D66', // Dark purple for readability
    lineHeight: 20,
    textAlign: 'right',
    fontWeight: '400',
  },
});

export default ProductCard;
