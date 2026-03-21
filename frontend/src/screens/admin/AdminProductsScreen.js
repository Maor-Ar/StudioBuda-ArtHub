import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_PRODUCTS } from '../../services/graphql/queries';
import { CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT } from '../../services/graphql/mutations';
import { TRANSACTION_TYPES } from '../../utils/constants';

const TYPE_LABELS = {
  [TRANSACTION_TYPES.SUBSCRIPTION]: 'מנוי',
  [TRANSACTION_TYPES.PUNCH_CARD]: 'כרטיסייה',
  [TRANSACTION_TYPES.TRIAL_LESSON]: 'שיעור ניסיון',
};

const EMPTY_FORM = {
  id: '',
  title: '',
  subtitle: '',
  type: TRANSACTION_TYPES.SUBSCRIPTION,
  price: '',
  monthlyEntries: '4',
  totalEntries: '5',
  validityMonths: '6',
  termsHtml: '',
  sortOrder: '0',
  isActive: true,
  isPurchasable: true,
};

const AdminProductsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, loading, refetch } = useQuery(GET_ALL_PRODUCTS, { fetchPolicy: 'network-only' });

  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT, {
    onCompleted: () => {
      setModalVisible(false);
      resetForm();
      refetch();
    },
    onError: (e) => Alert.alert('שגיאה', e.message),
  });

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT, {
    onCompleted: () => {
      setModalVisible(false);
      resetForm();
      refetch();
    },
    onError: (e) => Alert.alert('שגיאה', e.message),
  });

  const [deleteProduct] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => refetch(),
    onError: (e) => Alert.alert('שגיאה', e.message),
  });

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingProduct(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      id: p.id,
      title: p.title || '',
      subtitle: p.subtitle || '',
      type: p.type,
      price: String(p.price ?? ''),
      monthlyEntries: p.monthlyEntries != null ? String(p.monthlyEntries) : '',
      totalEntries: p.totalEntries != null ? String(p.totalEntries) : '',
      validityMonths: p.validityMonths != null ? String(p.validityMonths) : '',
      termsHtml: p.termsHtml || '',
      sortOrder: String(p.sortOrder ?? 0),
      isActive: p.isActive !== false,
      isPurchasable: p.isPurchasable !== false,
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert('חסר נתון', 'נא למלא כותרת');
      return;
    }
    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price <= 0) {
      Alert.alert('מחיר לא תקין', 'נא להזין מחיר חיובי');
      return;
    }
    const sortOrder = parseInt(form.sortOrder, 10);
    const so = Number.isNaN(sortOrder) ? 0 : sortOrder;

    if (editingProduct) {
      const input = {
        title: form.title.trim(),
        subtitle: (form.subtitle || '').trim(),
        type: form.type,
        price,
        termsHtml: form.termsHtml || '',
        sortOrder: so,
        isActive: form.isActive,
        isPurchasable: form.isPurchasable,
      };
      if (form.type === TRANSACTION_TYPES.SUBSCRIPTION) {
        const me = parseInt(form.monthlyEntries, 10);
        if (Number.isNaN(me) || me < 1) {
          Alert.alert('חסר נתון', 'נא להזין כניסות לחודש');
          return;
        }
        input.monthlyEntries = me;
        input.totalEntries = null;
        input.validityMonths = null;
      } else if (form.type === TRANSACTION_TYPES.PUNCH_CARD) {
        const te = parseInt(form.totalEntries, 10);
        const vm = parseInt(form.validityMonths, 10);
        if (Number.isNaN(te) || te < 1 || Number.isNaN(vm) || vm < 1) {
          Alert.alert('חסר נתון', 'נא להזין כניסות ותוקף בחודשים');
          return;
        }
        input.totalEntries = te;
        input.validityMonths = vm;
        input.monthlyEntries = null;
      } else {
        input.monthlyEntries = null;
        input.totalEntries = null;
        input.validityMonths = null;
      }
      updateProduct({ variables: { id: editingProduct.id, input } });
    } else {
      if (!form.id.trim()) {
        Alert.alert('חסר מזהה', 'נא למלא מזהה מוצר (למשל subscription-4-monthly)');
        return;
      }
      const input = {
        id: form.id.trim(),
        title: form.title.trim(),
        subtitle: (form.subtitle || '').trim(),
        type: form.type,
        price,
        termsHtml: form.termsHtml || '',
        sortOrder: so,
        isActive: form.isActive,
        isPurchasable: form.isPurchasable,
      };
      if (form.type === TRANSACTION_TYPES.SUBSCRIPTION) {
        const me = parseInt(form.monthlyEntries, 10);
        if (Number.isNaN(me) || me < 1) {
          Alert.alert('חסר נתון', 'נא להזין כניסות לחודש');
          return;
        }
        input.monthlyEntries = me;
      } else if (form.type === TRANSACTION_TYPES.PUNCH_CARD) {
        const te = parseInt(form.totalEntries, 10);
        const vm = parseInt(form.validityMonths, 10);
        if (Number.isNaN(te) || te < 1 || Number.isNaN(vm) || vm < 1) {
          Alert.alert('חסר נתון', 'נא להזין כניסות ותוקף בחודשים');
          return;
        }
        input.totalEntries = te;
        input.validityMonths = vm;
      }
      createProduct({ variables: { input } });
    }
  };

  const handleSoftDelete = (p) => {
    Alert.alert('השבתת מוצר', `להשבית את "${p.title}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'השבת', style: 'destructive', onPress: () => deleteProduct({ variables: { id: p.id } }) },
    ]);
  };

  const products = data?.allProducts || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← חזרה</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניהול מוצרים</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ חדש</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>{products.length} מוצרים</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#AB5FBD" style={{ marginTop: 40 }} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyText}>אין מוצרים</Text>
        ) : (
          products.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => openEdit(p)} activeOpacity={0.8}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.badge}>{TYPE_LABELS[p.type] || p.type}</Text>
              </View>
              <Text style={styles.cardMeta}>{p.id} · {p.price}₪ · סדר {p.sortOrder}</Text>
              <Text style={styles.cardMeta}>
                {p.isActive ? 'פעיל' : 'לא פעיל'} · {p.isPurchasable ? 'ניתן לרכישה אונליין' : 'לא באתר'}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleSoftDelete(p)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>השבת</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editingProduct ? 'עריכת מוצר' : 'מוצר חדש'}</Text>

              {!editingProduct && (
                <>
                  <Text style={styles.fieldLabel}>מזהה (ID) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.id}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, id: v }))}
                    placeholder="subscription-4-monthly"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>כותרת *</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(v) => setForm((prev) => ({ ...prev, title: v }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.fieldLabel}>שורת משנה (תצוגה)</Text>
              <TextInput
                style={styles.input}
                value={form.subtitle}
                onChangeText={(v) => setForm((prev) => ({ ...prev, subtitle: v }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.fieldLabel}>מחיר (₪) *</Text>
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(v) => setForm((prev) => ({ ...prev, price: v }))}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />

              <Text style={styles.fieldLabel}>סוג</Text>
              <View style={styles.typeRow}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.typeBtn, form.type === val && styles.typeBtnActive]}
                    onPress={() => setForm((prev) => ({ ...prev, type: val }))}
                  >
                    <Text style={[styles.typeText, form.type === val && styles.typeTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.type === TRANSACTION_TYPES.SUBSCRIPTION && (
                <>
                  <Text style={styles.fieldLabel}>כניסות לחודש (99 = ללא הגבלה)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.monthlyEntries}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, monthlyEntries: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor="#999"
                  />
                </>
              )}

              {form.type === TRANSACTION_TYPES.PUNCH_CARD && (
                <>
                  <Text style={styles.fieldLabel}>סה״כ כניסות</Text>
                  <TextInput
                    style={styles.input}
                    value={form.totalEntries}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, totalEntries: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.fieldLabel}>תוקף (חודשים)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.validityMonths}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, validityMonths: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor="#999"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>מיון (מספר)</Text>
              <TextInput
                style={styles.input}
                value={form.sortOrder}
                onChangeText={(v) => setForm((prev) => ({ ...prev, sortOrder: v }))}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />

              <Text style={styles.fieldLabel}>תנאים (HTML)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.termsHtml}
                onChangeText={(v) => setForm((prev) => ({ ...prev, termsHtml: v }))}
                multiline
                numberOfLines={Platform.OS === 'ios' ? undefined : 6}
                placeholder="<p dir=&quot;rtl&quot;>...</p>"
                placeholderTextColor="#999"
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              >
                <View style={[styles.checkbox, form.isActive && styles.checkboxActive]} />
                <Text style={styles.toggleLabel}>פעיל</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setForm((prev) => ({ ...prev, isPurchasable: !prev.isPurchasable }))}
              >
                <View style={[styles.checkbox, form.isPurchasable && styles.checkboxActive]} />
                <Text style={styles.toggleLabel}>זמין לרכישה באתר</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={creating || updating}>
                  {creating || updating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>שמור</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#5D3587',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFE2ED', flex: 1, textAlign: 'center' },
  backBtn: { padding: 8, minWidth: 72 },
  backText: { color: '#FFE2ED', fontSize: 15 },
  addBtn: { backgroundColor: '#AB5FBD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, minWidth: 72 },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  countText: { textAlign: 'center', color: '#FFD1E3', fontSize: 13, marginTop: 8 },
  list: { flex: 1, minHeight: 0 },
  listContent: { padding: 16, paddingBottom: 180 },
  emptyText: { textAlign: 'center', color: '#FFD1E3', fontSize: 16, marginTop: 40 },
  card: {
    backgroundColor: 'rgba(255,209,227,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,209,227,0.3)',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'right', flex: 1 },
  badge: { fontSize: 11, color: '#FFF', backgroundColor: '#AB5FBD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardMeta: { fontSize: 12, color: '#D4B8E0', textAlign: 'right', marginBottom: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(229,115,115,0.35)', borderRadius: 10 },
  smallBtnText: { color: '#FFE2ED', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 48 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, maxHeight: '88%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#4E0D66', textAlign: 'center', marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: '#5D3587', fontWeight: '600', textAlign: 'right', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#F5EBF8',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E0D4E8',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#AB5FBD' },
  typeBtnActive: { backgroundColor: '#AB5FBD' },
  typeText: { fontSize: 12, color: '#AB5FBD' },
  typeTextActive: { color: '#FFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#AB5FBD' },
  checkboxActive: { backgroundColor: '#AB5FBD' },
  toggleLabel: { fontSize: 15, color: '#4E0D66' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  saveBtn: { flex: 1, backgroundColor: '#AB5FBD', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  cancelFormBtn: { flex: 1, backgroundColor: '#F0E6F6', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelFormBtnText: { color: '#5D3587', fontSize: 16, fontWeight: '600' },
});

export default AdminProductsScreen;
