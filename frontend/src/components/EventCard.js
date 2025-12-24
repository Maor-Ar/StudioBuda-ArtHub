import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EVENT_TYPES } from '../utils/constants';

const EventCard = ({ event, onRegister, isRegistered }) => {
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:mm format
  };

  const getEventTypeLabel = (type) => {
    switch (type) {
      case EVENT_TYPES.TRIAL:
        return 'שיעור ניסיון';
      case EVENT_TYPES.SUBSCRIPTION_ONLY:
        return 'מנוי בלבד';
      case EVENT_TYPES.PAID_WORKSHOP:
        return 'סדנה בתשלום';
      default:
        return type;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.type}>{getEventTypeLabel(event.eventType)}</Text>
      </View>

      {event.description && <Text style={styles.description}>{event.description}</Text>}

      <View style={styles.details}>
        <Text style={styles.detailText}>
          🕐 {formatTime(event.startTime)} ({event.duration} דקות)
        </Text>
        <Text style={styles.detailText}>👤 {event.instructorName}</Text>
        <Text style={styles.detailText}>
          👥 {event.registeredCount}/{event.maxRegistrations} נרשמו
        </Text>
        {event.price && <Text style={styles.detailText}>💰 ₪{event.price}</Text>}
      </View>

      {event.availableSpots > 0 && !isRegistered && (
        <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
          <Text style={styles.registerButtonText}>הירשם</Text>
        </TouchableOpacity>
      )}

      {isRegistered && (
        <View style={styles.registeredBadge}>
          <Text style={styles.registeredText}>✓ נרשמת</Text>
        </View>
      )}

      {event.availableSpots === 0 && !isRegistered && (
        <View style={styles.fullBadge}>
          <Text style={styles.fullText}>מלא</Text>
        </View>
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
  type: {
    fontSize: 12,
    color: '#6200ee',
    backgroundColor: '#e0d4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  details: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  registerButton: {
    backgroundColor: '#6200ee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registeredBadge: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registeredText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullBadge: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  fullText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EventCard;






