import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ME, GET_MY_REGISTRATIONS, GET_MY_TRANSACTIONS } from '../../services/graphql/queries';
import { CANCEL_SUBSCRIPTION } from '../../services/graphql/mutations';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';
import { PRODUCTS } from '../../utils/constants';

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, transactions: contextTransactions, logout, updateTransactions } = useAuth();
  
  // Cancel subscription modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Fetch fresh user data from the server
  const { data: userData, loading: userLoading } = useQuery(GET_ME);

  // Fetch user's registrations
  const { data: registrationsData, loading: registrationsLoading } = useQuery(GET_MY_REGISTRATIONS);

  // Fetch user's transactions to refresh context (use context as primary source)
  const { data: transactionsData, loading: transactionsLoading, refetch: refetchTransactions } = useQuery(GET_MY_TRANSACTIONS, {
    onCompleted: (data) => {
      // Update context with fresh transactions from server
      if (data?.myTransactions) {
        updateTransactions(data.myTransactions);
      }
    },
  });

  // Cancel subscription mutation
  const [cancelSubscription] = useMutation(CANCEL_SUBSCRIPTION, {
    onCompleted: async (data) => {
      console.log('[Profile] Subscription cancelled:', data);
      setCancellingId(null);
      setCancelModalVisible(false);
      setSelectedTransaction(null);
      
      // Refetch transactions
      const { data: refreshedData } = await refetchTransactions();
      if (refreshedData?.myTransactions) {
        updateTransactions(refreshedData.myTransactions);
      }
      
      showSuccessToast('המנוי בוטל בהצלחה');
    },
    onError: (error) => {
      console.error('[Profile] Cancel subscription error:', error);
      setCancellingId(null);
      showErrorToast(getGraphQLErrorMessage(error));
    },
  });

  const currentUser = userData?.me || user;
  const registrations = registrationsData?.myRegistrations || [];
  
  // Use context transactions as primary source, fallback to query data
  const transactions = contextTransactions.length > 0 
    ? contextTransactions 
    : (transactionsData?.myTransactions || []);

  // Filter active transactions (should already be filtered in context, but double-check)
  const activeTransactions = transactions.filter(t => t.isActive);

  // Filter future registrations
  const futureRegistrations = registrations.filter(r => {
    const eventDate = new Date(r.occurrenceDate || r.event.date);
    return eventDate >= new Date() && r.status === 'confirmed';
  });

  // Get product name from transaction
  const getProductName = (transaction) => {
    // Try to find matching product
    const product = PRODUCTS.find(p => 
      p.type === transaction.transactionType &&
      (p.monthlyEntries === transaction.monthlyEntries || p.totalEntries === transaction.totalEntries)
    );
    
    if (product) return product.name;
    
    // Fallback to generic names
    switch (transaction.transactionType) {
      case 'subscription':
        return `מנוי ${transaction.monthlyEntries} כניסות בחודש`;
      case 'punch_card':
        return `כרטיסייה ${transaction.totalEntries} כניסות`;
      case 'trial_lesson':
        return 'שיעור ניסיון';
      default:
        return 'מוצר';
    }
  };

  // Format date in Hebrew
  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Handle cancel subscription button press
  const handleCancelPress = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setCancelModalVisible(true);
  }, []);

  // Confirm cancel subscription
  const handleConfirmCancel = useCallback(async () => {
    if (!selectedTransaction) return;
    
    setCancellingId(selectedTransaction.id);
    try {
      await cancelSubscription({
        variables: { id: selectedTransaction.id },
      });
    } catch (error) {
      console.error('[Profile] Cancel error:', error);
    }
  }, [selectedTransaction, cancelSubscription]);

  if (userLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFD1E3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - Studio Buda */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>סטודיו בודה</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section Title */}
        <View style={styles.profileTitleContainer}>
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
                  <Text style={styles.label}>שם:</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.value}>{currentUser.email}</Text>
                  <Text style={styles.label}>אימייל:</Text>
                </View>

                {currentUser.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.value}>{currentUser.phone}</Text>
                    <Text style={styles.label}>טלפון:</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Active Transactions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>מנויים וכרטיסיות פעילים</Text>
              {transactionsLoading ? (
                <ActivityIndicator size="small" color="#FFD1E3" />
              ) : activeTransactions.length > 0 ? (
                activeTransactions.map(transaction => (
                  <View key={transaction.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {getProductName(transaction)}
                    </Text>
                    
                    {/* Subscription details */}
                    {transaction.transactionType === 'subscription' && (
                      <>
                        <Text style={styles.cardText}>
                          כניסות חודשיות: {transaction.monthlyEntries || 0}
                        </Text>
                        <Text style={styles.cardText}>
                          נוצלו החודש: {transaction.entriesUsedThisMonth || 0}
                        </Text>
                        <Text style={styles.cardText}>
                          נותרו החודש: {(transaction.monthlyEntries || 0) - (transaction.entriesUsedThisMonth || 0)}
                        </Text>
                        {transaction.accessEndsDate && (
                          <Text style={styles.cardText}>
                            תוקף עד: {formatDate(transaction.accessEndsDate)}
                          </Text>
                        )}
                        {transaction.cardLast4 && (
                          <Text style={styles.cardTextSmall}>
                            💳 **** {transaction.cardLast4} {transaction.cardBrand && `(${transaction.cardBrand})`}
                          </Text>
                        )}
                        
                        {/* Cancel subscription button */}
                        <TouchableOpacity 
                          style={styles.cancelButton}
                          onPress={() => handleCancelPress(transaction)}
                          disabled={cancellingId === transaction.id}
                        >
                          {cancellingId === transaction.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.cancelButtonText}>ביטול מנוי</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                    
                    {/* Punch card details */}
                    {transaction.transactionType === 'punch_card' && (
                      <>
                        <Text style={styles.cardText}>
                          נותרו: {transaction.entriesRemaining || 0} מתוך {transaction.totalEntries || 0}
                        </Text>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${((transaction.entriesRemaining || 0) / (transaction.totalEntries || 1)) * 100}%` }
                            ]} 
                          />
                        </View>
                      </>
                    )}
                    
                    {/* Trial lesson */}
                    {transaction.transactionType === 'trial_lesson' && (
                      <Text style={styles.cardText}>
                        שיעור ניסיון פעיל
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>אין מנויים או כרטיסיות פעילים</Text>
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

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ ביטול מנוי</Text>
            
            <Text style={styles.modalText}>
              האם את/ה בטוח/ה שברצונך לבטל את המנוי?
            </Text>
            
            {selectedTransaction?.accessEndsDate && (
              <Text style={styles.modalWarning}>
                לאחר הביטול, תוכל/י להמשיך להשתמש במנוי עד לתאריך:{'\n'}
                <Text style={styles.modalDate}>{formatDate(selectedTransaction.accessEndsDate)}</Text>
                {'\n\n'}
                לאחר תאריך זה לא תוכל/י להירשם לשיעורים נוספים.
              </Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setCancelModalVisible(false);
                  setSelectedTransaction(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleConfirmCancel}
                disabled={cancellingId !== null}
              >
                {cancellingId !== null ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>אישור הביטול</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFD1E3', // Pink header background
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  profileTitleContainer: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD1E3', // Pink text
    textAlign: 'center',
    textShadowColor: 'rgba(78, 13, 102, 0.3)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
  cardTextSmall: {
    fontSize: 12,
    marginTop: 6,
    color: '#888',
    textAlign: 'right',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4E0D66',
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalWarning: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalDate: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
