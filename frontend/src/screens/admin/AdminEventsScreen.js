import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdminEventsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Events</Text>
      <Text style={styles.subtitle}>Event management coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default AdminEventsScreen;
