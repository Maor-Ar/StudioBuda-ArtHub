import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const EDITABLE_FIELDS = [
  'title',
  'description',
  'startTime',
  'duration',
  'instructorName',
  'maxRegistrations',
];

const toFormValues = (values = {}) => ({
  title: String(values.title ?? ''),
  description: String(values.description ?? ''),
  startTime: String(values.startTime ?? '').substring(0, 5),
  duration: String(values.duration ?? ''),
  instructorName: String(values.instructorName ?? ''),
  maxRegistrations: String(values.maxRegistrations ?? ''),
});

export const getEventEditChanges = (initialValues, currentValues) => {
  const initial = toFormValues(initialValues);
  const current = toFormValues(currentValues);
  const changes = {};

  EDITABLE_FIELDS.forEach((field) => {
    if (initial[field] === current[field]) return;
    if (field === 'duration' || field === 'maxRegistrations') {
      const parsed = parseInt(current[field], 10);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      changes[field] = parsed;
      return;
    }
    changes[field] = current[field];
  });

  return changes;
};

const EventEditModal = ({
  visible,
  initialValues,
  onSubmit,
  onClose,
  loading = false,
  title = 'עריכת שיעור',
}) => {
  const [form, setForm] = useState(toFormValues(initialValues));
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  useEffect(() => {
    if (visible) {
      setForm(toFormValues(initialValuesRef.current));
    }
  }, [visible]);

  const changes = getEventEditChanges(initialValues, form);
  const canSave = Object.keys(changes).length > 0 && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>שם השיעור</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
              placeholderTextColor="#B0A0B8"
            />

            <Text style={styles.label}>תיאור</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholderTextColor="#B0A0B8"
              multiline
            />

            <Text style={styles.label}>שעת התחלה (HH:mm)</Text>
            <TextInput
              style={styles.input}
              value={form.startTime}
              onChangeText={(value) => setForm((prev) => ({ ...prev, startTime: value }))}
              placeholder="18:00"
              placeholderTextColor="#B0A0B8"
            />

            <Text style={styles.label}>משך (דקות)</Text>
            <TextInput
              style={styles.input}
              value={form.duration}
              onChangeText={(value) => setForm((prev) => ({ ...prev, duration: value }))}
              keyboardType="numeric"
              placeholderTextColor="#B0A0B8"
            />

            <Text style={styles.label}>מדריך/ה</Text>
            <TextInput
              style={styles.input}
              value={form.instructorName}
              onChangeText={(value) => setForm((prev) => ({ ...prev, instructorName: value }))}
              placeholderTextColor="#B0A0B8"
            />

            <Text style={styles.label}>מקס׳ משתתפים</Text>
            <TextInput
              style={styles.input}
              value={form.maxRegistrations}
              onChangeText={(value) => setForm((prev) => ({ ...prev, maxRegistrations: value }))}
              keyboardType="numeric"
              placeholderTextColor="#B0A0B8"
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, !canSave && styles.disabledButton]}
              onPress={() => onSubmit(changes)}
              disabled={!canSave}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'שומר...' : 'שמור'}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#4E0D66',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
    padding: 16,
    maxHeight: '85%',
  },
  title: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  label: {
    color: '#FFE2ED',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    backgroundColor: 'rgba(255, 209, 227, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.3)',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#AB5FBD',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default EventEditModal;
