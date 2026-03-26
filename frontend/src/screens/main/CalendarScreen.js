import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useCachedEvents, clearEventsCacheForRange } from '../../hooks/useCachedEvents';
import {
  REGISTER_FOR_EVENT,
  CANCEL_REGISTRATION,
  ADMIN_CANCEL_REGISTRATION,
  ADMIN_RESERVE_SPOT,
  ADMIN_REMOVE_RESERVED_SPOT,
  ADMIN_CANCEL_EVENT_OCCURRENCE,
  ADMIN_REENABLE_EVENT_OCCURRENCE,
} from '../../services/graphql/mutations';
import { GET_MY_REGISTRATIONS, GET_EVENT_REGISTRATIONS, GET_MY_TRANSACTIONS } from '../../services/graphql/queries';
import EventCard from '../../components/EventCard';
import EventDetailModal from '../../components/EventDetailModal';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { getGraphQLErrorMessage } from '../../utils/errorMessages';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';
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

const getLocalDateKey = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, updateTransactions } = useAuth();
  const apolloClient = useApolloClient();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const [selectedTab, setSelectedTab] = useState('יומן'); // 'יומן' or 'הרישומים שלי'
  const [tabLabelWidths, setTabLabelWidths] = useState({
    calendar: 0,
    myRegistrations: 0,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingRegistrationId, setRemovingRegistrationId] = useState(null);
  const didAutoSwitchInitialDateRef = useRef(false);

  // Initialize with current date
  const today = new Date();
  const [selectedDateObj, setSelectedDateObj] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const refreshMyTransactions = async () => {
    try {
      const { data: txData } = await apolloClient.query({
        query: GET_MY_TRANSACTIONS,
        fetchPolicy: 'network-only',
      });
      if (txData?.myTransactions) {
        updateTransactions(txData.myTransactions);
      }
    } catch (txError) {
      console.warn('[TRANSACTIONS] Failed to refresh user transactions:', txError);
    }
  };

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

  // Fetch events from GraphQL with caching
  const { data, loading, error, refetch: refetchEvents } = useCachedEvents(dateRange);
  
  // Log events data changes
  useEffect(() => {
    console.log('[EVENTS DATA] 📊 Events data changed:', data);
    console.log('[EVENTS DATA] 📊 Events list:', data?.events);
    if (data?.events) {
      console.log('[EVENTS DATA] 📊 Events count:', data.events.length);
      data.events.forEach((event, index) => {
        console.log(`[EVENTS DATA] 📊 Event ${index}:`, {
          id: event.id,
          baseEventId: event.baseEventId,
          title: event.title,
          date: event.date,
          occurrenceDate: event.occurrenceDate,
          registeredCount: event.registeredCount,
          maxRegistrations: event.maxRegistrations,
          availableSpots: event.availableSpots,
        });
      });
    }
  }, [data]);

  // Keep the modal's selected event in sync with the latest events query result
  // (so cancellationReason / isCancelled updates are immediately visible).
  useEffect(() => {
    if (!selectedEvent?.id || !data?.events) return;
    const updated = data.events.find((e) => e.id === selectedEvent.id);
    if (updated) setSelectedEvent(updated);
  }, [data?.events, selectedEvent?.id]);

  // Fetch user registrations
  const { data: registrationsData, loading: registrationsLoading, refetch: refetchRegistrations } = useQuery(GET_MY_REGISTRATIONS);
  
  // Log registrations data changes
  useEffect(() => {
    console.log('[REGISTRATIONS DATA] 📊 Registrations data changed:', registrationsData);
    console.log('[REGISTRATIONS DATA] 📊 My registrations:', registrationsData?.myRegistrations);
    if (registrationsData?.myRegistrations) {
      console.log('[REGISTRATIONS DATA] 📊 Registrations count:', registrationsData.myRegistrations.length);
      registrationsData.myRegistrations.forEach((registration, index) => {
        console.log(`[REGISTRATIONS DATA] 📊 Registration ${index}:`, {
          id: registration.id,
          eventId: registration.eventId,
          date: registration.date,
          occurrenceDate: registration.occurrenceDate,
          status: registration.status,
          event: registration.event,
        });
      });
    }
  }, [registrationsData]);

  // Registration mutation
  const [registerForEvent, { loading: registering }] = useMutation(REGISTER_FOR_EVENT, {
    refetchQueries: [
      { query: GET_MY_REGISTRATIONS },
      // Note: GET_EVENTS is refetched manually via refetchEvents() to clear our custom cache
    ],
    awaitRefetchQueries: true, // Wait for refetch queries to complete
    onCompleted: async (mutationData) => {
      console.log('[REGISTRATION] ✅ Registration mutation completed successfully');
      console.log('[REGISTRATION] Response data:', mutationData);
      try {
        // Clear cache for the current week to force fresh data
        console.log('[REGISTRATION] Clearing cache for date range...');
        clearEventsCacheForRange(dateRange);
        
        // Refetch events and registrations to get updated data from DB
        console.log('[REGISTRATION] Refetching events and registrations...');
        const [eventsResult, registrationsResult] = await Promise.all([refetchEvents(), refetchRegistrations()]);
        await refreshMyTransactions();
        console.log('[REGISTRATION] ✅ Events and registrations refetched successfully');
        console.log('[REGISTRATION] 📊 Events result:', eventsResult);
        console.log('[REGISTRATION] 📊 Events data:', eventsResult?.data);
        console.log('[REGISTRATION] 📊 Events list:', eventsResult?.data?.events);
        console.log('[REGISTRATION] 📊 Registrations result:', registrationsResult);
        console.log('[REGISTRATION] 📊 Registrations data:', registrationsResult?.data);
        console.log('[REGISTRATION] 📊 My registrations:', registrationsResult?.data?.myRegistrations);
        
        // Show success message
        showSuccessToast('נרשמת בהצלחה לשיעור!');
        
        // Close modal if open
        if (modalVisible) {
          setModalVisible(false);
          setSelectedEvent(null);
        }
      } catch (refetchError) {
        console.error('[REGISTRATION] ❌ Error refetching events after registration:', refetchError);
        // Still show success since registration was successful
        showSuccessToast('נרשמת בהצלחה לשיעור!');
      }
    },
    onError: (error) => {
      console.error('[REGISTRATION] ❌ Registration mutation failed');
      console.error('[REGISTRATION] Error object:', error);
      console.error('[REGISTRATION] GraphQL errors:', error.graphQLErrors);
      console.error('[REGISTRATION] Network error:', error.networkError);
      if (error.networkError) {
        console.error('[REGISTRATION] Network error details:', {
          statusCode: error.networkError.statusCode,
          result: error.networkError.result,
          message: error.networkError.message
        });
      }
      const friendlyMessage = getGraphQLErrorMessage(error);
      console.error('[REGISTRATION] Friendly error message:', friendlyMessage);
      showErrorToast(friendlyMessage);
    },
  });

  // Cancel registration mutation
  const [cancelRegistration, { loading: cancelling }] = useMutation(CANCEL_REGISTRATION, {
    refetchQueries: [{ query: GET_MY_REGISTRATIONS }],
    onCompleted: async () => {
      try {
        // Clear cache and refetch events
        clearEventsCacheForRange(dateRange);
        await refetchEvents();
        await refetchRegistrations();
        await refreshMyTransactions();
        showSuccessToast('הרישום בוטל בהצלחה');
      } catch (error) {
        console.error('[CANCELLATION] Error refetching after cancellation:', error);
        showSuccessToast('הרישום בוטל בהצלחה');
      }
    },
    onError: (error) => {
      const friendlyMessage = getGraphQLErrorMessage(error);
      // Check if it's the 5-hour restriction error
      if (error.message?.includes('5 שעות') || friendlyMessage.includes('5 שעות')) {
        showErrorToast('לא ניתן לבטל רישום פחות מ-5 שעות לפני תחילת השיעור');
      } else {
        showErrorToast(friendlyMessage);
      }
    },
  });

  const [adminReserveSpot, { loading: reservingSpot }] = useMutation(ADMIN_RESERVE_SPOT, {
    onCompleted: async () => {
      try {
        clearEventsCacheForRange(dateRange);
        await refetchEvents();
        showSuccessToast('המקום שוריין בהצלחה');
      } catch (error) {
        console.error('[ADMIN RESERVE] Error refetching after reserve:', error);
        showSuccessToast('המקום שוריין בהצלחה');
      }
    },
    onError: (error) => {
      const friendlyMessage = getGraphQLErrorMessage(error);
      showErrorToast(friendlyMessage);
    },
  });

  const [adminRemoveReservedSpot, { loading: removingReservedSpot }] = useMutation(ADMIN_REMOVE_RESERVED_SPOT, {
    onCompleted: async () => {
      try {
        clearEventsCacheForRange(dateRange);
        await refetchEvents();
        showSuccessToast('המקום השמור הוסר בהצלחה');
      } catch (error) {
        console.error('[ADMIN REMOVE RESERVE] Error refetching after remove:', error);
        showSuccessToast('המקום השמור הוסר בהצלחה');
      }
    },
    onError: (error) => {
      const friendlyMessage = getGraphQLErrorMessage(error);
      showErrorToast(friendlyMessage);
    },
  });

  const [adminCancelEventOccurrence, { loading: adminCancellingOccurrence }] = useMutation(
    ADMIN_CANCEL_EVENT_OCCURRENCE,
    {
      onCompleted: async () => {
        try {
          clearEventsCacheForRange(dateRange);
          await Promise.all([
            refetchEvents(),
            refetchRegistrations(),
            refetchEventRegistrations(),
          ]);
          await refreshMyTransactions();
          showSuccessToast('האירוע בוטל לתאריך הנבחר');
        } catch (error) {
          console.error('[ADMIN CANCEL EVENT OCCURRENCE] Error refetching:', error);
          showSuccessToast('האירוע בוטל לתאריך הנבחר');
        }
      },
      onError: (e) => {
        const friendlyMessage = getGraphQLErrorMessage(e);
        showErrorToast(friendlyMessage);
      },
    }
  );

  const [adminReenableEventOccurrence, { loading: adminReenablingOccurrence }] = useMutation(
    ADMIN_REENABLE_EVENT_OCCURRENCE,
    {
      onCompleted: async () => {
        try {
          clearEventsCacheForRange(dateRange);
          await Promise.all([
            refetchEvents(),
            refetchRegistrations(),
            refetchEventRegistrations(),
          ]);
          await refreshMyTransactions();
          showSuccessToast('האירוע הופעל מחדש לתאריך הנבחר');
        } catch (error) {
          console.error('[ADMIN REENABLE EVENT OCCURRENCE] Error refetching:', error);
          showSuccessToast('האירוע הופעל מחדש לתאריך הנבחר');
        }
      },
      onError: (e) => {
        const friendlyMessage = getGraphQLErrorMessage(e);
        showErrorToast(friendlyMessage);
      },
    }
  );

  const {
    data: eventRegistrationsData,
    loading: eventRegistrationsLoading,
    refetch: refetchEventRegistrations,
  } = useQuery(GET_EVENT_REGISTRATIONS, {
    variables: { eventId: selectedEvent?.id || '' },
    skip: !isAdmin || !selectedEvent || !modalVisible,
    fetchPolicy: 'network-only',
  });

  const [adminCancelRegistration] = useMutation(ADMIN_CANCEL_REGISTRATION, {
    onCompleted: async () => {
      try {
        clearEventsCacheForRange(dateRange);
        await Promise.all([
          refetchEvents(),
          refetchRegistrations(),
          refetchEventRegistrations(),
        ]);
        await refreshMyTransactions();
        showSuccessToast('הרישום הוסר בהצלחה');
      } catch (error) {
        console.error('[ADMIN CANCEL REGISTRATION] Error refetching after removal:', error);
        showSuccessToast('הרישום הוסר בהצלחה');
      } finally {
        setRemovingRegistrationId(null);
      }
    },
    onError: (error) => {
      const friendlyMessage = getGraphQLErrorMessage(error);
      showErrorToast(friendlyMessage);
      setRemovingRegistrationId(null);
    },
  });

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      showErrorToast('לא הצלחנו לטעון את האירועים, נסה שוב');
    }
  }, [error]);

  // Filter and sort events for the selected date
  const eventsForSelectedDate = useMemo(() => {
    console.log('[EVENTS FILTER] 🔄 Filtering events for selected date');
    console.log('[EVENTS FILTER] 📊 data?.events:', data?.events);
    console.log('[EVENTS FILTER] 📊 selectedDateObj:', selectedDateObj);
    
    if (!data?.events) {
      console.log('[EVENTS FILTER] ⚠️ No events data, returning empty array');
      return [];
    }

    // Normalize selected date to local date string (YYYY-MM-DD) for comparison
    const selectedYear = selectedDateObj.getFullYear();
    const selectedMonth = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
    const selectedDay = String(selectedDateObj.getDate()).padStart(2, '0');
    const selectedDateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    const selectedDayOfWeek = selectedDateObj.getDay();
    console.log('[EVENTS FILTER] 📊 selectedDateString:', selectedDateString);
    console.log('[EVENTS FILTER] 📊 selectedDayOfWeek:', selectedDayOfWeek);

    // Helper function to get local date string from a Date object or ISO string
    const getLocalDateString = (dateValue) => {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const filteredEvents = data.events.filter((event) => {
      // For event instances (generated from recurring events), check occurrenceDate
      if (event.isInstance && event.occurrenceDate) {
        const occurrenceDateString = getLocalDateString(event.occurrenceDate);
        return occurrenceDateString === selectedDateString;
      }

      // For recurring events (base events), check if they occur on the selected day of week
      if (event.isRecurring && !event.isInstance) {
        const eventDate = new Date(event.date);
        const eventDayOfWeek = eventDate.getDay();
        return eventDayOfWeek === selectedDayOfWeek;
      }

      // For one-time events, check exact date match
      const eventDateString = getLocalDateString(event.date);
      return eventDateString === selectedDateString;
    });

    // Sort by start time in ascending order (earliest first, top to bottom)
    const sortedEvents = filteredEvents.sort((a, b) => {
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      // Compare times (HH:mm format)
      if (timeA < timeB) return -1; // Earlier time comes first
      if (timeA > timeB) return 1;
      return 0;
    });
    
    console.log('[EVENTS FILTER] ✅ Filtered events count:', sortedEvents.length);
    sortedEvents.forEach((event, index) => {
      console.log(`[EVENTS FILTER] 📊 Filtered event ${index}:`, {
        id: event.id,
        baseEventId: event.baseEventId,
        title: event.title,
        registeredCount: event.registeredCount,
        maxRegistrations: event.maxRegistrations,
        availableSpots: event.availableSpots,
      });
    });
    
    return sortedEvents;
  }, [data, selectedDateObj]);

  // Process user registrations for "הרישומים שלי" tab - future only (today+)
  const futureRegisteredEvents = useMemo(() => {
    if (!registrationsData?.myRegistrations) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const futureRegistrations = registrationsData.myRegistrations.filter((registration) => {
      // Show:
      // - confirmed registrations
      // - registrations cancelled due to an admin cancelling the occurrence (not user-initiated cancellation)
      if (registration.status === 'confirmed') {
        // ok
      } else if (registration.status === 'cancelled') {
        if (!registration.event?.isCancelled) return false;
      } else {
        return false;
      }
      const eventDate = new Date(registration.occurrenceDate || registration.event?.date);
      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      return eventDay >= todayStart;
    });

    // Merge registration data with event data to create full event objects
    const events = futureRegistrations.map((registration) => {
      const event = registration.event;
      const occurrenceDate = new Date(registration.occurrenceDate || event.date);
      const dateKey = occurrenceDate.toISOString().split('T')[0];
      
      return {
        // For recurring occurrences we need an "instance-like" id (baseEventId + dateKey)
        // because backend resolvers parse the date from the id.
        id: `${event.id}_${dateKey}`,
        title: event.title,
        date: occurrenceDate.toISOString(),
        occurrenceDate: occurrenceDate.toISOString(),
        startTime: event.startTime,
        duration: event.duration || 90, // Default duration if not provided
        description: '', // Description not in registration query
        instructorName: event.instructorName, // Use from event data
        maxRegistrations: event.maxRegistrations, // Use from event data
        eventType: event.eventType,
        isRecurring: false, // Treat as instance
        isInstance: true,
        baseEventId: event.id,
        registeredCount: event.registeredCount || 0, // Use from event data (calculated by backend)
        availableSpots: event.availableSpots || 0, // Use from event data (calculated by backend)
        isCancelled: event.isCancelled ?? false,
        cancellationReason: event.cancellationReason ?? null,
        registrationId: registration.id, // Store registration ID for cancellation
      };
    });

    // Sort by date (earliest first)
    return events.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      // If same date, sort by time
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      return 0;
    });
  }, [registrationsData]);

  // Create a map of user registrations by event ID + date for quick lookup
  const userRegistrationsMap = useMemo(() => {
    console.log('[REGISTRATIONS MAP] 🔄 Recalculating userRegistrationsMap');
    console.log('[REGISTRATIONS MAP] 📊 registrationsData:', registrationsData);
    console.log('[REGISTRATIONS MAP] 📊 myRegistrations:', registrationsData?.myRegistrations);
    
    if (!registrationsData?.myRegistrations) {
      console.log('[REGISTRATIONS MAP] ⚠️ No registrations data, returning empty map');
      return new Map();
    }
    
    const map = new Map();
    registrationsData.myRegistrations.forEach((registration) => {
      if (registration.status === 'confirmed') {
        const eventId = registration.eventId;
        // Use date field first (stored in registration), then occurrenceDate, then event.date
        const regDate = registration.date || registration.occurrenceDate || registration.event?.date;
        if (!regDate) {
          console.log('[REGISTRATIONS MAP] ⚠️ Skipping registration with no date:', registration);
          return; // Skip if no date available
        }
        
        const occurrenceDate = new Date(regDate);
        // Normalize to YYYY-MM-DD format (UTC, no time component)
        const dateKey = occurrenceDate.toISOString().split('T')[0];
        const key = `${eventId}_${dateKey}`;
        console.log('[REGISTRATIONS MAP] ✅ Adding registration:', { eventId, dateKey, key, registration });
        map.set(key, registration);
      } else {
        console.log('[REGISTRATIONS MAP] ⚠️ Skipping non-confirmed registration:', registration.status);
      }
    });
    console.log('[REGISTRATIONS MAP] ✅ Final map size:', map.size);
    console.log('[REGISTRATIONS MAP] ✅ Map keys:', Array.from(map.keys()));
    return map;
  }, [registrationsData]);

  // Calculate registration status for selected event in modal
  const selectedEventRegistration = useMemo(() => {
    if (!selectedEvent) return null;
    
    const eventId = selectedEvent.baseEventId || selectedEvent.id;
    const eventDateValue = selectedEvent.occurrenceDate || selectedEvent.date;
    if (!eventDateValue) return null;
    
    const eventDate = new Date(eventDateValue);
    const dateKey = eventDate.toISOString().split('T')[0];
    const registrationKey = `${eventId}_${dateKey}`;
    return userRegistrationsMap.get(registrationKey) || null;
  }, [selectedEvent, userRegistrationsMap]);

  const formatMonthYear = (date) => {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDateObj), [selectedDateObj]);

  useEffect(() => {
    if (selectedTab !== 'יומן' || loading || !data?.events || didAutoSwitchInitialDateRef.current) {
      return;
    }

    const todayDate = new Date();
    const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const selectedStart = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth(),
      selectedDateObj.getDate()
    );

    // Apply this auto-selection behavior only for the initial "today" date.
    if (selectedStart.getTime() !== todayStart.getTime()) {
      return;
    }

    if (eventsForSelectedDate.length > 0) {
      didAutoSwitchInitialDateRef.current = true;
      return;
    }

    const weekDateKeys = weekDates.map(getLocalDateKey);
    const weekDateSet = new Set(weekDateKeys);
    const todayKey = getLocalDateKey(todayStart);
    const futureKeysInWeek = weekDateKeys.filter((key) => key > todayKey);

    const eventDateKeys = new Set(
      data.events
        .map((event) => event.occurrenceDate || event.date)
        .filter(Boolean)
        .map(getLocalDateKey)
        .filter((key) => weekDateSet.has(key))
    );

    const nearestFutureDateKey = futureKeysInWeek.find((key) => eventDateKeys.has(key));
    if (nearestFutureDateKey) {
      setSelectedDateObj(parseLocalDateKey(nearestFutureDateKey));
    }

    didAutoSwitchInitialDateRef.current = true;
  }, [selectedTab, loading, data, selectedDateObj, eventsForSelectedDate, weekDates]);

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

  const handleRegister = async (eventId) => {
    console.log('[REGISTRATION] 🎫 Starting registration for event:', eventId);
    try {
      console.log('[REGISTRATION] Calling registerForEvent mutation...');
      await registerForEvent({
        variables: {
          input: {
            eventId,
          },
        },
      });
      console.log('[REGISTRATION] ✅ Registration mutation completed');
    } catch (error) {
      // Error is handled by mutation's onError callback
      console.error('[REGISTRATION] ❌ Registration error:', error);
      console.error('[REGISTRATION] Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        stack: error.stack
      });
    }
  };

  const handleCancelRegistration = async (registrationId) => {
    console.log('[CANCELLATION] 🎫 Starting cancellation for registration:', registrationId);
    try {
      await cancelRegistration({
        variables: {
          id: registrationId,
        },
      });
      console.log('[CANCELLATION] ✅ Cancellation mutation completed');
    } catch (error) {
      // Error is handled by mutation's onError callback
      console.error('[CANCELLATION] ❌ Cancellation error:', error);
    }
  };

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleAdminReserveSpot = async (eventId) => {
    if (!isAdmin) return;
    try {
      await adminReserveSpot({
        variables: {
          input: {
            eventId,
          },
        },
      });
    } catch (error) {
      console.error('[ADMIN RESERVE] Mutation failed:', error);
    }
  };

  const handleAdminRemoveReservedSpot = async (eventId) => {
    if (!isAdmin) return;
    try {
      await adminRemoveReservedSpot({
        variables: {
          input: {
            eventId,
          },
        },
      });
    } catch (error) {
      console.error('[ADMIN REMOVE RESERVE] Mutation failed:', error);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
    setRemovingRegistrationId(null);
  };

  const adminEventRegistrations = useMemo(() => {
    if (!isAdmin) return [];
    return eventRegistrationsData?.eventRegistrations || [];
  }, [eventRegistrationsData, isAdmin]);

  const handleAdminRemoveRegistration = async (registrationId) => {
    if (!isAdmin) return;
    setRemovingRegistrationId(registrationId);
    try {
      await adminCancelRegistration({
        variables: {
          id: registrationId,
        },
      });
    } catch (error) {
      console.error('[ADMIN CANCEL REGISTRATION] Mutation failed:', error);
    }
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
            <View style={styles.tabContentWrap}>
              <Text
                onLayout={(e) => {
                  const w = e?.nativeEvent?.layout?.width ?? 0;
                  setTabLabelWidths((prev) => ({ ...prev, myRegistrations: w }));
                }}
                style={[
                  styles.tabText,
                  selectedTab === 'הרישומים שלי' && styles.tabTextActive,
                ]}
              >
                הרישומים שלי
              </Text>
              {selectedTab === 'הרישומים שלי' && tabLabelWidths.myRegistrations > 0 && (
                <Image
                  source={require('../../assets/Underline-stroke.png')}
                  style={[
                    styles.tabUnderline,
                    { width: Math.max(151, tabLabelWidths.myRegistrations + 24) },
                  ]}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('יומן')}
          >
            <View style={styles.tabContentWrap}>
              <Text
                onLayout={(e) => {
                  const w = e?.nativeEvent?.layout?.width ?? 0;
                  setTabLabelWidths((prev) => ({ ...prev, calendar: w }));
                }}
                style={[
                  styles.tabText,
                  selectedTab === 'יומן' && styles.tabTextActive,
                ]}
              >
                יומן
              </Text>
              {selectedTab === 'יומן' && tabLabelWidths.calendar > 0 && (
                <Image
                  source={require('../../assets/Underline-stroke.png')}
                  style={[
                    styles.tabUnderline,
                    { width: Math.max(151, tabLabelWidths.calendar + 24) },
                  ]}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Month Navigation - RTL: Right arrow = previous week, Left arrow = next week */}
        {selectedTab === 'יומן' && (
          <>
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
          </>
        )}

        {/* Events List - transparent background to show global purple + logo */}
        <ScrollView
          style={[styles.eventsContainer, { backgroundColor: 'transparent' }]}
          contentContainerStyle={[styles.eventsContent, { backgroundColor: 'transparent' }]}
          showsVerticalScrollIndicator={false}
        >
          {selectedTab === 'הרישומים שלי' ? (
            // Show registered events
            registrationsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#AB5FBD" />
                <Text style={styles.loadingText}>טוען רישומים...</Text>
              </View>
            ) : futureRegisteredEvents.length > 0 ? (
              futureRegisteredEvents.map((event) => (
                <EventCard
                  key={`${event.id}-${event.occurrenceDate}`}
                  event={event}
                  onRegister={() => handleRegister(event.id)}
                  onCancel={!event.isCancelled ? () => handleCancelRegistration(event.registrationId) : undefined}
                  onPress={() => handleEventPress(event)}
                  isRegistered={!event.isCancelled}
                  isFull={false}
                  disabled={cancelling || event.isCancelled}
                  showDate={true}
                />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>אין רישומים עתידיים</Text>
              </View>
            )
          ) : (
            // Show calendar events
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#AB5FBD" />
                <Text style={styles.loadingText}>טוען אירועים...</Text>
              </View>
            ) : eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate
                .filter((event) => {
                  // Filter out events without dates
                  return !!(event.occurrenceDate || event.date);
                })
                .map((event) => {
                  // Check if user is registered for this event
                  // For recurring events, use baseEventId; for one-time, use event.id
                  const eventId = event.baseEventId || event.id;
                  // Get the occurrence date (for virtual instances) or regular date
                  const eventDateValue = event.occurrenceDate || event.date;
                  const eventDate = new Date(eventDateValue);
                  // Normalize to YYYY-MM-DD format (UTC, no time component)
                  const dateKey = eventDate.toISOString().split('T')[0];
                  const registrationKey = `${eventId}_${dateKey}`;
                  
                  console.log('[EVENT CARD] 🔍 Checking registration for event:', {
                    eventId,
                    baseEventId: event.baseEventId,
                    eventDateValue,
                    dateKey,
                    registrationKey,
                    eventTitle: event.title,
                    registeredCount: event.registeredCount,
                    maxRegistrations: event.maxRegistrations,
                    availableSpots: event.availableSpots,
                  });
                  
                  console.log('[EVENT CARD] 📊 userRegistrationsMap size:', userRegistrationsMap.size);
                  console.log('[EVENT CARD] 📊 userRegistrationsMap keys:', Array.from(userRegistrationsMap.keys()));
                  
                  const registration = userRegistrationsMap.get(registrationKey);
                  const isRegistered = !!registration;
                  const isFull = event.availableSpots === 0;
                  const eventDateObj = new Date(eventDateValue);
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const isPastEvent = eventDateObj < todayStart;
                  
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      onRegister={() => handleRegister(event.id)}
                      onCancel={registration ? () => handleCancelRegistration(registration.id) : undefined}
                      onPress={() => handleEventPress(event)}
                      isRegistered={isRegistered}
                      isFull={isFull}
                      disabled={registering || cancelling || event.isCancelled}
                      isPast={isPastEvent}
                    />
                  );
                })
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>אין שיעורים מתוכננים ליום זה</Text>
              </View>
            )
          )}
        </ScrollView>

        {/* Event Detail Modal */}
        {selectedEvent && (() => {
          const evtDateVal = selectedEvent.occurrenceDate || selectedEvent.date;
          const evtDateObj = new Date(evtDateVal);
          const todayStartModal = new Date();
          todayStartModal.setHours(0, 0, 0, 0);
          const isPastModal = evtDateObj < todayStartModal;
          return (
            <EventDetailModal
              event={selectedEvent}
              visible={modalVisible}
              onClose={handleCloseModal}
              onRegister={() => {
                if (selectedEvent) {
                  handleRegister(selectedEvent.id);
                }
              }}
              onCancel={selectedEventRegistration ? () => handleCancelRegistration(selectedEventRegistration.id) : undefined}
              isRegistered={!!selectedEventRegistration}
              isFull={selectedEvent.availableSpots === 0}
              disabled={registering || cancelling || selectedEvent?.isCancelled}
              isPast={isPastModal}
              isAdmin={isAdmin}
              isCancelled={selectedEvent?.isCancelled ?? false}
              cancellationReason={selectedEvent?.cancellationReason ?? null}
              onReserveSpot={
                selectedEvent?.isCancelled
                  ? undefined
                  : () => selectedEvent && handleAdminReserveSpot(selectedEvent.id)
              }
              onRemoveReservedSpot={
                selectedEvent?.isCancelled
                  ? undefined
                  : () => selectedEvent && handleAdminRemoveReservedSpot(selectedEvent.id)
              }
              adminActionLoading={reservingSpot || removingReservedSpot}
              onAdminCancelOccurrence={(reason) => {
                if (!selectedEvent) return;
                adminCancelEventOccurrence({
                  variables: {
                    input: {
                      eventId: selectedEvent.id,
                      reason,
                    },
                  },
                });
              }}
              adminCancelLoading={adminCancellingOccurrence}
              onAdminReenableOccurrence={() => {
                if (!selectedEvent) return;
                adminReenableEventOccurrence({
                  variables: {
                    input: {
                      eventId: selectedEvent.id,
                    },
                  },
                });
              }}
              adminReenableLoading={adminReenablingOccurrence}
              registrations={adminEventRegistrations}
              registrationsLoading={eventRegistrationsLoading}
              onRemoveRegistration={handleAdminRemoveRegistration}
              removingRegistrationId={removingRegistrationId}
            />
          );
        })()}
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
    alignItems: 'center',
  },
  tabContentWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  tabUnderline: {
    height: 6,
    marginTop: 0, // Put underline directly under the text (slightly lower)
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: 'transparent', // Dark purple background
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
    backgroundColor: 'transparent', // Dark purple background
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
    backgroundColor: 'transparent', // Dark purple background
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
