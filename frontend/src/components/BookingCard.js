import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const BookingCard = ({ registration, onCancel }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:mm format
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{registration.event?.title || 'אירוע'}</Text>
        <Text style={styles.status}>{registration.status === 'confirmed' ? 'מאושר' : 'מבוטל'}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>📅 {formatDate(registration.occurrenceDate)}</Text>
        {registration.event?.startTime && (
          <Text style={styles.detailText}>🕐 {formatTime(registration.event.startTime)}</Text>
        )}
        {registration.event?.duration && (
          <Text style={styles.detailText}>⏱️ {registration.event.duration} דקות</Text>
        )}
        {registration.event?.instructorName && (
          <Text style={styles.detailText}>👤 {registration.event.instructorName}</Text>
        )}
      </View>

      {registration.status === 'confirmed' && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>בטל הרשמה</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  details: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingCard;









