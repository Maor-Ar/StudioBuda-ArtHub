import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RevealOnView from './RevealOnView';
import AnimatedNumber from './AnimatedNumber';
import TooltipIcon from './TooltipIcon';

const KpiCard = ({ title, value, subtitle, compact = false, decimals = 0, suffix = '', infoText }) => {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);

  return (
    <RevealOnView>
      {({ visible }) => (
        <View style={[styles.card, compact && styles.cardCompact]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TooltipIcon text={infoText} />
          </View>
          {isNumeric ? (
            <AnimatedNumber
              value={value}
              decimals={decimals}
              suffix={suffix}
              start={visible}
              style={[styles.value, compact && styles.valueCompact]}
            />
          ) : (
            <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
          )}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
    </RevealOnView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 209, 227, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
  },
  cardCompact: {
    minHeight: 96,
  },
  title: {
    color: '#FFD1E3',
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  value: {
    color: '#FFE2ED',
    fontSize: 31,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 6,
  },
  valueCompact: {
    fontSize: 24,
  },
  subtitle: {
    color: '#D4B8E0',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
});

export default KpiCard;
