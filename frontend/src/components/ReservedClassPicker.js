import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_WEEKLY_SUBSCRIPTION_CLASSES } from '../services/graphql/queries';

const WEEKDAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const formatTime = (time) => (time ? String(time).substring(0, 5) : '');

const ReservedClassPicker = ({ visible, onClose, onSelect, confirmLabel = 'המשך לתשלום' }) => {
  const [selectedId, setSelectedId] = useState(null);
  const { data, loading, error } = useQuery(GET_WEEKLY_SUBSCRIPTION_CLASSES, {
    skip: !visible,
    fetchPolicy: 'network-only',
  });

  const groups = useMemo(() => {
    const classes = data?.weeklySubscriptionClasses || [];
    const buckets = WEEKDAY_LABELS.map((label, weekday) => ({ weekday, label, items: [] }));
    classes.forEach((item) => {
      const weekday = Number(item.weekday);
      const bucket = buckets[weekday] || buckets[0];
      bucket.items.push(item);
    });
    buckets.forEach((bucket) => {
      bucket.items.sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
    });
    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [data]);

  const confirm = () => {
    const match = (data?.weeklySubscriptionClasses || []).find((item) => item.id === selectedId);
    if (!match) return;
    if (Number(match.reservedRegularCount) >= Number(match.maxRegistrations)) return;
    onSelect?.(match);
    setSelectedId(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>בחירת שיעור קבוע</Text>
          <Text style={styles.subtitle}>המנוי שומר מקום בשיעור שבועי אחד, לכל המפגשים בתקופה ששולמה.</Text>
          {loading ? (
            <ActivityIndicator color="#AB5FBD" style={{ marginVertical: 24 }} />
          ) : error ? (
            <Text style={styles.empty}>לא ניתן לטעון את השיעורים. נסו שוב.</Text>
          ) : groups.length === 0 ? (
            <Text style={styles.empty}>אין כרגע שיעורי מנוי שבועיים פעילים.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {groups.map((group) => (
                <View key={group.weekday} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>יום {group.label}</Text>
                  {group.items.map((item) => {
                    const full = Number(item.reservedRegularCount) >= Number(item.maxRegistrations);
                    const selected = selectedId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.row, selected && styles.rowSelected, full && styles.rowFull]}
                        disabled={full}
                        onPress={() => setSelectedId(item.id)}
                      >
                        <Text style={[styles.rowTitle, full && styles.fullText]}>{item.title}</Text>
                        <Text style={[styles.rowMeta, full && styles.fullText]}>
                          {formatTime(item.startTime)} · {item.instructorName || 'מדריך/ה'}
                        </Text>
                        <Text style={[styles.rowMeta, full && styles.fullText]}>
                          קבועים {item.reservedRegularCount}/{item.maxRegistrations}
                        </Text>
                        {full ? (
                          <Text style={styles.fullNote}>אין מקום פנוי לקבועים בשיעור זה</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primary, !selectedId && styles.primaryDisabled]}
              disabled={!selectedId}
              onPress={confirm}
            >
              <Text style={styles.primaryText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(78, 13, 102, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '88%',
    backgroundColor: '#FFF8FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4E0D66',
    textAlign: 'right',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: '#7A4E86',
    textAlign: 'right',
    lineHeight: 20,
  },
  list: { maxHeight: 420 },
  listContent: { paddingBottom: 8 },
  dayBlock: { marginBottom: 14 },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#AB5FBD',
    textAlign: 'right',
    marginBottom: 6,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(171, 95, 189, 0.35)',
    padding: 12,
    marginBottom: 8,
  },
  rowSelected: {
    borderColor: '#4E0D66',
    backgroundColor: '#FFD1E3',
  },
  rowFull: {
    backgroundColor: '#F3F0F4',
    borderColor: '#D9D0DE',
    opacity: 0.7,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4E0D66',
    textAlign: 'right',
  },
  rowMeta: {
    marginTop: 2,
    color: '#6A4A7A',
    textAlign: 'right',
  },
  fullText: { color: '#8E8494' },
  fullNote: {
    marginTop: 6,
    color: '#8E8494',
    textAlign: 'right',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#6A4A7A',
    marginVertical: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primary: {
    flex: 1,
    backgroundColor: '#AB5FBD',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(171, 95, 189, 0.12)',
  },
  secondaryText: { color: '#4E0D66', fontWeight: '700' },
});

export default ReservedClassPicker;
