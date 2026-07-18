import { Linking, Platform } from 'react-native';
import { STUDIO_LOCATION, STUDIO_NAME } from './constants';

const pad = (value) => String(value).padStart(2, '0');

const parseEventDate = (event) => {
  const raw = event?.occurrenceDate || event?.date;
  if (!raw) return null;
  const date = raw instanceof Date ? new Date(raw) : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseStartTimeParts = (startTime) => {
  const [hours = '0', minutes = '0'] = String(startTime || '00:00').split(':');
  return {
    hours: parseInt(hours, 10) || 0,
    minutes: parseInt(minutes, 10) || 0,
  };
};

/**
 * Build local start/end Date objects for a class occurrence.
 */
export const getEventDateRange = (event) => {
  const baseDate = parseEventDate(event);
  if (!baseDate) return null;

  const { hours, minutes } = parseStartTimeParts(event?.startTime);
  const durationMinutes = Number.isFinite(Number(event?.duration)) ? Number(event.duration) : 90;

  const start = new Date(baseDate);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  return { start, end };
};

const toUtcCompact = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const toLocalCompact = (date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const escapeIcsText = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

export const buildCalendarEventDetails = (event) => {
  const range = getEventDateRange(event);
  if (!range) return null;

  const title = event?.title || 'שיעור בסטודיו בודה';
  const instructor = event?.instructorName || 'יערה בודה';
  const descriptionParts = [
    event?.description?.trim() || '',
    `מדריכה: ${instructor}`,
    STUDIO_NAME,
  ].filter(Boolean);

  return {
    title,
    description: descriptionParts.join('\n'),
    location: STUDIO_LOCATION,
    start: range.start,
    end: range.end,
    instructor,
  };
};

export const buildGoogleCalendarUrl = (event) => {
  const details = buildCalendarEventDetails(event);
  if (!details) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${toUtcCompact(details.start)}/${toUtcCompact(details.end)}`,
    details: details.description,
    location: details.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const buildOutlookCalendarUrl = (event) => {
  const details = buildCalendarEventDetails(event);
  if (!details) return null;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: details.title,
    body: details.description,
    location: details.location,
    startdt: details.start.toISOString(),
    enddt: details.end.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

export const buildIcsContent = (event) => {
  const details = buildCalendarEventDetails(event);
  if (!details) return null;

  const uid = `${event?.id || 'event'}-${details.start.getTime()}@studiobuda`;
  const stamp = toUtcCompact(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudioBuda//ArtHub//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toLocalCompact(details.start)}`,
    `DTEND:${toLocalCompact(details.end)}`,
    `SUMMARY:${escapeIcsText(details.title)}`,
    `DESCRIPTION:${escapeIcsText(details.description)}`,
    `LOCATION:${escapeIcsText(details.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

/**
 * Universal option: downloads/opens an .ics file (Apple Calendar, Google, Outlook, device calendars).
 */
export const downloadIcsFile = (event) => {
  const ics = buildIcsContent(event);
  if (!ics) {
    throw new Error('Missing event date/time');
  }

  const filename = `studiobuda-${(event?.title || 'class').replace(/\s+/g, '-')}.ics`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: open data URI via Linking (most WebViews / OSes hand off to a calendar app)
  const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  return Linking.openURL(dataUri);
};

export const openExternalCalendar = async (url) => {
  if (!url) return;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen && Platform.OS !== 'web') {
    throw new Error('Cannot open calendar link');
  }
  await Linking.openURL(url);
};
