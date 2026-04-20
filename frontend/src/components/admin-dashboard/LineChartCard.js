import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import RevealOnView from './RevealOnView';
import TooltipIcon from './TooltipIcon';

const buildPath = (points) => {
  if (!points.length) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
};

const LineChartCard = ({ title, data = [], ySuffix = '%', lineColor = '#AB5FBD', maxPoints = 10, infoText }) => {
  const rows = data.slice(0, maxPoints);
  const width = Math.max(320, rows.length * 54);
  const height = 180;
  const chartTop = 20;
  const chartBottom = 34;
  const chartHeight = height - chartTop - chartBottom;
  const maxValue = Math.max(1, ...rows.map((item) => Number(item.percentage || 0)));

  const points = rows.map((item, idx) => {
    const x = 12 + idx * 50;
    const y = chartTop + chartHeight - (Number(item.percentage || 0) / maxValue) * chartHeight;
    return { x, y, ...item };
  });

  const path = buildPath(points);

  return (
    <RevealOnView>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <TooltipIcon text={infoText} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={width} height={height}>
            {path ? <Path d={path} fill="none" stroke={lineColor} strokeWidth={3} /> : null}
            {points.map((point) => (
              <React.Fragment key={`${point.x}-${point.label}`}>
                <Circle cx={point.x} cy={point.y} r={4} fill={lineColor} />
                <SvgText x={point.x} y={Math.max(10, point.y - 8)} fontSize={10} fill="#FFE2ED" textAnchor="middle">
                  {`${Number(point.percentage || 0).toFixed(0)}${ySuffix}`}
                </SvgText>
                <SvgText x={point.x} y={height - 10} fontSize={10} fill="#D4B8E0" textAnchor="middle">
                  {point.label}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </ScrollView>
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
});

export default LineChartCard;
