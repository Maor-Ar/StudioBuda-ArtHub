import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import UserHeadIcon from '../assets/icons/user-head.svg';
import UsersFourIcon from '../assets/icons/users-four.svg';
import LeftArrow from '../assets/icons/LeftArrow.svg';

const EventDetailModal = ({
  event,
  visible,
  onClose,
  onRegister,
  onCancel,
  isRegistered,
  isFull = false,
  disabled = false,
  isPast = false,
  isAdmin = false,
  onReserveSpot,
  onRemoveReservedSpot,
  adminActionLoading = false,
  registrations = [],
  registrationsLoading = false,
  onRemoveRegistration,
  removingRegistrationId = null,
}) => {
  if (!event) return null;

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:mm format
  };

  const formatTimeRange = (startTime, duration) => {
    if (!startTime || !duration) return '';
    const start = formatTime(startTime);
    const [hours, minutes] = startTime.split(':');
    const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const endMinutes = startMinutes + duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    return `${start} - ${endTime}`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const eventDate = new Date(date);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return eventDate.toLocaleDateString('he-IL', options);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header with close button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <LeftArrow width={23} height={23} style={styles.arrowIcon} />
              <Text style={styles.closeButtonText}>חזרה</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Title */}
            <Text style={styles.title}>{event.title || 'שיעור רישום'}</Text>

            {/* Event Date */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>
                {formatDate(event.occurrenceDate || event.date)}
              </Text>
              <Text style={styles.detailLabel}>תאריך:</Text>
            </View>

            {/* Event Time */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>
                {formatTimeRange(event.startTime, event.duration) || '18:00 - 19:30'}
              </Text>
              <Text style={styles.detailLabel}>שעה:</Text>
            </View>

            {/* Instructor */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>
                {event.instructorName || 'יערה בודה'}
              </Text>
              <UserHeadIcon width={20} height={20} style={styles.detailIcon} />
            </View>

            {/* Participants */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>
                {event.registeredCount ?? 0} מתוך {event.maxRegistrations ?? 0} משתתפים
              </Text>
              <UsersFourIcon width={20} height={20} style={styles.detailIcon} />
            </View>

            {/* Description */}
            {event.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>תיאור:</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>
            )}

            {/* Button States: Past, Cancel, Full, or Register */}
            {isPast ? (
              <View style={styles.pastButton}>
                <Text style={styles.pastButtonText}>הרשמה סגורה</Text>
              </View>
            ) : isRegistered ? (
              <TouchableOpacity 
                style={[styles.cancelButton, disabled && styles.cancelButtonDisabled]} 
                onPress={onCancel}
                disabled={disabled}
              >
                <Text style={styles.cancelButtonText}>
                  {disabled ? 'מבטל...' : 'ביטול הרשמה'}
                </Text>
              </TouchableOpacity>
            ) : isFull ? (
              <View style={styles.fullButton}>
                <Text style={styles.fullButtonText}>השיעור מלא</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.registerButton, disabled && styles.registerButtonDisabled]} 
                onPress={onRegister}
                disabled={disabled}
              >
                <Text style={styles.registerButtonText}>
                  {disabled ? 'נרשם...' : 'תרשמו אותי'}
                </Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={styles.adminActionsContainer}>
                <TouchableOpacity
                  style={[styles.reserveSpotButton, adminActionLoading && styles.adminButtonDisabled]}
                  onPress={onReserveSpot}
                  disabled={adminActionLoading}
                >
                  <Text style={styles.reserveSpotButtonText}>
                    {adminActionLoading ? 'שומר...' : 'שריון מקום'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.removeReservedSpotButton, adminActionLoading && styles.adminButtonDisabled]}
                  onPress={onRemoveReservedSpot}
                  disabled={adminActionLoading}
                >
                  <Text style={styles.removeReservedSpotButtonText}>
                    {adminActionLoading ? 'מסיר...' : 'הסרת מקום שמור'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isAdmin && (
              <View style={styles.registrationsContainer}>
                <Text style={styles.registrationsTitle}>נרשמים לאירוע</Text>
                {registrationsLoading ? (
                  <Text style={styles.registrationsLoadingText}>טוען רשימת נרשמים...</Text>
                ) : registrations.length === 0 ? (
                  <Text style={styles.emptyRegistrationsText}>אין נרשמים כרגע</Text>
                ) : (
                  registrations.map((registration) => {
                    const fullName = registration.user
                      ? `${registration.user.firstName} ${registration.user.lastName}`
                      : registration.userId === 'DummyUser'
                        ? 'Dummy User'
                        : 'משתמש לא ידוע';
                    const isRemoving = removingRegistrationId === registration.id;
                    return (
                      <View key={registration.id} style={styles.registrationRow}>
                        <TouchableOpacity
                          style={[styles.removeRegistrationButton, isRemoving && styles.adminButtonDisabled]}
                          onPress={() => onRemoveRegistration && onRemoveRegistration(registration.id)}
                          disabled={isRemoving}
                        >
                          <Text style={styles.removeRegistrationButtonText}>
                            {isRemoving ? 'מסיר...' : 'הסר'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.registrationName}>{fullName}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#5D3587', // Dark purple background
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    // Give the modal a concrete height so the ScrollView gets layout space.
    // With only maxHeight (and no explicit height/flex), the ScrollView can
    // collapse to 0 height on some devices, leaving only the header visible.
    height: '90%',
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 209, 227, 0.3)',
    flexDirection: 'row',
    justifyContent: 'flex-start', // Close button on left
  },
  closeButton: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    marginRight: 8,
  },
  closeButtonText: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD1E3',
    textAlign: 'right',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    writingDirection: 'rtl',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'flex-end', // RTL: content aligned to right
  },
  detailLabel: {
    fontSize: 18,
    color: '#FFD1E3',
    fontWeight: '600',
    marginLeft: 10, // RTL: margin on left (label is on the right)
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailIcon: {
    marginLeft: 10, // RTL: margin on left (icon is on the right)
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 209, 227, 0.2)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  descriptionLabel: {
    fontSize: 18,
    color: '#FFD1E3',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  descriptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#AB5FBD',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cancelButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4E0D66',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  fullButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#999',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  fullButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pastButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#B0A0B8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  pastButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminActionsContainer: {
    marginTop: 14,
    gap: 10,
  },
  reserveSpotButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#8E44AD',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeReservedSpotButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#6B2A85',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reserveSpotButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  removeReservedSpotButtonText: {
    color: '#FFE2ED',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminButtonDisabled: {
    opacity: 0.6,
  },
  registrationsContainer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 209, 227, 0.35)',
    paddingTop: 14,
  },
  registrationsTitle: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 10,
    writingDirection: 'rtl',
  },
  registrationsLoadingText: {
    color: '#FFE2ED',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyRegistrationsText: {
    color: '#D4B8E0',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  registrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 209, 227, 0.14)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  registrationName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
    marginLeft: 10,
  },
  removeRegistrationButton: {
    backgroundColor: '#4E0D66',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeRegistrationButtonText: {
    color: '#FFD1E3',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export default EventDetailModal;

