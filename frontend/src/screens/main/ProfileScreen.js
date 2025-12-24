import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ME, GET_MY_REGISTRATIONS, GET_MY_TRANSACTIONS } from '../../services/graphql/queries';

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  // Fetch fresh user data from the server
  const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(GET_ME);

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
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>פרופיל</Text>

      {currentUser && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>
            <View style={styles.userInfo}>
              <Text style={styles.label}>שם:</Text>
              <Text style={styles.value}>{currentUser.firstName} {currentUser.lastName}</Text>

              <Text style={styles.label}>אימייל:</Text>
              <Text style={styles.value}>{currentUser.email}</Text>

              {currentUser.phone && (
                <>
                  <Text style={styles.label}>טלפון:</Text>
                  <Text style={styles.value}>{currentUser.phone}</Text>
                </>
              )}

              <Text style={styles.label}>סוג משתמש:</Text>
              <Text style={styles.value}>{currentUser.role}</Text>
            </View>
          </View>

          {/* Active Transactions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>מנויים ומכרות פעילים</Text>
            {transactionsLoading ? (
              <ActivityIndicator size="small" color="#6200ee" />
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
              <ActivityIndicator size="small" color="#6200ee" />
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

      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>התנתק</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
    marginHorizontal: 20,
    color: '#6200ee',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  userInfo: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    marginTop: 5,
    color: '#333',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#6200ee',
  },
  cardText: {
    fontSize: 14,
    marginTop: 4,
    color: '#555',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;

