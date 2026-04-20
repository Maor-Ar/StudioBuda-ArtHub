import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import RevealOnView from './RevealOnView';
import TooltipIcon from './TooltipIcon';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const clampBars = (items, maxBars) => {
  if (!Array.isArray(items)) return [];
  return items.slice(Math.max(0, items.length - maxBars));
};

const BarChartCard = ({
  title,
  data = [],
  keys = [{ key: 'count', label: 'כמות', color: '#AB5FBD' }],
  height = 180,
  showValuesAbove = false,
  maxBars = 6,
  infoText,
}) => {
  const rows = clampBars(data, maxBars);
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => keys.map((k) => Number(row?.[k.key] || 0)))
  );
  const chartPaddingTop = 24;
  const chartPaddingBottom = 34;
  const chartAreaHeight = height - chartPaddingTop - chartPaddingBottom;
  const groupWidth = 56;
  const barInnerGap = 4;
  const barWidth = Math.max(8, Math.floor((groupWidth - barInnerGap * (keys.length + 1)) / keys.length));
  const width = Math.max(320, rows.length * groupWidth + 16);

  return (
    <RevealOnView>
      {({ progress }) => (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TooltipIcon text={infoText} />
          </View>
          {keys.length > 1 ? (
            <View style={styles.legendRow}>
              {keys.map((k) => (
                <View key={k.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: k.color }]} />
                  <Text style={styles.legendText}>{k.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={width} height={height}>
              {rows.map((row, rowIdx) => {
                const groupX = 8 + rowIdx * groupWidth;
                return (
                  <React.Fragment key={`${row.monthKey || rowIdx}`}>
                    {keys.map((k, keyIdx) => {
                      const value = Number(row?.[k.key] || 0);
                      const targetBarHeight = (value / maxValue) * chartAreaHeight;
                      const animatedBarHeight = progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, targetBarHeight],
                      });
                      const x = groupX + barInnerGap + keyIdx * (barWidth + barInnerGap);
                      const animatedY = Animated.subtract(chartPaddingTop + chartAreaHeight, animatedBarHeight);
                      return (
                        <React.Fragment key={`${k.key}-${rowIdx}`}>
                          <AnimatedRect
                            x={x}
                            y={animatedY}
                            width={barWidth}
                            height={animatedBarHeight}
                            rx={5}
                            fill={k.color}
                          />
                          {showValuesAbove ? (
                            <AnimatedSvgText
                              x={x + barWidth / 2}
                              y={Math.max(10, chartPaddingTop + (chartAreaHeight - targetBarHeight) - 4)}
                              fontSize={10}
                              fill="#FFE2ED"
                              textAnchor="middle"
                              opacity={progress}
                            >
                              {value}
                            </AnimatedSvgText>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                    <SvgText
                      x={groupX + groupWidth / 2}
                      y={height - 10}
                      fontSize={10}
                      fill="#D4B8E0"
                      textAnchor="middle"
                    >
                      {String(row.monthLabel || '').split(' ')[0]}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </ScrollView>
        </View>
      )}
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
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#D4B8E0',
    fontSize: 11,
  },
});

export default BarChartCard;
