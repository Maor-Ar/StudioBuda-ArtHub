import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import UserHeadIcon from '../assets/icons/user-head.svg';
import UsersFourIcon from '../assets/icons/users-four.svg';
import LeftArrow from '../assets/icons/LeftArrow.svg';
import { useShouldShowLocalLoader } from '../context/LoadingContext';
import EventEditModal from './EventEditModal';
import TooltipIcon from './admin-dashboard/TooltipIcon';
import {
  REGISTRATION_AUTO_CLOSED_HELP,
  REGISTRATION_AUTO_CLOSED_LABEL,
} from '../utils/constants';
import { GET_ALL_USERS, GET_EVENT_RESERVED_REGULARS } from '../services/graphql/queries';
import {
  ADMIN_ADD_RESERVED_REGULAR,
  ADMIN_REMOVE_RESERVED_REGULAR,
} from '../services/graphql/mutations';
import { showErrorToast, showSuccessToast } from '../utils/toast';
import { getGraphQLErrorMessage } from '../utils/errorMessages';

const EDIT_SCOPE_OPTIONS = [
  { id: 'THIS_OCCURRENCE', label: 'ערוך את התאריך הזה בלבד', title: 'עריכת תאריך זה' },
  { id: 'THIS_AND_FUTURE', label: 'ערוך מתאריך זה והלאה', title: 'עריכה מתאריך זה והלאה' },
  { id: 'ALL', label: 'ערוך את כל השיעורים (עבר, הווה ועתיד)', title: 'עריכת כל השיעורים' },
];

const PersonRow = ({ name, badge, onRemove, removing, removeLabel = 'הסר' }) => (
  <View style={styles.personRow}>
    {onRemove ? (
      <TouchableOpacity
        onPress={onRemove}
        disabled={removing}
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        style={[styles.personRemoveHit, removing && styles.adminButtonDisabled]}
      >
        <Text style={styles.personRemoveText}>{removing ? 'מסיר...' : removeLabel}</Text>
      </TouchableOpacity>
    ) : (
      <View />
    )}
    <View style={styles.personIdentity}>
      {badge ? (
        <View style={[styles.personBadge, badge.tone === 'regular' && styles.personBadgeRegular]}>
          <Text style={styles.personBadgeText}>{badge.label}</Text>
        </View>
      ) : null}
      <Text style={styles.personName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  </View>
);

const EventDetailModal = ({
  event,
  visible,
  onClose,
  onRegister,
  onCancel,
  onAddToCalendar,
  isRegistered,
  isFull = false,
  disabled = false,
  isPast = false,
  isAdmin = false,
  onReserveSpot,
  adminActionLoading = false,
  registrations = [],
  registrationsLoading = false,
  onRemoveRegistration,
  removingRegistrationId = null,
  isCancelled = false,
  isRegistrationClosed = false,
  cancellationReason = null,
  onAdminCancelOccurrence,
  adminCancelLoading = false,
  onAdminReenableOccurrence,
  adminReenableLoading = false,
  onAdminEdit,
  adminEditLoading = false,
  isReservedRegular = false,
  canManageRegulars = false,
  onRegularsChanged,
}) => {
  if (!event) return null;

  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [manualNameModalVisible, setManualNameModalVisible] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [scopeMenuVisible, setScopeMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editScope, setEditScope] = useState('THIS_OCCURRENCE');
  const [regularSearch, setRegularSearch] = useState('');
  const [addRegularOpen, setAddRegularOpen] = useState(false);
  const [cancelFormOpen, setCancelFormOpen] = useState(false);
  const seriesId = event?.baseEventId || event?.id || null;
  const { data: regularsData, refetch: refetchRegulars } = useQuery(GET_EVENT_RESERVED_REGULARS, {
    variables: { eventId: seriesId },
    skip: !canManageRegulars || !visible || !seriesId,
    fetchPolicy: 'network-only',
  });
  const { data: usersData } = useQuery(GET_ALL_USERS, {
    skip: !canManageRegulars || !visible || !addRegularOpen,
    fetchPolicy: 'cache-first',
  });
  const [addRegular, { loading: addingRegular }] = useMutation(ADMIN_ADD_RESERVED_REGULAR, {
    onCompleted: async () => {
      showSuccessToast('הקבוע נוסף לשיעור');
      setRegularSearch('');
      setAddRegularOpen(false);
      await refetchRegulars();
      await onRegularsChanged?.();
    },
    onError: (error) => showErrorToast(getGraphQLErrorMessage(error)),
  });
  const [removeRegular, { loading: removingRegular }] = useMutation(ADMIN_REMOVE_RESERVED_REGULAR, {
    onCompleted: async () => {
      showSuccessToast('הקבוע הוסר מהשיעור');
      await refetchRegulars();
      await onRegularsChanged?.();
    },
    onError: (error) => showErrorToast(getGraphQLErrorMessage(error)),
  });
  const reservedRegulars = regularsData?.eventReservedRegulars || [];
  const regularUserMatches = useMemo(() => {
    const query = regularSearch.trim().toLowerCase();
    const existing = new Set(reservedRegulars.map((member) => member.userId));
    return (usersData?.users || [])
      .filter((user) => !existing.has(user.id))
      .filter((user) => {
        if (!query) return true;
        const name = `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase();
        return name.includes(query);
      })
      .slice(0, 8);
  }, [regularSearch, reservedRegulars, usersData]);
  const showRegistrationsLoading = useShouldShowLocalLoader(registrationsLoading);
  const isRecurringOccurrence = !!(event.isRecurring || event.isInstance);
  const selectedScopeOption = EDIT_SCOPE_OPTIONS.find((option) => option.id === editScope) || EDIT_SCOPE_OPTIONS[0];

  useEffect(() => {
    if (!visible) {
      setAdminCancelReason('');
      setManualNameModalVisible(false);
      setManualCustomerName('');
      setScopeMenuVisible(false);
      setEditModalVisible(false);
      setAddRegularOpen(false);
      setRegularSearch('');
      setCancelFormOpen(false);
    }
  }, [visible]);

  const openAdminEdit = () => {
    if (isRecurringOccurrence) {
      setScopeMenuVisible(true);
      return;
    }
    setEditScope('ALL');
    setEditModalVisible(true);
  };

  const handleScopeSelect = (scopeId) => {
    setEditScope(scopeId);
    setScopeMenuVisible(false);
    setEditModalVisible(true);
  };

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
            <Text style={styles.title}>
              {isCancelled ? (cancellationReason || 'השיעור בוטל') : (event.title || 'שיעור רישום')}
            </Text>
            {event.hasOccurrenceOverride ? (
              <View style={styles.overrideBadge}>
                <Text style={styles.overrideBadgeText}>שונה לתאריך זה</Text>
              </View>
            ) : null}

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

            {/* Personal registration — one primary CTA, separate from admin tools */}
            {isCancelled ? (
              <View style={styles.cancelledButton}>
                <Text style={styles.cancelledButtonText}>הרשמה בוטלה</Text>
              </View>
            ) : isPast ? (
              <View style={styles.pastButton}>
                <Text style={styles.pastButtonText}>הרשמה סגורה</Text>
              </View>
            ) : isRegistrationClosed ? (
              <View style={styles.closedButton}>
                <Text style={styles.closedButtonText}>{REGISTRATION_AUTO_CLOSED_LABEL}</Text>
                <TooltipIcon
                  label="?"
                  text={REGISTRATION_AUTO_CLOSED_HELP}
                  color="#FFFFFF"
                  maxWidth={280}
                />
              </View>
            ) : isReservedRegular ? (
              <View style={styles.reservedButton}>
                <Text style={styles.reservedButtonText}>המקום שלך שמור</Text>
              </View>
            ) : isRegistered ? (
              <>
                {typeof onAddToCalendar === 'function' ? (
                  <TouchableOpacity
                    style={styles.calendarButton}
                    onPress={onAddToCalendar}
                    disabled={disabled}
                  >
                    <Text style={styles.calendarButtonText}>הוסף ליומן האישי</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.cancelButton, disabled && styles.cancelButtonDisabled]}
                  onPress={onCancel}
                  disabled={disabled}
                >
                  <Text style={styles.cancelButtonText}>ביטול הרשמה</Text>
                </TouchableOpacity>
              </>
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
                <Text style={styles.registerButtonText}>תרשמו אותי</Text>
              </TouchableOpacity>
            )}

            {isAdmin && !isPast && (
              <View style={styles.adminSection}>
                <Text style={[styles.sectionKicker, styles.sectionKickerSpaced]}>ניהול השיעור</Text>
                <TouchableOpacity
                  style={[
                    styles.adminGhostButton,
                    styles.adminGhostButtonSolo,
                    adminEditLoading && styles.adminButtonDisabled,
                  ]}
                  onPress={openAdminEdit}
                  disabled={adminEditLoading}
                >
                  <Text style={styles.adminGhostButtonText}>עריכה</Text>
                </TouchableOpacity>
                {isCancelled ? (
                  <View style={styles.adminDangerBlock}>
                    <Text style={styles.adminCancelInfoText}>
                      בוטל לתאריך זה: {cancellationReason || 'ללא סיבה'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.adminReenableButton,
                        adminReenableLoading && styles.adminButtonDisabled,
                      ]}
                      onPress={onAdminReenableOccurrence}
                      disabled={adminReenableLoading}
                    >
                      <Text style={styles.adminReenableButtonText}>
                        {adminReenableLoading ? 'מפעיל...' : 'הפעל מחדש'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : cancelFormOpen ? (
                  <View style={styles.adminDangerBlock}>
                    <Text style={styles.adminCancelLabel}>ביטול התאריך הזה בלבד</Text>
                    <TextInput
                      style={styles.adminCancelInput}
                      value={adminCancelReason}
                      onChangeText={setAdminCancelReason}
                      placeholder="כתוב/י סיבה..."
                      placeholderTextColor="#999"
                      multiline
                    />
                    <View style={styles.adminActionRow}>
                      <TouchableOpacity
                        style={styles.adminGhostButton}
                        onPress={() => {
                          setCancelFormOpen(false);
                          setAdminCancelReason('');
                        }}
                      >
                        <Text style={styles.adminGhostButtonText}>לא עכשיו</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.adminCancelButton, adminCancelLoading && styles.adminButtonDisabled]}
                        onPress={() => onAdminCancelOccurrence?.(adminCancelReason)}
                        disabled={adminCancelLoading || !adminCancelReason.trim()}
                      >
                        <Text style={styles.adminCancelButtonText}>
                          {adminCancelLoading ? 'מבטל...' : 'בטל תאריך'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.adminDangerLink}
                    onPress={() => setCancelFormOpen(true)}
                  >
                    <Text style={styles.adminDangerLinkText}>בטל את התאריך הזה</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(isAdmin || canManageRegulars) && (
              <View style={styles.adminSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionCount}>
                    {event.registeredCount ?? 0}/{event.maxRegistrations ?? 0}
                  </Text>
                  <Text style={styles.sectionKicker}>משתתפים</Text>
                </View>

                {canManageRegulars ? (
                  <View style={styles.rosterGroup}>
                    <Text style={styles.rosterGroupTitle}>קבועים בסדרה</Text>
                    <Text style={styles.regularsHelp}>
                      שמורים לכל המפגשים. הסרה משחררת את המקום הקבוע, לא שבוע בודד.
                    </Text>
                    {reservedRegulars.length === 0 ? (
                      <Text style={styles.emptyRegistrationsText}>אין קבועים בשיעור זה</Text>
                    ) : (
                      reservedRegulars.map((member) => (
                        <PersonRow
                          key={member.userId}
                          name={member.displayName}
                          badge={{ label: 'קבוע', tone: 'regular' }}
                          removing={removingRegular}
                          removeLabel="הסר קבוע"
                          onRemove={() =>
                            removeRegular({ variables: { eventId: seriesId, userId: member.userId } })
                          }
                        />
                      ))
                    )}
                    <TouchableOpacity
                      style={styles.addRegularButton}
                      onPress={() => setAddRegularOpen((open) => !open)}
                    >
                      <Text style={styles.addRegularButtonText}>
                        {addRegularOpen ? 'סגור חיפוש' : '+ הוסף קבוע'}
                      </Text>
                    </TouchableOpacity>
                    {addRegularOpen ? (
                      <>
                        <TextInput
                          style={styles.regularSearchInput}
                          value={regularSearch}
                          onChangeText={setRegularSearch}
                          placeholder="חיפוש לפי שם או אימייל"
                          placeholderTextColor="#B0A0B8"
                        />
                        {regularUserMatches.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            style={styles.userPickRow}
                            disabled={addingRegular}
                            onPress={() => addRegular({ variables: { eventId: seriesId, userId: user.id } })}
                          >
                            <Text style={styles.personName}>
                              {user.firstName} {user.lastName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : null}
                  </View>
                ) : null}

                {isAdmin ? (
                  <View style={[styles.rosterGroup, canManageRegulars && styles.rosterGroupDivided]}>
                    <Text style={styles.rosterGroupTitle}>נרשמים לתאריך זה</Text>
                    {registrationsLoading ? (
                      showRegistrationsLoading ? (
                        <Text style={styles.registrationsLoadingText}>טוען רשימת נרשמים...</Text>
                      ) : null
                    ) : registrations.length === 0 ? (
                      <Text style={styles.emptyRegistrationsText}>אין נרשמים נוספים לתאריך זה</Text>
                    ) : (
                      registrations.map((registration) => {
                        const fullName = registration.isManual
                          ? (registration.displayName || 'ללא שם')
                          : registration.user
                            ? `${registration.user.firstName} ${registration.user.lastName}`
                            : registration.userId === 'DummyUser'
                              ? 'Dummy User'
                              : 'משתמש לא ידוע';
                        const isRemoving = removingRegistrationId === registration.id;
                        return (
                          <PersonRow
                            key={registration.id}
                            name={fullName}
                            badge={registration.isManual ? { label: 'ידני' } : null}
                            removing={isRemoving}
                            onRemove={() => onRemoveRegistration && onRemoveRegistration(registration.id)}
                          />
                        );
                      })
                    )}
                    {isAdmin && !isPast && !isCancelled ? (
                      <TouchableOpacity
                        style={[styles.addRegularButton, adminActionLoading && styles.adminButtonDisabled]}
                        onPress={() => setManualNameModalVisible(true)}
                        disabled={adminActionLoading || !onReserveSpot}
                      >
                        <Text style={styles.addRegularButtonText}>
                          {adminActionLoading ? 'שומר...' : '+ שריון מקום'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
      <Modal
        visible={manualNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualNameModalVisible(false)}
      >
        <View style={styles.inlineModalOverlay}>
          <View style={styles.inlineModalCard}>
            <Text style={styles.inlineModalTitle}>שריון מקום ידני</Text>
            <Text style={styles.inlineModalLabel}>שם הלקוח/ה</Text>
            <TextInput
              style={styles.inlineModalInput}
              value={manualCustomerName}
              onChangeText={setManualCustomerName}
              placeholder="הכנס/י שם"
              placeholderTextColor="#B0A0B8"
              autoFocus
            />
            <View style={styles.inlineModalActions}>
              <TouchableOpacity
                style={styles.inlineModalSecondaryButton}
                onPress={() => {
                  setManualNameModalVisible(false);
                  setManualCustomerName('');
                }}
                disabled={adminActionLoading}
              >
                <Text style={styles.inlineModalSecondaryButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.inlineModalPrimaryButton,
                  (!manualCustomerName.trim() || adminActionLoading) && styles.adminButtonDisabled,
                ]}
                onPress={() => {
                  const value = manualCustomerName.trim();
                  if (!value) return;
                  onReserveSpot?.(value);
                  setManualNameModalVisible(false);
                  setManualCustomerName('');
                }}
                disabled={!manualCustomerName.trim() || adminActionLoading}
              >
                <Text style={styles.inlineModalPrimaryButtonText}>
                  {adminActionLoading ? 'שומר...' : 'שמור'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={scopeMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScopeMenuVisible(false)}
      >
        <View style={styles.inlineModalOverlay}>
          <View style={styles.inlineModalCard}>
            <Text style={styles.inlineModalTitle}>איך לערוך?</Text>
            {EDIT_SCOPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.scopeOptionButton}
                onPress={() => handleScopeSelect(option.id)}
              >
                <Text style={styles.scopeOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.inlineModalSecondaryButton, styles.scopeCancelButton]}
              onPress={() => setScopeMenuVisible(false)}
            >
              <Text style={styles.inlineModalSecondaryButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <EventEditModal
        visible={editModalVisible}
        initialValues={event}
        loading={adminEditLoading}
        title={selectedScopeOption.title}
        onClose={() => setEditModalVisible(false)}
        onSubmit={(changes) => {
          if (!changes || Object.keys(changes).length === 0) return;
          onAdminEdit?.(changes, editScope);
          setEditModalVisible(false);
        }}
      />
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
  overrideBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 209, 227, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: -18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
  },
  overrideBadgeText: {
    color: '#FFD1E3',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
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
    marginTop: 12,
    shadowColor: '#4E0D66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  calendarButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#FFD1E3',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  calendarButtonText: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
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
  closedButton: {
    width: '100%',
    minHeight: 50,
    paddingHorizontal: 16,
    backgroundColor: '#B0A0B8',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  closedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cancelledButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#B0A0B8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    opacity: 0.9,
  },
  cancelledButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminButtonDisabled: {
    opacity: 0.6,
  },
  adminSection: {
    marginTop: 22,
    backgroundColor: 'rgba(255, 209, 227, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.22)',
    borderRadius: 18,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionKicker: {
    color: '#FFD1E3',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 0,
  },
  sectionKickerSpaced: {
    marginBottom: 10,
  },
  sectionCount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adminGhostButton: {
    flexGrow: 1,
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 209, 227, 0.55)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminGhostButtonSolo: {
    flexGrow: 0,
    alignSelf: 'stretch',
    minHeight: 52,
  },
  adminGhostButtonText: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminSecondaryButton: {
    flexGrow: 1,
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(171, 95, 189, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminDangerLink: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 4,
  },
  adminDangerLinkText: {
    color: '#FFD1E3',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'right',
    writingDirection: 'rtl',
    opacity: 0.85,
  },
  adminDangerBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 209, 227, 0.18)',
  },
  registrationsLoadingText: {
    color: '#FFE2ED',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyRegistrationsText: {
    color: '#D4B8E0',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  rosterGroup: {
    marginTop: 8,
  },
  rosterGroupDivided: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 209, 227, 0.16)',
  },
  rosterGroupTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 209, 227, 0.12)',
  },
  personIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 10,
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  personBadge: {
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  personBadgeRegular: {
    backgroundColor: 'rgba(171, 95, 189, 0.45)',
  },
  personBadgeText: {
    color: '#FFD1E3',
    fontSize: 11,
    fontWeight: '700',
  },
  personRemoveHit: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  personRemoveText: {
    color: '#FFD1E3',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  adminCancelLabel: {
    color: '#FFD1E3',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  adminCancelInput: {
    backgroundColor: 'rgba(255, 209, 227, 0.15)',
    borderRadius: 14,
    padding: 12,
    minHeight: 64,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.25)',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  adminCancelButton: {
    flexGrow: 1,
    minHeight: 52,
    paddingVertical: 14,
    backgroundColor: '#4E0D66',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminCancelButtonText: {
    color: '#FFE2ED',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminReenableButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
    backgroundColor: '#AB5FBD',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  adminReenableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adminCancelInfoText: {
    color: '#FFE2ED',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inlineModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inlineModalCard: {
    backgroundColor: '#4E0D66',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.35)',
    padding: 16,
  },
  inlineModalTitle: {
    color: '#FFD1E3',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inlineModalLabel: {
    color: '#FFE2ED',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inlineModalInput: {
    backgroundColor: 'rgba(255, 209, 227, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 227, 0.3)',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inlineModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  inlineModalPrimaryButton: {
    flexGrow: 1,
    backgroundColor: '#AB5FBD',
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineModalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inlineModalSecondaryButton: {
    flexGrow: 1,
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineModalSecondaryButtonText: {
    color: '#FFD1E3',
    fontSize: 15,
    fontWeight: '600',
  },
  scopeOptionButton: {
    backgroundColor: 'rgba(255, 209, 227, 0.16)',
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 10,
    justifyContent: 'center',
  },
  scopeCancelButton: {
    marginTop: 14,
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  scopeOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reservedButton: {
    backgroundColor: '#4E0D66',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  reservedButtonText: {
    color: '#FFD1E3',
    fontSize: 16,
    fontWeight: '700',
  },
  regularsHelp: {
    color: '#FFD1E3',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
  },
  addRegularButton: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 209, 227, 0.45)',
    borderStyle: 'dashed',
    minHeight: 52,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRegularButtonText: {
    color: '#FFD1E3',
    fontWeight: '700',
    fontSize: 14,
  },
  regularSearchInput: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 209, 227, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  userPickRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 209, 227, 0.12)',
  },
});

export default EventDetailModal;

