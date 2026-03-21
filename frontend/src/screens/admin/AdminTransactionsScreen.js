import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_TRANSACTIONS, GET_ALL_USERS } from '../../services/graphql/queries';
import { UPDATE_TRANSACTION, RENEW_SUBSCRIPTION, CANCEL_SUBSCRIPTION } from '../../services/graphql/mutations';

const TYPE_LABELS = { subscription: 'מנוי', punch_card: 'כרטיסייה', trial_lesson: 'שיעור ניסיון' };

const AdminTransactionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState(null);

  const { data, loading, refetch } = useQuery(GET_ALL_TRANSACTIONS, { fetchPolicy: 'network-only' });
  const { data: usersData } = useQuery(GET_ALL_USERS);

  const [renewSubscription, { loading: renewing }] = useMutation(RENEW_SUBSCRIPTION, {
    onCompleted: () => { refetch(); setSelectedTx(null); },
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const [cancelSubscription, { loading: cancelling }] = useMutation(CANCEL_SUBSCRIPTION, {
    onCompleted: () => { refetch(); setSelectedTx(null); },
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const [updateTransaction, { loading: updatingTx }] = useMutation(UPDATE_TRANSACTION, {
    onCompleted: () => { refetch(); setSelectedTx(null); },
    onError: (e) => showAlert('שגיאה', e.message),
  });

  const showAlert = (title, msg) => {
    Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);
  };

  const usersMap = useMemo(() => {
    const m = {};
    (usersData?.users || []).forEach(u => { m[u.id] = u; });
    return m;
  }, [usersData]);

  const transactions = useMemo(() => {
    let list = data?.transactions || [];
    if (filter === 'active') list = list.filter(t => t.isActive);
    if (filter === 'inactive') list = list.filter(t => !t.isActive);
    return list;
  }, [data, filter]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const getUserName = (uid) => {
    const u = usersMap[uid];
    return u ? `${u.firstName} ${u.lastName}` : uid?.substring(0, 8);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← חזרה</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ניהול עסקאות</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filterRow}>
        {[['all', 'הכל'], ['active', 'פעיל'], ['inactive', 'לא פעיל']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.filterBtn, filter === val && styles.filterBtnActive]} onPress={() => setFilter(val)}>
            <Text style={[styles.filterText, filter === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>{transactions.length} עסקאות</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} nestedScrollEnabled={true}>
        {loading ? (
          <ActivityIndicator size="large" color="#AB5FBD" style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>אין עסקאות</Text>
        ) : (
          transactions.map(tx => (
            <TouchableOpacity key={tx.id} style={styles.txCard} onPress={() => setSelectedTx(tx)} activeOpacity={0.7}>
              <View style={styles.txRow}>
                <View style={[styles.statusDot, { backgroundColor: tx.isActive ? '#4CAF50' : '#E57373' }]} />
                <Text style={styles.txType}>{TYPE_LABELS[tx.transactionType] || tx.transactionType}</Text>
              </View>
              <Text style={styles.txUser}>{getUserName(tx.userId)}</Text>
              <Text style={styles.txMeta}>
                ₪{tx.amount} | {formatDate(tx.purchaseDate)}
                {tx.transactionType === 'subscription' && ` | ${tx.entriesUsedThisMonth ?? 0}/${tx.monthlyEntries ?? 0} כניסות`}
                {tx.transactionType === 'punch_card' && ` | ${tx.entriesRemaining ?? 0}/${tx.totalEntries ?? 0} נותרו`}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{TYPE_LABELS[selectedTx.transactionType]}</Text>
                <Text style={styles.modalField}>משתמש: {getUserName(selectedTx.userId)}</Text>
                <Text style={styles.modalField}>סכום: ₪{selectedTx.amount}</Text>
                <Text style={styles.modalField}>סטטוס: {selectedTx.isActive ? 'פעיל ✅' : 'לא פעיל ❌'}</Text>
                <Text style={styles.modalField}>תאריך רכישה: {formatDate(selectedTx.purchaseDate)}</Text>
                {selectedTx.transactionType === 'subscription' && (
                  <>
                    <Text style={styles.modalField}>כניסות חודשיות: {selectedTx.monthlyEntries}</Text>
                    <Text style={styles.modalField}>נוצלו: {selectedTx.entriesUsedThisMonth ?? 0}</Text>
                    <Text style={styles.modalField}>חידוש אחרון: {formatDate(selectedTx.lastRenewalDate)}</Text>
                  </>
                )}
                {selectedTx.transactionType === 'punch_card' && (
                  <>
                    <Text style={styles.modalField}>סה״כ כניסות: {selectedTx.totalEntries}</Text>
                    <Text style={styles.modalField}>נותרו: {selectedTx.entriesRemaining ?? 0}</Text>
                  </>
                )}

                <View style={styles.modalActions}>
                  {selectedTx.isActive && selectedTx.transactionType === 'subscription' && (
                    <>
                      <TouchableOpacity style={styles.renewBtn} onPress={() => renewSubscription({ variables: { id: selectedTx.id } })} disabled={renewing}>
                        {renewing ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnText}>חדש מנוי</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelSubBtn} onPress={() => cancelSubscription({ variables: { id: selectedTx.id } })} disabled={cancelling}>
                        {cancelling ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.btnText}>בטל מנוי</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedTx.isActive && (
                    <TouchableOpacity style={styles.deactivateBtn} onPress={() => updateTransaction({ variables: { id: selectedTx.id, input: { isActive: false } } })} disabled={updatingTx}>
                      <Text style={styles.btnText}>השבת</Text>
                    </TouchableOpacity>
                  )}
                  {!selectedTx.isActive && (
                    <TouchableOpacity style={styles.renewBtn} onPress={() => updateTransaction({ variables: { id: selectedTx.id, input: { isActive: true } } })} disabled={updatingTx}>
                      <Text style={styles.btnText}>הפעל</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedTx(null)}>
                  <Text style={styles.closeBtnText}>סגור</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#5D3587' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFE2ED' },
  backBtn: { padding: 8 },
  backText: { color: '#FFE2ED', fontSize: 16 },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, justifyContent: 'center' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#FFD1E3' },
  filterBtnActive: { backgroundColor: '#AB5FBD', borderColor: '#AB5FBD' },
  filterText: { color: '#FFD1E3', fontSize: 13 },
  filterTextActive: { color: '#FFF' },
  countText: { textAlign: 'center', color: '#FFD1E3', fontSize: 13, marginTop: 4 },
  list: { flex: 1, minHeight: 0 },
  listContent: { padding: 16, paddingBottom: 180 },
  emptyText: { textAlign: 'center', color: '#FFD1E3', fontSize: 16, marginTop: 40 },
  txCard: { backgroundColor: 'rgba(255,209,227,0.15)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,209,227,0.3)' },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  txType: { fontSize: 16, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'right' },
  txUser: { fontSize: 14, color: '#D4B8E0', textAlign: 'right', marginBottom: 2 },
  txMeta: { fontSize: 12, color: '#D4B8E0', textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#4E0D66', textAlign: 'center', marginBottom: 16 },
  modalField: { fontSize: 15, color: '#333', textAlign: 'right', marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  renewBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  cancelSubBtn: { backgroundColor: '#E57373', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  deactivateBtn: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  closeBtn: { backgroundColor: '#F0E6F6', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#5D3587', fontSize: 16, fontWeight: '600' },
});

export default AdminTransactionsScreen;
