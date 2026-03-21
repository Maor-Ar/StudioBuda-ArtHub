import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_EVENTS } from '../../services/graphql/queries';
import { CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT } from '../../services/graphql/mutations';
import { EVENT_TYPES } from '../../utils/constants';

const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.SUBSCRIPTION_ONLY]: 'מנויים בלבד',
  [EVENT_TYPES.TRIAL]: 'שיעור ניסיון',
  [EVENT_TYPES.PAID_WORKSHOP]: 'סדנה בתשלום',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  startTime: '18:00',
  duration: '90',
  instructorName: 'יערה בודה',
  maxRegistrations: '6',
  eventType: EVENT_TYPES.SUBSCRIPTION_ONLY,
  isRecurring: false,
  recurringIntervalDays: '7',
  price: '',
};

const AdminEventsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');

  const { data, loading, refetch } = useQuery(GET_ALL_EVENTS, { fetchPolicy: 'network-only' });

  const [createEvent, { loading: creating }] = useMutation(CREATE_EVENT, {
    onCompleted: () => { setModalVisible(false); resetForm(); refetch(); },
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT, {
    onCompleted: () => { setModalVisible(false); resetForm(); refetch(); },
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const [deleteEvent, { loading: deleting }] = useMutation(DELETE_EVENT, {
    onCompleted: () => refetch(),
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') { window.alert(`${title}: ${msg}`); }
    else { Alert.alert(title, msg); }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingEvent(null); };

  const openCreate = () => { resetForm(); setModalVisible(true); };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      startTime: event.startTime || '18:00',
      duration: String(event.duration || 90),
      instructorName: event.instructorName || '',
      maxRegistrations: String(event.maxRegistrations || 6),
      eventType: event.eventType || EVENT_TYPES.SUBSCRIPTION_ONLY,
      isRecurring: event.isRecurring || false,
      recurringIntervalDays: String(event.recurringIntervalDays || 7),
      price: event.price ? String(event.price) : '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.startTime) {
      showAlert('שגיאה', 'יש למלא כותרת, תאריך ושעה');
      return;
    }
    const input = {
      title: form.title,
      description: form.description,
      date: new Date(form.date + 'T00:00:00.000Z').toISOString(),
      startTime: form.startTime,
      duration: parseInt(form.duration) || 90,
      instructorName: form.instructorName || 'יערה בודה',
      maxRegistrations: parseInt(form.maxRegistrations) || 6,
      eventType: form.eventType,
      isRecurring: form.isRecurring,
      ...(form.isRecurring && { recurringIntervalDays: parseInt(form.recurringIntervalDays) || 7 }),
      ...(form.price && { price: parseFloat(form.price) }),
    };

    if (editingEvent) {
      await updateEvent({ variables: { id: editingEvent.id, input } });
    } else {
      await createEvent({ variables: { input } });
    }
  };

  const handleDelete = (event) => {
    const doDelete = () => deleteEvent({ variables: { id: event.id } });
    if (Platform.OS === 'web') {
      if (window.confirm(`למחוק את "${event.title}"?`)) doDelete();
    } else {
      Alert.alert('מחיקת אירוע', `למחוק את "${event.title}"?`, [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleToggleActive = (event) => {
    updateEvent({ variables: { id: event.id, input: { isActive: !event.isActive } } });
  };

  const events = useMemo(() => {
    let list = data?.allEvents || [];
    if (filter === 'active') list = list.filter(e => e.isActive);
    if (filter === 'inactive') list = list.filter(e => !e.isActive);
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, filter]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← חזרה</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניהול אירועים</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ חדש</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {[['all', 'הכל'], ['active', 'פעיל'], ['inactive', 'לא פעיל']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.filterBtn, filter === val && styles.filterBtnActive]} onPress={() => setFilter(val)}>
            <Text style={[styles.filterText, filter === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>{events.length} אירועים</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#AB5FBD" style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>אין אירועים</Text>
        ) : (
          events.map(event => (
            <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => openEdit(event)} activeOpacity={0.7}>
              <View style={styles.eventInfo}>
                <View style={styles.eventHeader}>
                  <View style={[styles.statusDot, { backgroundColor: event.isActive ? '#4CAF50' : '#E57373' }]} />
                  <Text style={styles.eventTitle}>{event.title}</Text>
                </View>
                <Text style={styles.eventMeta}>
                  {formatDate(event.date)} | {event.startTime} | {event.duration} דק׳
                </Text>
                <Text style={styles.eventMeta}>
                  {EVENT_TYPE_LABELS[event.eventType] || event.eventType} | {event.instructorName}
                </Text>
                <Text style={styles.eventMeta}>
                  {event.isRecurring ? `חוזר כל ${event.recurringIntervalDays} ימים` : 'חד פעמי'} | עד {event.maxRegistrations} משתתפים
                </Text>
              </View>
              <View style={styles.eventActions}>
                <TouchableOpacity onPress={() => openEdit(event)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleToggleActive(event)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>{event.isActive ? '⏸️' : '▶️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(event)} style={[styles.actionBtn, styles.deleteBtn]}>
                  <Text style={styles.actionText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingEvent ? 'עריכת אירוע' : 'אירוע חדש'}</Text>

              <Text style={styles.fieldLabel}>כותרת *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(p => ({...p, title: v}))} placeholder="שם האירוע" placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>תיאור</Text>
              <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={v => setForm(p => ({...p, description: v}))} placeholder="תיאור האירוע" placeholderTextColor="#999" multiline numberOfLines={3} />

              <Text style={styles.fieldLabel}>תאריך * (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={form.date} onChangeText={v => setForm(p => ({...p, date: v}))} placeholder="2026-03-01" placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>שעת התחלה * (HH:mm)</Text>
              <TextInput style={styles.input} value={form.startTime} onChangeText={v => setForm(p => ({...p, startTime: v}))} placeholder="18:00" placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>משך (דקות)</Text>
              <TextInput style={styles.input} value={form.duration} onChangeText={v => setForm(p => ({...p, duration: v}))} keyboardType="numeric" placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>מדריך/ה</Text>
              <TextInput style={styles.input} value={form.instructorName} onChangeText={v => setForm(p => ({...p, instructorName: v}))} placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>מקס׳ משתתפים</Text>
              <TextInput style={styles.input} value={form.maxRegistrations} onChangeText={v => setForm(p => ({...p, maxRegistrations: v}))} keyboardType="numeric" placeholderTextColor="#999" />

              <Text style={styles.fieldLabel}>סוג אירוע</Text>
              <View style={styles.typeRow}>
                {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                  <TouchableOpacity key={val} style={[styles.typeBtn, form.eventType === val && styles.typeBtnActive]} onPress={() => setForm(p => ({...p, eventType: val}))}>
                    <Text style={[styles.typeText, form.eventType === val && styles.typeTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.eventType === EVENT_TYPES.PAID_WORKSHOP && (
                <>
                  <Text style={styles.fieldLabel}>מחיר (₪)</Text>
                  <TextInput style={styles.input} value={form.price} onChangeText={v => setForm(p => ({...p, price: v}))} keyboardType="numeric" placeholderTextColor="#999" />
                </>
              )}

              <TouchableOpacity style={styles.toggleRow} onPress={() => setForm(p => ({...p, isRecurring: !p.isRecurring}))}>
                <View style={[styles.checkbox, form.isRecurring && styles.checkboxActive]} />
                <Text style={styles.toggleLabel}>אירוע חוזר</Text>
              </TouchableOpacity>

              {form.isRecurring && (
                <>
                  <Text style={styles.fieldLabel}>חזרה כל (ימים)</Text>
                  <TextInput style={styles.input} value={form.recurringIntervalDays} onChangeText={v => setForm(p => ({...p, recurringIntervalDays: v}))} keyboardType="numeric" placeholderTextColor="#999" />
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                  {(creating || updating) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>שמור</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelFormBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.cancelFormBtnText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#5D3587' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'center' },
  backBtn: { padding: 8 },
  backText: { color: '#FFE2ED', fontSize: 16 },
  addBtn: { backgroundColor: '#AB5FBD', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8, justifyContent: 'center' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#FFD1E3' },
  filterBtnActive: { backgroundColor: '#AB5FBD', borderColor: '#AB5FBD' },
  filterText: { color: '#FFD1E3', fontSize: 13 },
  filterTextActive: { color: '#FFF' },
  countText: { textAlign: 'center', color: '#FFD1E3', fontSize: 13, marginTop: 8 },
  list: { flex: 1, minHeight: 0 },
  listContent: { padding: 16, paddingBottom: 180 },
  emptyText: { textAlign: 'center', color: '#FFD1E3', fontSize: 16, marginTop: 40 },
  eventCard: { backgroundColor: 'rgba(255,209,227,0.15)', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,209,227,0.3)' },
  eventInfo: { flex: 1, marginRight: 8 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  eventTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'right' },
  eventMeta: { fontSize: 13, color: '#D4B8E0', textAlign: 'right', marginBottom: 2 },
  eventActions: { justifyContent: 'center', gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,209,227,0.2)', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { backgroundColor: 'rgba(229,115,115,0.3)' },
  actionText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 60 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#4E0D66', textAlign: 'center', marginBottom: 20 },
  fieldLabel: { fontSize: 14, color: '#5D3587', fontWeight: '600', textAlign: 'right', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#F5EBF8', borderRadius: 10, padding: 12, fontSize: 15, color: '#333', textAlign: 'right', borderWidth: 1, borderColor: '#E0D4E8' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#AB5FBD' },
  typeBtnActive: { backgroundColor: '#AB5FBD' },
  typeText: { fontSize: 13, color: '#AB5FBD' },
  typeTextActive: { color: '#FFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 14, gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#AB5FBD' },
  checkboxActive: { backgroundColor: '#AB5FBD' },
  toggleLabel: { fontSize: 15, color: '#4E0D66' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  saveBtn: { flex: 1, backgroundColor: '#AB5FBD', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  cancelFormBtn: { flex: 1, backgroundColor: '#F0E6F6', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelFormBtnText: { color: '#5D3587', fontSize: 16, fontWeight: '600' },
});

export default AdminEventsScreen;
