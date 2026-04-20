import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';

const MONTH_LABELS_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

const MANUAL_REGISTRATIONS_COLLECTION = 'event_manual_registrations';

const asDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthStartUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));

const monthEndUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

const addUtcMonths = (date, deltaMonths) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + deltaMonths, 1, 0, 0, 0, 0));

const addMonthsKeepingDay = (date, deltaMonths) => {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + deltaMonths);
  return result;
};

const getMonthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date) => `${MONTH_LABELS_HE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

const average = (values) => {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
};

const daysBetween = (earlier, later) => (later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000);

const monthsBetween = (earlier, later) => {
  const diffDays = Math.max(0, daysBetween(earlier, later));
  return diffDays / 30.4375;
};

const normalizeClassLabel = (event = {}) => {
  const title = String(event.title || '').trim();
  if (title) return title;
  const description = String(event.description || '').trim();
  if (description) {
    return description.split(/\s+/).slice(0, 4).join(' ');
  }
  return 'ללא שם שיעור';
};

const shortClassLabel = (fullLabel) =>
  String(fullLabel || '')
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

const isInRange = (date, start, end) =>
  !!date && date.getTime() >= start.getTime() && date.getTime() <= end.getTime();

class AdminDashboardService {
  async getDashboardMetrics() {
    const [transactionsSnap, registrationsSnap, manualRegistrationsSnap, eventsSnap, cancellationsSnap] = await Promise.all([
      db.collection('transactions').get(),
      db.collection('event_registrations').where('status', '==', 'confirmed').get(),
      db.collection(MANUAL_REGISTRATIONS_COLLECTION).where('status', '==', 'confirmed').get(),
      db.collection('events').get(),
      db.collection('event_cancellations').get(),
    ]);

    const transactions = transactionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const registrations = registrationsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data(), isManual: false }));
    const manualRegistrations = manualRegistrationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isManual: true,
    }));
    const allRegistrations = [...registrations, ...manualRegistrations];
    const eventsMap = new Map(eventsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
    const transactionsMap = new Map(transactions.map((tx) => [tx.id, tx]));
    const cancelledOccurrences = new Set(
      cancellationsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.isActive !== false)
        .map((item) => item.id)
    );

    const now = new Date();
    const currentMonthStart = monthStartUtc(now);
    const rollingWindowEnd = now;
    const rollingWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const trendMonths = [];
    for (let offset = -11; offset <= 0; offset += 1) {
      const monthDate = addUtcMonths(currentMonthStart, offset);
      trendMonths.push({
        monthDate,
        monthKey: getMonthKey(monthDate),
        monthLabel: getMonthLabel(monthDate),
        start: monthStartUtc(monthDate),
        end: monthEndUtc(monthDate),
      });
    }

    const activeSubscriptions = transactions.filter(
      (tx) => tx.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && tx.isActive === true
    ).length;
    const activePunchCards = transactions.filter(
      (tx) => tx.transactionType === TRANSACTION_TYPES.PUNCH_CARD && tx.isActive === true
    ).length;

    const firstSubscriptionByUser = new Map();
    transactions
      .filter((tx) => tx.transactionType === TRANSACTION_TYPES.SUBSCRIPTION)
      .forEach((tx) => {
        const purchaseDate = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        if (!purchaseDate) return;
        const existing = firstSubscriptionByUser.get(tx.userId);
        if (!existing || purchaseDate < existing) {
          firstSubscriptionByUser.set(tx.userId, purchaseDate);
        }
      });

    const getSubscriptionEndDate = (tx) => {
      if (tx.isActive === true) {
        return addMonthsKeepingDay(now, 1);
      }
      const last = asDate(tx.lastPaymentDate) || asDate(tx.lastRenewalDate) || asDate(tx.purchaseDate);
      if (!last) return null;
      return addMonthsKeepingDay(last, 1);
    };

    const subscriptionActivityByMonth = new Map(
      trendMonths.map((month) => [month.monthKey, new Set()])
    );
    transactions
      .filter((tx) => tx.transactionType === TRANSACTION_TYPES.SUBSCRIPTION)
      .forEach((tx) => {
        const start = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        const end = getSubscriptionEndDate(tx);
        if (!start || !end) return;

        trendMonths.forEach((month) => {
          if (month.start <= end && month.end >= start) {
            subscriptionActivityByMonth.get(month.monthKey).add(tx.userId);
          }
        });
      });

    const subscriptionJoinLeaveByMonth = trendMonths.map((month, idx) => {
      let joined = 0;
      firstSubscriptionByUser.forEach((firstDate) => {
        if (isInRange(firstDate, month.start, month.end)) joined += 1;
      });

      const previousUsers = idx > 0 ? subscriptionActivityByMonth.get(trendMonths[idx - 1].monthKey) : new Set();
      const currentUsers = subscriptionActivityByMonth.get(month.monthKey);
      let left = 0;
      previousUsers.forEach((userId) => {
        if (!currentUsers.has(userId)) left += 1;
      });

      return {
        monthKey: month.monthKey,
        monthLabel: month.monthLabel,
        joined,
        left,
      };
    });

    const punchCardPurchasesByMonth = trendMonths.map((month) => {
      const count = transactions.filter((tx) => {
        if (tx.transactionType !== TRANSACTION_TYPES.PUNCH_CARD) return false;
        const purchaseDate = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        return isInRange(purchaseDate, month.start, month.end);
      }).length;

      return {
        monthKey: month.monthKey,
        monthLabel: month.monthLabel,
        count,
      };
    });

    const registrationsByRegistrationDateLastMonth = allRegistrations.filter((registration) => {
      const registrationDate =
        asDate(registration.registrationDate) || asDate(registration.createdAt) || asDate(registration.date);
      return isInRange(registrationDate, rollingWindowStart, rollingWindowEnd);
    });

    const registrationsByOccurrenceDateLastMonth = allRegistrations.filter((registration) => {
      const occurrenceDate = asDate(registration.occurrenceDate) || asDate(registration.date);
      if (!isInRange(occurrenceDate, rollingWindowStart, rollingWindowEnd)) return false;
      if (!registration.eventId || !occurrenceDate) return false;

      const dateKey = occurrenceDate.toISOString().slice(0, 10);
      const occurrenceKey = `${registration.eventId}_${dateKey}`;
      if (cancelledOccurrences.has(occurrenceKey)) return false;

      const event = eventsMap.get(registration.eventId);
      if (event?.isCancelled === true) return false;
      return true;
    });

    const registrationDistributionLastMonth = {
      subscription: 0,
      punchCard: 0,
      trialLesson: 0,
      singleLesson: 0,
      total: 0,
    };

    registrationsByRegistrationDateLastMonth.forEach((registration) => {
      registrationDistributionLastMonth.total += 1;
      const tx = registration.transactionId ? transactionsMap.get(registration.transactionId) : null;
      const txType = tx?.transactionType;
      if (txType === TRANSACTION_TYPES.SUBSCRIPTION) {
        registrationDistributionLastMonth.subscription += 1;
      } else if (txType === TRANSACTION_TYPES.PUNCH_CARD) {
        registrationDistributionLastMonth.punchCard += 1;
      } else if (txType === TRANSACTION_TYPES.TRIAL_LESSON) {
        registrationDistributionLastMonth.trialLesson += 1;
      } else {
        registrationDistributionLastMonth.singleLesson += 1;
      }
    });

    const occurrenceCount = new Map();
    const occurrenceClassLabel = new Map();
    registrationsByOccurrenceDateLastMonth.forEach((registration) => {
      const eventDate = asDate(registration.occurrenceDate) || asDate(registration.date);
      if (!eventDate || !registration.eventId) return;
      const dateKey = eventDate.toISOString().split('T')[0];
      const occurrenceKey = `${registration.eventId}:${dateKey}`;
      occurrenceCount.set(occurrenceKey, (occurrenceCount.get(occurrenceKey) || 0) + 1);
      if (!occurrenceClassLabel.has(occurrenceKey)) {
        const event = eventsMap.get(registration.eventId) || {};
        occurrenceClassLabel.set(occurrenceKey, normalizeClassLabel(event));
      }
    });

    const allOccurrenceAverages = [];
    const occurrenceByClass = new Map();
    occurrenceCount.forEach((count, key) => {
      allOccurrenceAverages.push(count);
      const fullLabel = occurrenceClassLabel.get(key) || 'ללא שם שיעור';
      const entry = occurrenceByClass.get(fullLabel) || {
        fullLabel,
        shortLabel: shortClassLabel(fullLabel),
        registrationsCount: 0,
        occurrencesCount: 0,
        occurrenceSizes: [],
      };
      entry.occurrencesCount += 1;
      entry.registrationsCount += count;
      entry.occurrenceSizes.push(count);
      occurrenceByClass.set(fullLabel, entry);
    });

    const classDistributionByClassLastMonth = [...occurrenceByClass.values()]
      .map((item) => ({
        key: item.fullLabel,
        fullLabel: item.fullLabel,
        shortLabel: item.shortLabel,
        registrationsCount: item.registrationsCount,
        occurrencesCount: item.occurrencesCount,
        avgStudents: average(item.occurrenceSizes),
      }))
      .sort((a, b) => b.registrationsCount - a.registrationsCount);

    const averageStudentsLastMonth = {
      overall: average(allOccurrenceAverages),
      drawing: average(
        classDistributionByClassLastMonth
          .filter((item) => item.fullLabel.includes('רישום') || item.fullLabel.includes('ציור'))
          .map((item) => item.avgStudents)
      ),
      color: average(
        classDistributionByClassLastMonth
          .filter((item) => item.fullLabel.includes('צבע'))
          .map((item) => item.avgStudents)
      ),
      challenges: average(
        classDistributionByClassLastMonth
          .filter((item) => item.fullLabel.includes('אתגר'))
          .map((item) => item.avgStudents)
      ),
    };

    const classTypeDistributionLastMonth = {
      drawing: 0,
      color: 0,
      challenges: 0,
      unclassified: 0,
      total: registrationsByOccurrenceDateLastMonth.length,
    };
    registrationsByOccurrenceDateLastMonth.forEach((registration) => {
      const event = eventsMap.get(registration.eventId) || {};
      const normalized = normalizeClassLabel(event);
      let classType = null;
      if (normalized.includes('צבע')) classType = 'color';
      else if (normalized.includes('אתגר')) classType = 'challenges';
      else if (normalized.includes('רישום') || normalized.includes('ציור')) classType = 'drawing';
      if (classType === 'drawing') classTypeDistributionLastMonth.drawing += 1;
      if (classType === 'color') classTypeDistributionLastMonth.color += 1;
      if (classType === 'challenges') classTypeDistributionLastMonth.challenges += 1;
      if (!classType) classTypeDistributionLastMonth.unclassified += 1;
    });

    const endedSubscriptions = transactions.filter(
      (tx) => tx.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && tx.isActive === false
    );
    const subscriptionTenureMonths = endedSubscriptions
      .map((tx) => {
        const start = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        const end = getSubscriptionEndDate(tx);
        if (!start || !end) return null;
        return monthsBetween(start, end);
      })
      .filter((value) => value != null);

    const punchCardsByUser = new Map();
    transactions
      .filter((tx) => tx.transactionType === TRANSACTION_TYPES.PUNCH_CARD)
      .forEach((tx) => {
        punchCardsByUser.set(tx.userId, (punchCardsByUser.get(tx.userId) || 0) + 1);
      });

    const averageTenure = {
      subscriptionsMonths: average(subscriptionTenureMonths),
      punchCardsPurchasesPerUser: average([...punchCardsByUser.values()]),
    };

    const subscriptionStartByUser = new Map();
    transactions
      .filter((tx) => tx.transactionType === TRANSACTION_TYPES.SUBSCRIPTION)
      .forEach((tx) => {
        const start = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        if (!start) return;
        const existing = subscriptionStartByUser.get(tx.userId);
        if (!existing || start < existing) {
          subscriptionStartByUser.set(tx.userId, start);
        }
      });

    const subscriptionRetention = [];
    const maxSubscriptionMonth = 12;
    for (let monthOffset = 0; monthOffset <= maxSubscriptionMonth; monthOffset += 1) {
      let baseUsers = 0;
      let retainedUsers = 0;
      subscriptionStartByUser.forEach((startDate, userId) => {
        const checkpoint = addMonthsKeepingDay(startDate, monthOffset);
        if (checkpoint > now) return;
        baseUsers += 1;

        const hasActiveAtCheckpoint = transactions.some((tx) => {
          if (tx.userId !== userId || tx.transactionType !== TRANSACTION_TYPES.SUBSCRIPTION) return false;
          const txStart = asDate(tx.purchaseDate) || asDate(tx.createdAt);
          const txEnd = getSubscriptionEndDate(tx);
          if (!txStart || !txEnd) return false;
          return checkpoint >= txStart && checkpoint <= txEnd;
        });
        if (hasActiveAtCheckpoint) retainedUsers += 1;
      });

      if (baseUsers > 0) {
        subscriptionRetention.push({
          x: monthOffset,
          label: `${monthOffset}`,
          percentage: Number(((retainedUsers / baseUsers) * 100).toFixed(2)),
          usersCount: retainedUsers,
          baseUsers,
        });
      }
    }

    const punchPurchaseDatesByUser = new Map();
    transactions
      .filter((tx) => tx.transactionType === TRANSACTION_TYPES.PUNCH_CARD)
      .forEach((tx) => {
        const purchaseDate = asDate(tx.purchaseDate) || asDate(tx.createdAt);
        if (!purchaseDate) return;
        if (!punchPurchaseDatesByUser.has(tx.userId)) {
          punchPurchaseDatesByUser.set(tx.userId, []);
        }
        punchPurchaseDatesByUser.get(tx.userId).push(purchaseDate);
      });
    punchPurchaseDatesByUser.forEach((dates) => dates.sort((a, b) => a - b));

    const allPunchUserCounts = [...punchPurchaseDatesByUser.values()].map((dates) => dates.length);
    const basePunchUsers = allPunchUserCounts.filter((count) => count >= 1).length;
    const maxPunchPurchases = Math.max(1, ...allPunchUserCounts);
    const punchCardReturnRate = [];
    for (let purchaseCount = 1; purchaseCount <= Math.min(maxPunchPurchases, 12); purchaseCount += 1) {
      const usersReached = allPunchUserCounts.filter((count) => count >= purchaseCount).length;
      punchCardReturnRate.push({
        x: purchaseCount,
        label: `${purchaseCount}`,
        percentage: basePunchUsers ? Number(((usersReached / basePunchUsers) * 100).toFixed(2)) : 0,
        usersCount: usersReached,
        baseUsers: basePunchUsers,
      });
    }

    const punchIntervalsDays = [];
    punchPurchaseDatesByUser.forEach((dates) => {
      if (dates.length < 2) return;
      for (let idx = 1; idx < dates.length; idx += 1) {
        punchIntervalsDays.push(daysBetween(dates[idx - 1], dates[idx]));
      }
    });
    const avgDaysBetweenPunchCardPurchases = average(punchIntervalsDays);

    return {
      activeSubscriptions,
      activePunchCards,
      subscriptionJoinLeaveByMonth,
      punchCardPurchasesByMonth,
      registrationDistributionLastMonth,
      averageStudentsLastMonth,
      classTypeDistributionLastMonth,
      classDistributionByClassLastMonth,
      averageStudentsByClassLastMonth: classDistributionByClassLastMonth,
      averageTenure,
      subscriptionRetention,
      punchCardReturnRate,
      avgDaysBetweenPunchCardPurchases,
    };
  }
}

export default new AdminDashboardService();
