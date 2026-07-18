import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
  openExternalCalendar,
} from '../utils/calendarEvent';
import { showErrorToast, showSuccessToast } from '../utils/toast';

/**
 * Branded popup: registration success and/or add-to-calendar choices.
 * Uses .ics (universal) + Google + Outlook deep links — works on PWA and most phones.
 */
const AddToCalendarModal = ({
  visible,
  event,
  onClose,
  mode = 'success', // 'success' | 'add'
}) => {
  if (!event) return null;

  const isSuccess = mode === 'success';

  const handleIcs = () => {
    try {
      downloadIcsFile(event);
      showSuccessToast(
        Platform.OS === 'web'
          ? 'הקובץ הורד — פתחו אותו כדי להוסיף ליומן'
          : 'נפתח קובץ היומן במכשיר'
      );
      onClose?.();
    } catch (error) {
      console.error('[CALENDAR] ICS failed:', error);
      showErrorToast('לא הצלחנו ליצור קובץ יומן');
    }
  };

  const handleGoogle = async () => {
    try {
      const url = buildGoogleCalendarUrl(event);
      await openExternalCalendar(url);
      onClose?.();
    } catch (error) {
      console.error('[CALENDAR] Google failed:', error);
      showErrorToast('לא הצלחנו לפתוח את Google Calendar');
    }
  };

  const handleOutlook = async () => {
    try {
      const url = buildOutlookCalendarUrl(event);
      await openExternalCalendar(url);
      onClose?.();
    } catch (error) {
      console.error('[CALENDAR] Outlook failed:', error);
      showErrorToast('לא הצלחנו לפתוח את Outlook');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.title}>
            {isSuccess ? 'נרשמת בהצלחה לשיעור!' : 'הוספה ליומן האישי'}
          </Text>
          <Text style={styles.subtitle}>
            {isSuccess
              ? 'רוצה להוסיף את השיעור ליומן שלך? נמלא עבורך את התאריך, השעה, המיקום והתיאור.'
              : 'בחרו איך להוסיף את השיעור ליומן — עם כל הפרטים (תאריך, שעה, מיקום ותיאור).'}
          </Text>
          <Text style={styles.eventName} numberOfLines={2}>
            {event.title}
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleIcs} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>הוסף ליומן המכשיר (.ics)</Text>
            <Text style={styles.primaryButtonHint}>Apple / Google / Outlook ועוד</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoogle} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Google Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleOutlook} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Outlook</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.dismissButtonText}>
              {isSuccess ? 'לא עכשיו' : 'סגור'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#4E0D66',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
    padding: 20,
  },
  title: {
    color: '#FFD1E3',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFE2ED',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  eventName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#AB5FBD',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  primaryButtonHint: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
  },
  secondaryButtonText: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  dismissButtonText: {
    color: '#D4B8E0',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export default AddToCalendarModal;
