import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { GET_EVENTS } from '../../services/graphql/queries';
import EventCard from '../../components/EventCard';
import EventDetailModal from '../../components/EventDetailModal';
import { showErrorToast } from '../../utils/toast';
import LeftArrow from '../../assets/icons/LeftArrow.svg';
import RightArrow from '../../assets/icons/RightArrow.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to get week dates (defined outside component to avoid hoisting issues)
const getWeekDates = (date) => {
  const weekDates = [];
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek); // Go to Sunday of the week

  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(startOfWeek);
    weekDate.setDate(startOfWeek.getDate() + i);
    weekDates.push(weekDate);
  }
  return weekDates;
};

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('יומן'); // 'יומן' or 'הרישומים שלי'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize with current date
  const today = new Date();
  const [selectedDateObj, setSelectedDateObj] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  // Calculate date range for the current week
  const dateRange = useMemo(() => {
    const weekDates = getWeekDates(selectedDateObj);
    const startDate = weekDates[0].toISOString();
    const endDate = new Date(weekDates[6]);
    endDate.setHours(23, 59, 59, 999);
    return {
      startDate,
      endDate: endDate.toISOString(),
    };
  }, [selectedDateObj]);

  // Fetch events from GraphQL
  const { data, loading, error } = useQuery(GET_EVENTS, {
    variables: {
      dateRange,
    },
    fetchPolicy: 'cache-and-network',
  });

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      showErrorToast('לא הצלחנו לטעון את האירועים, נסה שוב');
    }
  }, [error]);

  // Filter and sort events for the selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!data?.events) return [];

    const selectedDateString = selectedDateObj.toISOString().split('T')[0];
    const selectedDayOfWeek = selectedDateObj.getDay();

    const filteredEvents = data.events.filter((event) => {
      // For event instances (generated from recurring events), check occurrenceDate
      if (event.isInstance && event.occurrenceDate) {
        const occurrenceDateString = new Date(event.occurrenceDate).toISOString().split('T')[0];
        return occurrenceDateString === selectedDateString;
      }

      // For recurring events (base events), check if they occur on the selected day of week
      if (event.isRecurring && !event.isInstance) {
        const eventDate = new Date(event.date);
        const eventDayOfWeek = eventDate.getDay();
        return eventDayOfWeek === selectedDayOfWeek;
      }

      // For one-time events, check exact date match
      const eventDateString = new Date(event.date).toISOString().split('T')[0];
      return eventDateString === selectedDateString;
    });

    // Sort by start time in ascending order (earliest first, top to bottom)
    return filteredEvents.sort((a, b) => {
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      // Compare times (HH:mm format)
      if (timeA < timeB) return -1; // Earlier time comes first
      if (timeA > timeB) return 1;
      return 0;
    });
  }, [data, selectedDateObj]);

  const formatMonthYear = (date) => {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDateObj), [selectedDateObj]);

  // Get month name based on selected date
  const displayMonth = useMemo(() => formatMonthYear(selectedDateObj), [selectedDateObj]);

  // Debug: Print selected date (only in development)
  if (__DEV__) {
    console.log('Selected Date:', selectedDateObj.toLocaleDateString('he-IL'));
  }

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDateObj);
    newDate.setDate(selectedDateObj.getDate() - 7); // Go back one week
    setSelectedDateObj(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDateObj);
    newDate.setDate(selectedDateObj.getDate() + 7); // Go forward one week
    setSelectedDateObj(newDate);
  };

  const handleDateSelect = (date) => {
    setSelectedDateObj(date);
  };

  const handleRegister = (eventId) => {
    // TODO: Implement registration logic
    console.log('Register for event:', eventId);
  };

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  // Days of week in Hebrew (RTL) - Sunday to Saturday
  const daysOfWeek = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];

  // Check if a date is selected
  const isDateSelected = (date) => {
    return date.toDateString() === selectedDateObj.toDateString();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>סטודיו בודה</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('הרישומים שלי')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'הרישומים שלי' && styles.tabTextActive
            ]}>
              הרישומים שלי
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('יומן')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'יומן' && styles.tabTextActive
            ]}>
              יומן
            </Text>
          </TouchableOpacity>
          {/* Underline - positioned based on selected tab */}
          <View style={[
            styles.underlineContainer,
            selectedTab === 'יומן' ? styles.underlineRight : styles.underlineLeft
          ]}>
            <Image 
              source={require('../../assets/Underline-stroke.png')} 
              style={styles.tabUnderline}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Month Navigation - RTL: Right arrow = previous week, Left arrow = next week */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={handleNextWeek} style={styles.arrowButton}>
            <LeftArrow width={23} height={23} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{displayMonth}</Text>
          <TouchableOpacity onPress={handlePreviousWeek} style={styles.arrowButton}>
            <RightArrow width={23} height={23} />
          </TouchableOpacity>
        </View>

        {/* Days of Week - RTL: Saturday to Sunday */}
        <View style={styles.daysOfWeekContainer}>
          {[...daysOfWeek].reverse().map((day, index) => (
            <View key={index} style={styles.dayOfWeek}>
              <Text style={styles.dayOfWeekText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Date Selection - RTL: Saturday to Sunday */}
        <View style={styles.datesContainer}>
          {[...weekDates].reverse().map((date, index) => {
            const isSelected = isDateSelected(date);
            return (
              <TouchableOpacity
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                style={[
                  styles.dateCircle,
                  isSelected && styles.dateCircleSelected
                ]}
                onPress={() => handleDateSelect(date)}
              >
                <Text style={[
                  styles.dateText,
                  isSelected && styles.dateTextSelected
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Events List - transparent background to show global purple + logo */}
        <ScrollView
          style={[styles.eventsContainer, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[styles.eventsContent, { backgroundColor: 'transparent' }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#AB5FBD" />
              <Text style={styles.loadingText}>טוען אירועים...</Text>
            </View>
          ) : eventsForSelectedDate.length > 0 ? (
            eventsForSelectedDate.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegister={() => handleRegister(event.id)}
                onPress={() => handleEventPress(event)}
                isRegistered={false} // TODO: Check user's registrations
              />
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>אין שיעורים מתוכננים ליום זה</Text>
            </View>
          )}
        </ScrollView>

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          visible={modalVisible}
          onClose={handleCloseModal}
          onRegister={() => {
            if (selectedEvent) {
              handleRegister(selectedEvent.id);
            }
            handleCloseModal();
          }}
          isRegistered={false} // TODO: Check user's registrations
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#FFD1E3',
    position: 'relative',
  },
  tab: {
    marginHorizontal: 20,
    position: 'relative',
  },
  tabText: {
    fontSize: 20,
    color: '#5D3587', // Purple
    fontWeight: '500',
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple when active
  },
  underlineContainer: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH * 0.5, // Half of view width
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  underlineLeft: {
    left: 0, // Left half
  },
  underlineRight: {
    right: 0, // Right half
  },
  tabUnderline: {
    width: '100%',
    height: 6,
    transform: [{ translateY: -10 }],
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: '#5D3587', // Dark purple background
  },
  arrowButton: {
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    color: '#FFD1E3', // Pink text
    fontWeight: '600',
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 25,
    paddingVertical: 8,
    backgroundColor: '#5D3587', // Dark purple background
  },
  dayOfWeek: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 14,
    color: '#FFD1E3', // Pink text
    fontWeight: '500',
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: '#5D3587', // Dark purple background
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AB5FBD', // Purple circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCircleSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF', // White background when selected
    borderWidth: 2,
    borderColor: '#FFD1E3', // Pink border
  },
  dateText: {
    fontSize: 20,
    color: '#FFD1E3', // Pink text
    fontWeight: '500',
  },
  dateTextSelected: {
    color: '#4E0D66', // Dark purple when selected
    fontWeight: 'bold',
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 20,
    backgroundColor: 'transparent', // TRANSPARENT - shows global purple background + logo
  },
  eventsContent: {
    paddingBottom: 120, // Space for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FFD1E3',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#FFD1E3',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CalendarScreen;
