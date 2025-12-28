import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import UserHeadIcon from '../assets/icons/user-head.svg';
import UsersFourIcon from '../assets/icons/users-four.svg';

const EventCard = ({ event, onRegister, isRegistered }) => {
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:mm format
  };

  const formatTimeRange = (startTime, duration) => {
    if (!startTime || !duration) return '';
    const start = formatTime(startTime);
    const [hours, minutes] = startTime.split(':');
    const endHour = parseInt(hours) + Math.floor(duration / 60);
    const endMinute = parseInt(minutes) + (duration % 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    return `${start} - ${endTime}`;
  };

  return (
    <View style={styles.card}>
      {/* Left side - Instructor and Participants */}
      <View style={styles.leftSection}>
        <View style={styles.infoRow}>
          <UserHeadIcon width={18} height={18} style={styles.icon} />
          <Text style={styles.infoText}>{event.instructorName || 'יערה בודה'}</Text>
        </View>
        <View style={styles.infoRow}>
          <UsersFourIcon width={20} height={20} style={styles.icon} />
          <Text style={styles.infoText}>
            {event.registeredCount || 4}/{event.maxRegistrations || 6}
          </Text>
        </View>
      </View>

      {/* Right side - Event Title and Time */}
      <View style={styles.rightSection}>
        <Text style={styles.eventTitle}>{event.title || 'שיעור רישום'}</Text>
        <Text style={styles.eventTime}>
          {formatTimeRange(event.startTime, event.duration) || '18:00 - 19:30'}
        </Text>
      </View>

      {/* Register Button or Registered State */}
      {isRegistered ? (
        <View style={styles.registeredButton}>
          <Text style={styles.registeredButtonText}>נרשמת</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={onRegister}
          disabled={event.availableSpots === 0}
        >
          <Text style={styles.registerButtonText}>תרשמו אותי</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 106,
    backgroundColor: '#FFD1E3', // Pink background
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    paddingBottom: 55, // Space for button at bottom
  },
  leftSection: {
    width: '45%',
    justifyContent: 'flex-start',
    paddingRight: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#AB5FBD', // Purple color
    fontWeight: '500',
  },
  rightSection: {
    width: '55%',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 10,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66', // Dark purple
    marginBottom: 4,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  eventTime: {
    fontSize: 16,
    color: '#4E0D66', // Dark purple
    textAlign: 'right',
  },
  registerButton: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    height: 31,
    backgroundColor: '#AB5FBD', // Purple background
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registeredButton: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    height: 31,
    backgroundColor: '#4E0D66', // Dark purple background
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registeredButtonText: {
    color: '#FFD1E3', // Pink text
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventCard;
