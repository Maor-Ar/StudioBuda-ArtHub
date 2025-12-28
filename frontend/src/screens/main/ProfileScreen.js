import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ME, GET_MY_REGISTRATIONS, GET_MY_TRANSACTIONS } from '../../services/graphql/queries';

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  // Fetch fresh user data from the server
  const { data: userData, loading: userLoading } = useQuery(GET_ME);

  // Fetch user's registrations
  const { data: registrationsData, loading: registrationsLoading } = useQuery(GET_MY_REGISTRATIONS);

  // Fetch user's transactions
  const { data: transactionsData, loading: transactionsLoading } = useQuery(GET_MY_TRANSACTIONS);

  const currentUser = userData?.me || user;
  const registrations = registrationsData?.myRegistrations || [];
  const transactions = transactionsData?.myTransactions || [];

  // Filter active transactions
  const activeTransactions = transactions.filter(t => t.isActive);

  // Filter future registrations
  const futureRegistrations = registrations.filter(r => {
    const eventDate = new Date(r.occurrenceDate || r.event.date);
    return eventDate >= new Date() && r.status === 'confirmed';
  });

  if (userLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFD1E3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>פרופיל</Text>
        </View>

        {currentUser && (
          <>
            {/* Personal Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>פרטים אישיים</Text>
              <View style={styles.userInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.value}>{currentUser.firstName} {currentUser.lastName}</Text>
                  <Text style={styles.label}>:שם</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.value}>{currentUser.email}</Text>
                  <Text style={styles.label}>:אימייל</Text>
                </View>

                {currentUser.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.value}>{currentUser.phone}</Text>
                    <Text style={styles.label}>:טלפון</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.value}>{currentUser.role}</Text>
                  <Text style={styles.label}>:סוג משתמש</Text>
                </View>
              </View>
            </View>

            {/* Active Transactions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>מנויים ומכרות פעילים</Text>
              {transactionsLoading ? (
                <ActivityIndicator size="small" color="#FFD1E3" />
              ) : activeTransactions.length > 0 ? (
                activeTransactions.map(transaction => (
                  <View key={transaction.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {transaction.transactionType === 'subscription' ? 'מנוי חודשי' :
                       transaction.transactionType === 'punch_card' ? 'כרטיסייה' :
                       'שיעור ניסיון'}
                    </Text>
                    {transaction.transactionType === 'subscription' && (
                      <>
                        <Text style={styles.cardText}>
                          כניסות חודשיות: {transaction.monthlyEntries}
                        </Text>
                        <Text style={styles.cardText}>
                          נוצלו החודש: {transaction.entriesUsedThisMonth}
                        </Text>
                      </>
                    )}
                    {transaction.transactionType === 'punch_card' && (
                      <Text style={styles.cardText}>
                        נותרו: {transaction.entriesRemaining} מתוך {transaction.totalEntries}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>אין מנויים פעילים</Text>
              )}
            </View>

            {/* Future Registrations Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>הרשמות קרובות</Text>
              {registrationsLoading ? (
                <ActivityIndicator size="small" color="#FFD1E3" />
              ) : futureRegistrations.length > 0 ? (
                futureRegistrations.map(registration => (
                  <View key={registration.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{registration.event.title}</Text>
                    <Text style={styles.cardText}>
                      תאריך: {new Date(registration.occurrenceDate || registration.event.date).toLocaleDateString('he-IL')}
                    </Text>
                    <Text style={styles.cardText}>
                      שעה: {registration.event.startTime}
                    </Text>
                    {registration.event.instructorName && (
                      <Text style={styles.cardText}>
                        מדריך: {registration.event.instructorName}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>אין הרשמות קרובות</Text>
              )}
            </View>
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120, // Space for bottom navigation
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFD1E3', // Pink header background
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  section: {
    backgroundColor: 'rgba(255, 209, 227, 0.9)', // Semi-transparent pink
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#4E0D66', // Dark purple
    textAlign: 'right',
  },
  userInfo: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#5D3587', // Purple
    marginLeft: 10,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#4E0D66', // Dark purple
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4E0D66', // Dark purple
    textAlign: 'right',
  },
  cardText: {
    fontSize: 14,
    marginTop: 4,
    color: '#5D3587', // Purple
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    color: '#5D3587', // Purple
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#4E0D66', // Dark purple
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFD1E3', // Pink text
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
