import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TRANSACTION_TYPES } from '../utils/constants';

const ProductCard = ({ product, onPress }) => {
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.type}>{getProductTypeLabel(product.type)}</Text>
      </View>

      {product.description && <Text style={styles.description}>{product.description}</Text>}

      <View style={styles.footer}>
        <Text style={styles.linkText}>לחץ לרכישה →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  type: {
    fontSize: 12,
    color: '#6200ee',
    backgroundColor: '#e0d4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  footer: {
    alignItems: 'flex-end',
  },
  linkText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductCard;









