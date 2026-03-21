import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    key: 'events',
    title: 'ניהול אירועים',
    description: 'יצירה, עריכה ומחיקה של שיעורים וסדנאות',
    icon: '📅',
    screen: 'AdminEvents',
  },
  {
    key: 'transactions',
    title: 'ניהול עסקאות',
    description: 'צפייה בעסקאות, חידוש וביטול מנויים',
    icon: '💳',
    screen: 'AdminTransactions',
  },
  {
    key: 'users',
    title: 'ניהול משתמשים',
    description: 'צפייה ברשימת המשתמשים וחיפוש',
    icon: '👥',
    screen: 'AdminUsers',
  },
  {
    key: 'products',
    title: 'ניהול מוצרים',
    description: 'מחירים, תנאים ורכישות באתר',
    icon: '🛒',
    screen: 'AdminProducts',
  },
];

const AdminHubScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>סטודיו בודה</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>ניהול</Text>
        <Text style={styles.subtitle}>בחרו את הפעולה הרצויה</Text>

        {SECTIONS.map(section => (
          <TouchableOpacity
            key={section.key}
            style={styles.card}
            onPress={() => navigation.navigate(section.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>{section.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardDescription}>{section.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFD1E3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'right',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#D4B8E0',
    textAlign: 'right',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFD1E3',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 14,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E0D66',
    textAlign: 'right',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#5D3587',
    textAlign: 'right',
  },
  cardArrow: {
    fontSize: 24,
    color: '#AB5FBD',
    marginRight: 8,
    fontWeight: 'bold',
  },
});

export default AdminHubScreen;
