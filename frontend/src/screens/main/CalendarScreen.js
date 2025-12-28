import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventCard from '../../components/EventCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('יומן'); // 'יומן' or 'הרישומים שלי'
  
  // Initialize with current date
  const today = new Date();
  const [selectedDateObj, setSelectedDateObj] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  // Mock events data - replace with actual data from GraphQL
  const mockEvents = [
    {
      id: '1',
      title: 'שיעור רישום',
      instructorName: 'יערה בודה',
      startTime: '18:00',
      duration: 90,
      registeredCount: 4,
      maxRegistrations: 6,
      availableSpots: 2,
    },
    {
      id: '2',
      title: 'שיעור רישום',
      instructorName: 'יערה בודה',
      startTime: '18:00',
      duration: 90,
      registeredCount: 4,
      maxRegistrations: 6,
      availableSpots: 2,
    },
  ];

  const formatMonthYear = (date) => {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Get the week containing the selected date
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

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={handlePreviousWeek} style={styles.arrowButton}>
            <Text style={styles.arrowText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{displayMonth}</Text>
          <TouchableOpacity onPress={handleNextWeek} style={styles.arrowButton}>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Days of Week */}
        <View style={styles.daysOfWeekContainer}>
          {daysOfWeek.map((day, index) => (
            <View key={index} style={styles.dayOfWeek}>
              <Text style={styles.dayOfWeekText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Date Selection */}
        <View style={styles.datesContainer}>
          {weekDates.map((date, index) => {
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
          {mockEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              onRegister={() => handleRegister(event.id)}
              isRegistered={index === 0} // First event is registered for demo
            />
          ))}
        </ScrollView>
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
  },
  arrowText: {
    fontSize: 20,
    color: '#FFD1E3', // Pink arrows
    fontWeight: 'bold',
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
});

export default CalendarScreen;
