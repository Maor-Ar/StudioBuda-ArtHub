import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_USERS, GET_ALL_PRODUCTS } from '../../services/graphql/queries';
import { ADMIN_UPDATE_USER, ADMIN_CREATE_TRANSACTION_FOR_USER } from '../../services/graphql/mutations';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES, OAUTH_PROVIDERS } from '../../utils/constants';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';

const ROLE_LABELS = { user: 'משתמש', manager: 'מנהל/ת', admin: 'אדמין' };
const ROLE_COLORS = { user: '#B0A0B8', manager: '#AB5FBD', admin: '#4E0D66' };

const USER_TYPE_OPTIONS = [
  { value: 'regular', label: 'רגיל' },
  { value: OAUTH_PROVIDERS.GOOGLE, label: 'Google' },
  { value: OAUTH_PROVIDERS.FACEBOOK, label: 'Facebook' },
  { value: OAUTH_PROVIDERS.APPLE, label: 'Apple' },
];

const AdminUsersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(null);
  const [purchaseProductId, setPurchaseProductId] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDateStr, setPurchaseDateStr] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');

  const { data, loading, refetch } = useQuery(GET_ALL_USERS, { fetchPolicy: 'network-only' });
  const { data: productsData } = useQuery(GET_ALL_PRODUCTS, { fetchPolicy: 'cache-first' });

  const [adminUpdateUser, { loading: savingUser }] = useMutation(ADMIN_UPDATE_USER, {
    onCompleted: () => {
      showSuccessToast('המשתמש עודכן');
      refetch();
      setUserModalVisible(false);
      setSelectedUser(null);
      setForm(null);
    },
    onError: (e) => showErrorToast(getGraphQLErrorMessage(e)),
  });

  const [adminCreateTx, { loading: savingTx }] = useMutation(ADMIN_CREATE_TRANSACTION_FOR_USER, {
    onCompleted: () => {
      showSuccessToast('הרכישה נרשמה');
      refetch();
      setPurchaseModalVisible(false);
      setPurchaseProductId(null);
      setPurchaseAmount('');
      setPurchaseDateStr('');
      setPurchaseNote('');
    },
    onError: (e) => showErrorToast(getGraphQLErrorMessage(e)),
  });

  const users = useMemo(() => {
    const list = data?.users || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    );
  }, [data, search]);

  const activeProducts = useMemo(
    () => (productsData?.allProducts || []).filter((p) => p.isActive),
    [productsData]
  );

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const openUser = useCallback((u) => {
    setSelectedUser(u);
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      userType: u.userType || 'regular',
      role: u.role || USER_ROLES.USER,
      hasPurchasedTrial: !!u.hasPurchasedTrial,
      isActive: u.isActive !== false,
    });
    setUserModalVisible(true);
  }, []);

  const saveUser = () => {
    if (!selectedUser || !form) return;
    adminUpdateUser({
      variables: {
        id: selectedUser.id,
        input: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          userType: form.userType,
          role: form.role,
          hasPurchasedTrial: form.hasPurchasedTrial,
          isActive: form.isActive,
        },
      },
    });
  };

  const confirmDeactivate = () => {
    if (!selectedUser) return;
    Alert.alert('השבתת משתמש', 'להשבית את המשתמש? יוכלו להפעיל מחדש בעריכה.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'השבת',
        style: 'destructive',
        onPress: () => {
          adminUpdateUser({
            variables: {
              id: selectedUser.id,
              input: { isActive: false },
            },
          });
        },
      },
    ]);
  };

  const openPurchaseModal = () => {
    const first = activeProducts[0];
    setPurchaseProductId(first?.id || null);
    setPurchaseAmount(first != null ? String(first.price) : '');
    setPurchaseDateStr(new Date().toISOString().slice(0, 10));
    setPurchaseNote('');
    setPurchaseModalVisible(true);
  };

  const onSelectPurchaseProduct = (p) => {
    setPurchaseProductId(p.id);
    setPurchaseAmount(String(p.price));
  };

  const submitPurchase = () => {
    if (!selectedUser || !purchaseProductId) {
      showErrorToast('נא לבחור מוצר');
      return;
    }
    const amountNum = parseFloat(purchaseAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      showErrorToast('סכום לא תקין');
      return;
    }
    let purchaseDate;
    if (purchaseDateStr.trim()) {
      const d = new Date(`${purchaseDateStr.trim()}T12:00:00`);
      if (!Number.isNaN(d.getTime())) purchaseDate = d.toISOString();
    }
    adminCreateTx({
      variables: {
        userId: selectedUser.id,
        input: {
          productId: purchaseProductId,
          amount: amountNum,
          purchaseDate: purchaseDate || undefined,
          adminNote: purchaseNote.trim() || undefined,
        },
      },
    });
  };

  const renderUser = ({ item: user }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => openUser(user)} activeOpacity={0.85}>
      <View style={styles.userTop}>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] || '#B0A0B8' }]}>
          <Text style={styles.roleText}>{ROLE_LABELS[user.role] || user.role}</Text>
        </View>
        <Text style={styles.userName}>
          {user.firstName} {user.lastName}
        </Text>
      </View>
      <Text style={styles.userMeta}>{user.email}</Text>
      {user.phone ? <Text style={styles.userMeta}>📱 {user.phone}</Text> : null}
      <Text style={styles.userMeta}>
        הצטרף/ה: {formatDate(user.createdAt)} | {user.isActive ? 'פעיל ✅' : 'לא פעיל ❌'}
      </Text>
      {user.hasPurchasedTrial ? <Text style={styles.userMeta}>✓ רכש/ה שיעור ניסיון</Text> : null}
    </TouchableOpacity>
  );

  const listHeader = (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← חזרה</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניהול משתמשים</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="חיפוש לפי שם, אימייל או טלפון..."
          placeholderTextColor="#B0A0B8"
        />
      </View>
      <Text style={styles.countText}>{users.length} משתמשים</Text>
    </>
  );

  const isAdminActor = currentUser?.role === USER_ROLES.ADMIN;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.listOuter}>
        {loading ? (
          <>
            {listHeader}
            <ActivityIndicator size="large" color="#AB5FBD" style={{ marginTop: 40 }} />
          </>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו משתמשים</Text>}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      <Modal visible={userModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>עריכת משתמש</Text>
              {selectedUser && form ? (
                <>
                  <Text style={styles.roText}>מזהה: {selectedUser.id}</Text>
                  <Text style={styles.roText}>נוצר: {formatDate(selectedUser.createdAt)}</Text>
                  <Text style={styles.roText}>עודכן: {formatDate(selectedUser.updatedAt)}</Text>

                  <Text style={styles.fieldLabel}>שם פרטי</Text>
                  <TextInput
                    style={styles.input}
                    value={form.firstName}
                    onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.fieldLabel}>שם משפחה</Text>
                  <TextInput
                    style={styles.input}
                    value={form.lastName}
                    onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.fieldLabel}>אימייל</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Text style={styles.fieldLabel}>טלפון</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.fieldLabel}>סוג משתמש</Text>
                  <View style={styles.typeRow}>
                    {USER_TYPE_OPTIONS.map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.typeBtn, form.userType === value && styles.typeBtnActive]}
                        onPress={() => setForm((f) => ({ ...f, userType: value }))}
                      >
                        <Text style={[styles.typeText, form.userType === value && styles.typeTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>תפקיד</Text>
                  <View style={styles.typeRow}>
                    {[
                      USER_ROLES.USER,
                      USER_ROLES.MANAGER,
                      ...(isAdminActor ? [USER_ROLES.ADMIN] : []),
                    ].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.typeBtn, form.role === r && styles.typeBtnActive]}
                        onPress={() => setForm((f) => ({ ...f, role: r }))}
                      >
                        <Text style={[styles.typeText, form.role === r && styles.typeTextActive]}>
                          {ROLE_LABELS[r]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setForm((f) => ({ ...f, hasPurchasedTrial: !f.hasPurchasedTrial }))}
                  >
                    <View style={[styles.checkbox, form.hasPurchasedTrial && styles.checkboxActive]} />
                    <Text style={styles.toggleLabel}>רכש שיעור ניסיון (דגל)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  >
                    <View style={[styles.checkbox, form.isActive && styles.checkboxActive]} />
                    <Text style={styles.toggleLabel}>חשבון פעיל</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.primaryBtn} onPress={saveUser} disabled={savingUser}>
                    {savingUser ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>שמור</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={openPurchaseModal}>
                    <Text style={styles.secondaryBtnText}>הוספת רכישה (מזומן)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dangerBtn} onPress={confirmDeactivate}>
                    <Text style={styles.dangerBtnText}>השבת משתמש</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setUserModalVisible(false);
                      setSelectedUser(null);
                      setForm(null);
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>סגור</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={purchaseModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>רכישה במזומן</Text>
            <Text style={styles.fieldLabel}>בחר מוצר</Text>
            <ScrollView
              style={styles.productListScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {activeProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.productPick, purchaseProductId === p.id && styles.productPickOn]}
                  onPress={() => onSelectPurchaseProduct(p)}
                >
                  <Text style={styles.productPickText}>
                    {p.title} · {p.price}₪
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>סכום (₪)</Text>
            <TextInput
              style={styles.input}
              value={purchaseAmount}
              onChangeText={setPurchaseAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <Text style={styles.fieldLabel}>תאריך רכישה (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={purchaseDateStr}
              onChangeText={setPurchaseDateStr}
              placeholder={new Date().toISOString().slice(0, 10)}
              placeholderTextColor="#999"
            />
            <Text style={styles.fieldLabel}>הערת מנהל</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={purchaseNote}
              onChangeText={setPurchaseNote}
              multiline
              numberOfLines={Platform.OS === 'ios' ? undefined : 3}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={submitPurchase} disabled={savingTx}>
              {savingTx ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>שמור רכישה</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setPurchaseModalVisible(false);
              }}
            >
              <Text style={styles.secondaryBtnText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  listOuter: { flex: 1, minHeight: 0 },
  list: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#5D3587',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFE2ED' },
  backBtn: { padding: 8 },
  backText: { color: '#FFE2ED', fontSize: 16 },
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: 'rgba(255,209,227,0.2)',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#FFE2ED',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: 'rgba(255,209,227,0.3)',
  },
  countText: { textAlign: 'center', color: '#FFD1E3', fontSize: 13, marginTop: 8, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 180 },
  emptyText: { textAlign: 'center', color: '#FFD1E3', fontSize: 16, marginTop: 40 },
  userCard: {
    backgroundColor: 'rgba(255,209,227,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,209,227,0.3)',
  },
  userTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 },
  userName: { fontSize: 17, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'right' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  roleText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  userMeta: { fontSize: 13, color: '#D4B8E0', textAlign: 'right', marginBottom: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  modalBox: {
    backgroundColor: '#2d1b45',
    borderRadius: 18,
    padding: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,209,227,0.25)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'center', marginBottom: 12 },
  roText: { fontSize: 12, color: '#D4B8E0', textAlign: 'right', marginBottom: 4 },
  fieldLabel: { fontSize: 13, color: '#FFD1E3', textAlign: 'right', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,209,227,0.15)',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: '#FFE2ED',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: 'rgba(255,209,227,0.3)',
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#AB5FBD' },
  typeBtnActive: { backgroundColor: '#AB5FBD' },
  typeText: { fontSize: 12, color: '#FFD1E3' },
  typeTextActive: { color: '#FFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#AB5FBD' },
  checkboxActive: { backgroundColor: '#AB5FBD' },
  toggleLabel: { fontSize: 15, color: '#FFE2ED' },
  primaryBtn: {
    backgroundColor: '#AB5FBD',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,209,227,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryBtnText: { color: '#FFD1E3', fontSize: 15 },
  dangerBtn: {
    backgroundColor: 'rgba(229,115,115,0.35)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerBtnText: { color: '#FFE2ED', fontSize: 15, fontWeight: '600' },
  productPick: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,209,227,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  productListScroll: { maxHeight: 200, minHeight: 140 },
  productPickOn: { borderColor: '#AB5FBD', backgroundColor: 'rgba(171,95,189,0.25)' },
  productPickText: { color: '#FFE2ED', textAlign: 'right', fontSize: 14 },
});

export default AdminUsersScreen;
