import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import RevealOnView from './RevealOnView';
import TooltipIcon from './TooltipIcon';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PieChartCard = ({ title, items = [], infoText }) => {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let progressOffset = 0;

  return (
    <RevealOnView>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <TooltipIcon text={infoText} />
        </View>
        <View style={styles.contentRow}>
          <View style={styles.legendCol}>
            {items.map((item) => (
              <View key={item.key} style={styles.legendItemWrap}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {item.label}: {item.value}
                  </Text>
                  {item.fullLabel && item.fullLabel !== item.label ? (
                    <TooltipIcon text={item.fullLabel} label="ⓘ" maxWidth={220} />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.chartWrap}>
            <Svg width={120} height={120}>
              <Circle cx={60} cy={60} r={RADIUS} stroke="rgba(255, 209, 227, 0.25)" strokeWidth={16} fill="none" />
              {items.map((item) => {
                const value = Number(item.value || 0);
                const pct = total > 0 ? value / total : 0;
                const segmentLength = pct * CIRCUMFERENCE;
                const currentOffset = progressOffset;
                progressOffset += segmentLength;
                return (
                  <Circle
                    key={item.key}
                    cx={60}
                    cy={60}
                    r={RADIUS}
                    stroke={item.color}
                    strokeWidth={16}
                    fill="none"
                    strokeDasharray={`${segmentLength} ${CIRCUMFERENCE - segmentLength}`}
                    strokeDashoffset={-currentOffset}
                    transform="rotate(-90 60 60)"
                    strokeLinecap="butt"
                  />
                );
              })}
            </Svg>
            <Text style={styles.totalText}>{total}</Text>
          </View>
        </View>
      </View>
    </RevealOnView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 209, 227, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.3)',
    borderRadius: 16,
    padding: 12,
  },
  title: {
    color: '#FFE2ED',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  contentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  chartWrap: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalText: {
    position: 'absolute',
    color: '#FFE2ED',
    fontSize: 18,
    fontWeight: '700',
  },
  legendCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  legendItemWrap: {
    alignItems: 'flex-end',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#D4B8E0',
    fontSize: 12,
    textAlign: 'right',
  },
});

export default PieChartCard;
