import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthenticatedLayout from '../../components/AuthenticatedLayout';
import EventCard from '../../components/EventCard';
import EventDetailModal from '../../components/EventDetailModal';
import {
  REGISTRATION_AUTO_CLOSED_HELP,
  REGISTRATION_AUTO_CLOSED_LABEL,
} from '../../utils/constants';

const daysOfWeek = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];

const buildMockClosedEvent = () => {
  const now = new Date();
  const start = new Date(now.getTime() + 30 * 60 * 1000); // starts in 30 minutes
  const occurrenceDate = new Date(start);
  occurrenceDate.setHours(0, 0, 0, 0);
  const hours = String(start.getHours()).padStart(2, '0');
  const minutes = String(start.getMinutes()).padStart(2, '0');

  return {
    id: 'sandbox-closed-class',
    title: 'ציור בשמן - מתחילות',
    description: 'שיעור דמו לסימולציה בלבד. אין שינוי בנתונים אמיתיים.',
    instructorName: 'יערה בודה',
    startTime: `${hours}:${minutes}`,
    duration: 90,
    maxRegistrations: 8,
    registeredCount: 0,
    availableSpots: 0,
    eventType: 'subscription_only',
    isActive: true,
    isCancelled: false,
    isRegistrationClosed: true,
    cancellationReason: null,
    occurrenceDate: occurrenceDate.toISOString(),
    date: occurrenceDate.toISOString(),
    isRecurring: true,
    isInstance: true,
  };
};

const SandboxRegistrationClosedScreen = () => {
  const insets = useSafeAreaInsets();
  const mockEvent = useMemo(() => buildMockClosedEvent(), []);
  const [modalVisible, setModalVisible] = useState(false);

  const selectedDate = useMemo(() => new Date(mockEvent.occurrenceDate), [mockEvent]);
  const weekDates = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [selectedDate]);

  return (
    <AuthenticatedLayout>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.banner}>
          <Text style={styles.bannerEyebrow}>SANDBOX · MOCK ONLY</Text>
          <Text style={styles.bannerTitle}>תצוגת שיעור שנסגר להרשמה</Text>
          <Text style={styles.bannerBody}>
            דף זה לא מחובר ליומן האמיתי ולא משנה נתונים. כניסה רק דרך כתובת ישירה.
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>סטודיו בודה</Text>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tab}>
            <Text style={styles.tabText}>הרישומים שלי</Text>
          </View>
          <View style={styles.tab}>
            <Text style={[styles.tabText, styles.tabTextActive]}>יומן</Text>
            <Image
              source={require('../../assets/Underline-stroke.png')}
              style={styles.tabUnderline}
              resizeMode="stretch"
            />
          </View>
        </View>

        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const selected = date.toDateString() === selectedDate.toDateString();
            return (
              <View key={date.toISOString()} style={styles.dayColumn}>
                <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>
                  {daysOfWeek[index]}
                </Text>
                <View style={[styles.dayCircle, selected && styles.dayCircleActive]}>
                  <Text style={[styles.dayNumber, selected && styles.dayNumberActive]}>
                    {date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <ScrollView
          style={styles.eventsContainer}
          contentContainerStyle={styles.eventsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHint}>
            מצב מדומה: 0 נרשמות, פחות משעה לתחילה → {REGISTRATION_AUTO_CLOSED_LABEL}
          </Text>
          <Text style={styles.sectionSubhint}>{REGISTRATION_AUTO_CLOSED_HELP}</Text>

          <EventCard
            event={mockEvent}
            isRegistered={false}
            isFull={false}
            isPast={false}
            isCancelled={false}
            isRegistrationClosed
            onPress={() => setModalVisible(true)}
            onRegister={() => setModalVisible(true)}
          />

          <TouchableOpacity
            style={styles.openModalButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.openModalButtonText}>פתח את חלון הפרטים</Text>
          </TouchableOpacity>
        </ScrollView>

        <EventDetailModal
          visible={modalVisible}
          event={mockEvent}
          onClose={() => setModalVisible(false)}
          isRegistered={false}
          isFull={false}
          isPast={false}
          isCancelled={false}
          isRegistrationClosed
          isAdmin={false}
        />
      </View>
    </AuthenticatedLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 209, 227, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(78, 13, 102, 0.18)',
  },
  bannerEyebrow: {
    color: '#AB5FBD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'right',
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#4E0D66',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  bannerBody: {
    marginTop: 4,
    color: '#5D3587',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  header: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: '#FFD1E3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tab: {
    alignItems: 'center',
    minWidth: 90,
  },
  tabText: {
    color: 'rgba(255, 209, 227, 0.7)',
    fontSize: 18,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFD1E3',
  },
  tabUnderline: {
    width: 78,
    height: 10,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  dayColumn: {
    alignItems: 'center',
    width: 40,
  },
  dayLabel: {
    color: 'rgba(255, 209, 227, 0.75)',
    fontSize: 13,
    marginBottom: 6,
  },
  dayLabelActive: {
    color: '#FFD1E3',
    fontWeight: '700',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#FFD1E3',
  },
  dayNumber: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '600',
  },
  dayNumberActive: {
    color: '#4E0D66',
  },
  eventsContainer: {
    flex: 1,
  },
  eventsContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHint: {
    color: '#FFD1E3',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  sectionSubhint: {
    color: 'rgba(255, 209, 227, 0.8)',
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 14,
  },
  openModalButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 209, 227, 0.18)',
    borderWidth: 1,
    borderColor: '#FFD1E3',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  openModalButtonText: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SandboxRegistrationClosedScreen;
