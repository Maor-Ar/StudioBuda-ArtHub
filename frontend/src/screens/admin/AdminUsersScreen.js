import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { GET_ALL_USERS } from '../../services/graphql/queries';

const ROLE_LABELS = { user: 'משתמש', manager: 'מנהל/ת', admin: 'אדמין' };
const ROLE_COLORS = { user: '#B0A0B8', manager: '#AB5FBD', admin: '#4E0D66' };

const AdminUsersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery(GET_ALL_USERS, { fetchPolicy: 'network-only' });

  const users = useMemo(() => {
    const list = data?.users || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(u =>
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  }, [data, search]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#AB5FBD" style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>לא נמצאו משתמשים</Text>
        ) : (
          users.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] || '#B0A0B8' }]}>
                  <Text style={styles.roleText}>{ROLE_LABELS[user.role] || user.role}</Text>
                </View>
                <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
              </View>
              <Text style={styles.userMeta}>{user.email}</Text>
              {user.phone ? <Text style={styles.userMeta}>📱 {user.phone}</Text> : null}
              <Text style={styles.userMeta}>הצטרף/ה: {formatDate(user.createdAt)} | {user.isActive ? 'פעיל ✅' : 'לא פעיל ❌'}</Text>
              {user.hasPurchasedTrial ? <Text style={styles.userMeta}>✓ רכש/ה שיעור ניסיון</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#5D3587' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFE2ED' },
  backBtn: { padding: 8 },
  backText: { color: '#FFE2ED', fontSize: 16 },
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: { backgroundColor: 'rgba(255,209,227,0.2)', borderRadius: 12, padding: 12, fontSize: 15, color: '#FFE2ED', textAlign: 'right', borderWidth: 1, borderColor: 'rgba(255,209,227,0.3)' },
  countText: { textAlign: 'center', color: '#FFD1E3', fontSize: 13, marginTop: 8 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 180 },
  emptyText: { textAlign: 'center', color: '#FFD1E3', fontSize: 16, marginTop: 40 },
  userCard: { backgroundColor: 'rgba(255,209,227,0.15)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,209,227,0.3)' },
  userTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 },
  userName: { fontSize: 17, fontWeight: 'bold', color: '#FFE2ED', textAlign: 'right' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  roleText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  userMeta: { fontSize: 13, color: '#D4B8E0', textAlign: 'right', marginBottom: 2 },
});

export default AdminUsersScreen;
