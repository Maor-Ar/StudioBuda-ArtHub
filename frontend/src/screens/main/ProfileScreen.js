import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ME, GET_MY_REGISTRATIONS, GET_MY_TRANSACTIONS } from '../../services/graphql/queries';
import { CANCEL_SUBSCRIPTION } from '../../services/graphql/mutations';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';
import { PRODUCTS } from '../../utils/constants';
import TextModal from '../../components/TextModal';

// Terms of Service and Cancellation Policy content
const TERMS_CONTENT = `1. מבוא
ברוכים הבאים לאתר סטודיו בודה ("האתר", "אנו", "שלנו"), המציע קורסים, שיעורים וסדנאות ציור. כל שימוש באתר ובשירותים הניתנים בו כפוף לתנאים המפורטים במסמך זה. כל אדם המשתמש באתר מאשר כי הוא קרא, הבין ומסכים להיכנס להסכם זה.

2. זכויות יוצרים
כל התוכן המוצג באתר, לרבות אך לא מוגבל לתמונות, טקסטים, גרפיקה, לוגו, וידאו, שיטות לימוד וכולי, מוגן בזכויות יוצרים והינו רכושו של האתר או של צדדים שלישיים, ואין להעתיק, לשכפל או להפיץ את התוכן ללא הסכמתנו המפורשת בכתב.

3. גישה לשירותים
3.1 השימוש בשירותי האתר מותנה בהרשמה מראש ו/או יצירת חשבון אישי.

3.2 המשתמש מתחייב כי כל המידע שסיפק במסגרת ההרשמה נכון, מדויק ומעודכן.

3.3 אנו שומרים על הזכות לשלול את גישת המשתמש לאתר במקרה של הפרת תנאי השימוש או כל פעילות שמפרה את החוק.

4. מדיניות תשלום והחזרות
4.1 כל המחירים המופיעים באתר הם בשקלים חדשים וכוללים מע"מ, אלא אם כן צוין אחרת.

4.2 תשלום עבור קורסים וסדנאות יתבצע מראש באמצעות אמצעי התשלום הזמינים באתר.

4.3 בקשה להחזר כספי תתבצע בהתאם לתנאי הביטול של כל קורס או סדנא כפי שמופיעים בעת הרכישה.

5. תנאי ביטול
5.1 ביטול הרשמה לקורס או סדנה יכול להתבצע בתוך 7 ימים ממועד ההרשמה, בכפוף לתנאים המפורטים בדף הקורס.

5.2 במקרה של ביטול לאחר הזמן הנדרש, ייתכן ולא יינתן החזר כספי, או שההחזר יהיה חלקי בלבד.

6. אחריות
6.1 השימוש באתר ובשירותיו הינו על אחריות המשתמש בלבד.

6.2 האתר עושה כל מאמץ לספק שירותים ברמה הגבוהה ביותר, אך איננו אחראים לכל נזק ישיר או עקיף שייגרם למשתמש בעקבות השימוש בשירותים המוצעים באתר.

7. שינויי תנאי השימוש
אנו שומרים על הזכות לשנות את תנאי השימוש בכל עת, וללא הודעה מוקדמת. כל שינוי בתנאים יפורסם באתר ויתחייב מרגע פרסומו.

8. סיום השימוש
המשתמש רשאי להפסיק את השימוש באתר בכל עת, ואנו שומרים על הזכות להפסיק את השימוש מצדנו במקרה של הפרת תנאי השימוש.

9. כללי
9.1 תנאי שימוש אלו כפופים לחוקי מדינת ישראל, והם יפות לכל הליך משפטי שיתקיים במדינה זו.

9.2 כל מחלוקת הנוגעת לשימוש באתר תועבר להכרעה בלעדית לבית המשפט המוסמך בתל אביב.`;

// Privacy Policy content
const PRIVACY_CONTENT = `1. מבוא
מדיניות פרטיות זו מפרטת כיצד אנו אוספים, משתמשים ומגייסים את המידע האישי של המשתמשים באתר סטודיו בודה ("האתר", "אנו", "שלנו"). מדיניות זו חלה על כל המידע הנמסר לנו, בין אם במהלך השימוש באתר ובין אם במהלך הרשמה לשירותים השונים.

2. איסוף מידע אישי
2.1 בעת השימוש באתר, אנו עשויים לאסוף מידע אישי, כגון: שם, כתובת דוא"ל, פרטי יצירת קשר, פרטי תשלום, ומידע נוסף הנדרש לצורך מתן השירותים.

2.2 המידע הנאסף ישמש לשם מתן שירותים, יצירת קשר עם המשתמש, ושיפור חוויית השימוש באתר.

3. שימוש במידע אישי
3.1 המידע שנאסף ישמש אך ורק לצורך מטרותיו של האתר, כולל אך לא מוגבל לתקשורת עם המשתמש, חיוב בגין קורסים, משלוח חומר לימוד או מידע נוסף, וכן לצורך התאמת השירותים להעדפות המשתמש.

3.2 ייתכן ונשתף מידע אישי עם צדדים שלישיים במקרים הבאים:

במקרה של בקשות משפטיות או דרישה לפי החוק.
במקרים של שיתוף פעולה עם ספקי שירותים חיצוניים, אשר מסייעים לנו במתן השירותים (כגון חברות סליקת תשלומים).

4. שמירה על המידע
4.1 אנו ננקוט באמצעי אבטחה סבירים כדי להגן על המידע האישי שהוזן באתר.

4.2 למרות המאמצים שלנו, לא ניתן להבטיח הגנה מלאה על המידע, ואנו לא נהיה אחראים לכל נזק שיגרם כתוצאה משימוש לרעה במידע.

5. שימוש בעוגיות (Cookies)
האתר משתמש בקובצי עוגיות ("Cookies") כדי לשפר את חוויית השימוש של המשתמש. הקובצים עשויים לכלול מידע אודות הממשק, הגדרות המשתמש, ומידע נוסף שיסייע לנו לשפר את השירותים שלנו.

6. זכויות המשתמש
6.1 למשתמש יש את הזכות לבקש לעדכן, לתקן או למחוק את המידע האישי שנמצא ברשותנו.

6.2 המשתמש יכול לבחור שלא לקבל דיוורים שיווקיים על ידי עדכון ההגדרות בחשבון האישי או על ידי פנייה ישירה אלינו.

7. שינויים במדיניות פרטיות
אנו שומרים על הזכות לשנות את מדיניות הפרטיות בכל עת, וללא הודעה מראש. כל שינוי ייכנס לתוקף מרגע פרסומו באתר.

8. פניות
באם יש לך שאלות אודות מדיניות הפרטיות שלנו, אתה מוזמן לפנות אלינו בכתובת דוא"ל: yaarabuda1@gmail.com.`;

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, transactions: contextTransactions, logout, updateTransactions } = useAuth();
  
  // Cancel subscription modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  
  // Terms and Privacy modals state
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

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

        {/* Legal Links Section */}
        <View style={styles.legalSection}>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => setTermsModalVisible(true)}
          >
            <Text style={styles.legalLinkText}>תנאי שימוש ומדיניות ביטולים</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <Text style={styles.legalLinkText}>מדיניות פרטיות</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Information - RTL: field name on right, details on left */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>פרטי קשר</Text>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('tel:0556646033')}
          >
            <Text style={styles.contactValue}>055-664-6033 </Text>
            <Text style={styles.contactLabel}>טלפון לבירורים:</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Text style={styles.contactValue}>תל חי 39 כפר סבא, קומה 1  </Text>
            <Text style={styles.contactLabel}>כתובת הסטודיו: </Text>
          </View>
        </View>

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

      {/* Terms of Service Modal */}
      <TextModal
        visible={termsModalVisible}
        title="תנאי שימוש ומדיניות ביטולים"
        content={TERMS_CONTENT}
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <TextModal
        visible={privacyModalVisible}
        title="מדיניות פרטיות"
        content={PRIVACY_CONTENT}
        onClose={() => setPrivacyModalVisible(false)}
      />
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
  legalSection: {
    backgroundColor: 'rgba(255, 209, 227, 0.9)',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
  },
  legalLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
  },
  legalLinkText: {
    fontSize: 15,
    color: '#4E0D66',
    textAlign: 'center',
    fontWeight: '600',
  },
  contactSection: {
    backgroundColor: 'rgba(255, 209, 227, 0.9)',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'right',
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(78, 13, 102, 0.1)',
  },
  contactLabel: {
    fontSize: 14,
    color: '#5D3587',
    fontWeight: '500',
    marginEnd: 10,
    textAlign: 'right',
  },
  contactValue: {
    fontSize: 15,
    color: '#4E0D66',
    fontWeight: '600',
    textAlign: 'right',
  },
});

export default ProfileScreen;
