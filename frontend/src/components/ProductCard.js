import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { TRANSACTION_TYPES } from '../utils/constants';

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

const formatPrice = (price) => `${price}₪`;

const getFeatures = (product) => {
  if (product.subtitle && String(product.subtitle).trim()) {
    return String(product.subtitle).trim();
  }
  if (product.type === TRANSACTION_TYPES.SUBSCRIPTION) {
    if (product.monthlyEntries === 99) {
      return 'כניסות ללא הגבלה';
    }
    return `${product.monthlyEntries} כניסות בחודש`;
  }
  if (product.type === TRANSACTION_TYPES.PUNCH_CARD) {
    return `${product.totalEntries} כניסות • בתוקף ${product.validityMonths} חודשים`;
  }
  return '';
};

const ProductCard = ({ product, onPurchase, isPurchasing = false }) => {
  const [showTerms, setShowTerms] = useState(false);
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(0, width - 40 - 48);

  const features = useMemo(() => getFeatures(product), [product]);

  const termsSource = useMemo(() => {
    let html = product.termsHtml?.trim?.() || '';
    // react-native-web rejects CSS `direction`; render-html maps HTML dir= to it — strip and use textAlign instead
    html = html.replace(/\sdir\s*=\s*["'][^"']*["']/gi, '');
    if (html) return { html };
    return { html: '<p></p>' };
  }, [product.termsHtml]);

  const tagsStyles = useMemo(
    () => ({
      body: {
        fontSize: 12,
        color: '#4E0D66',
        lineHeight: 20,
        textAlign: 'right',
      },
      p: {
        marginTop: 0,
        marginBottom: 8,
        textAlign: 'right',
      },
    }),
    []
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{getProductTypeLabel(product.type)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{product.title}</Text>

      {features ? <Text style={styles.features}>{features}</Text> : null}

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
      </View>

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

      <TouchableOpacity style={styles.termsToggle} onPress={() => setShowTerms(!showTerms)}>
        <Text style={styles.termsToggleText}>
          {showTerms ? 'הסתר תנאים' : 'תנאים והגבלות'}
        </Text>
        <Text style={styles.termsToggleIcon}>{showTerms ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showTerms && (
        <View style={styles.termsContainer}>
          <RenderHTML
            contentWidth={contentWidth}
            source={termsSource}
            tagsStyles={tagsStyles}
            baseStyle={styles.termsText}
            defaultTextProps={{ selectable: true }}
          />
        </View>
      )}
    </View>
  );
};

const cardShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 6px 12px rgba(78, 13, 102, 0.25)' }
    : {
        shadowColor: '#4E0D66',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      };

const buttonShadow =
  Platform.OS === 'web'
    ? { boxShadow: '0 4px 8px rgba(78, 13, 102, 0.3)' }
    : {
        shadowColor: '#4E0D66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      };

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    ...cardShadow,
    borderWidth: 2,
    borderColor: '#FFD1E3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  typeBadge: {
    backgroundColor: '#5D3587',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD1E3',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4E0D66',
    marginBottom: 10,
    textAlign: 'right',
    lineHeight: 32,
  },
  features: {
    fontSize: 17,
    color: '#5D3587',
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
    backgroundColor: '#FFD1E3',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5D3587',
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4E0D66',
    letterSpacing: 1,
  },
  purchaseButton: {
    backgroundColor: '#5D3587',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    ...buttonShadow,
    borderWidth: 2,
    borderColor: '#FFD1E3',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#8B6FA8',
  },
  purchaseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  termsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  termsToggleText: {
    fontSize: 13,
    color: '#5D3587',
    marginLeft: 6,
    fontWeight: '600',
  },
  termsToggleIcon: {
    fontSize: 12,
    color: '#5D3587',
    fontWeight: 'bold',
  },
  termsContainer: {
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 2,
    borderTopColor: '#FFD1E3',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#4E0D66',
    lineHeight: 20,
    textAlign: 'right',
    fontWeight: '400',
    ...(Platform.OS === 'web' ? {} : { writingDirection: 'rtl' }),
  },
});

export default ProductCard;
