import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { GET_ADMIN_DASHBOARD_METRICS } from '../../services/graphql/queries';
import KpiCard from '../../components/admin-dashboard/KpiCard';
import BarChartCard from '../../components/admin-dashboard/BarChartCard';
import PieChartCard from '../../components/admin-dashboard/PieChartCard';
import LineChartCard from '../../components/admin-dashboard/LineChartCard';

const SECTIONS = [
  {
    key: 'events',
    title: 'ניהול אירועים',
    shortLabel: 'אירועים',
    description: 'יצירה, עריכה ומחיקה של שיעורים וסדנאות',
    icon: '📅',
    screen: 'AdminEvents',
  },
  {
    key: 'transactions',
    title: 'ניהול עסקאות',
    shortLabel: 'עסקאות',
    description: 'צפייה בעסקאות, חידוש וביטול מנויים',
    icon: '💳',
    screen: 'AdminTransactions',
  },
  {
    key: 'users',
    title: 'ניהול משתמשים',
    shortLabel: 'משתמשים',
    description: 'צפייה ברשימת המשתמשים וחיפוש',
    icon: '👥',
    screen: 'AdminUsers',
  },
  {
    key: 'products',
    title: 'ניהול מוצרים',
    shortLabel: 'מוצרים',
    description: 'מחירים, תנאים ורכישות באתר',
    icon: '🛒',
    screen: 'AdminProducts',
  },
];

const HELP_TEXTS = {
  joinLeave:
    'מצטרפים = משתמשים שהרכישה הראשונה שלהם של מנוי הייתה באותו חודש. עוזבים = משתמשים שהיו פעילים בחודש הקודם וכבר לא פעילים בחודש הנוכחי.',
  punchMonthly:
    'הגרף מציג רכישות של כרטיסיות לפי תאריך רכישה, ולא רישומים לשיעורים. לכן יכול להיות פער מול גרף התפלגות רישומים.',
  registrationByType:
    'המדד מחושב לפי רישומים ב-30 הימים האחרונים (לא רכישות). לכל רישום משויך סוג העסקה ששימשה אותו: מנוי, כרטיסיה, שיעור ניסיון או חד פעמי.',
  avgStudents:
    'החישוב לפי מופעי שיעורים בפועל ב-30 הימים האחרונים (לפי תאריך שיעור), לא כולל מופעים שבוטלו.',
  classDistribution:
    'החישוב דינמי לפי שם השיעור בפועל. שמות ארוכים מוצגים בקיצור (2 מילים), ובלחיצה/hover רואים את השם המלא.',
  averageTenure:
    'מנויים: ממוצע חודשי פעילות במנויים שהסתיימו. כרטיסיות: ממוצע מספר רכישות כרטיסיה לכל משתמש.',
  subRetention:
    'קוהורט מנויים: עבור כל חודש מאז ההצטרפות בודקים כמה משתמשים עדיין פעילים מתוך אלו שהגיעו לנקודת הזמן הזו.',
  punchReturn:
    'לכל X (מספר רכישות), מוצג אחוז המשתמשים שרכשו לפחות X כרטיסיות מתוך כלל רוכשי הכרטיסיות.',
  punchGap:
    'מחושב רק למשתמשים שרכשו יותר מכרטיסיה אחת: מחשבים ימים בין כל שתי רכישות עוקבות ולוקחים ממוצע.',
};

const AdminHubScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useQuery(GET_ADMIN_DASHBOARD_METRICS, {
    fetchPolicy: 'network-only',
  });
  const metrics = data?.adminDashboardMetrics;

  const formatDecimal = (value) => Number(value || 0).toFixed(1);
  const classColorPalette = ['#AB5FBD', '#42A5F5', '#FFA726', '#66BB6A', '#B0A0B8', '#EF5350', '#26C6DA'];

  const dynamicClassItems = (metrics?.classDistributionByClassLastMonth || []).map((item, index) => ({
    key: item.key,
    label: item.shortLabel || item.fullLabel,
    fullLabel: item.fullLabel,
    value: item.registrationsCount,
    color: classColorPalette[index % classColorPalette.length],
  }));

  const avgByClassTop3 = (metrics?.averageStudentsByClassLastMonth || [])
    .slice(0, 3)
    .map((item) => `${item.shortLabel || item.fullLabel}: ${formatDecimal(item.avgStudents)}`)
    .join(' | ');

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
        <View style={styles.quickActionsRow}>
          {SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={styles.quickAction}
              onPress={() => navigation.navigate(section.screen)}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionCircle}>
                <Text style={styles.quickActionIcon}>{section.icon}</Text>
              </View>
              <Text style={styles.quickActionText}>{section.shortLabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>דשבורד ביצועים</Text>
        {loading && !metrics ? (
          <ActivityIndicator size="large" color="#FFD1E3" style={{ marginVertical: 20 }} />
        ) : null}
        {error && !metrics ? (
          <Text style={styles.errorText}>לא הצלחנו לטעון נתוני דשבורד כרגע</Text>
        ) : null}
        {metrics ? (
          <View style={styles.dashboardContent}>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCell}>
                <KpiCard
                  title="מספר מנויים פעילים"
                  value={metrics.activeSubscriptions}
                  compact
                  infoText="מספר עסקאות מנוי פעילות כרגע."
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  title="מספר כרטיסיות פעילות"
                  value={metrics.activePunchCards}
                  compact
                  infoText="מספר עסקאות כרטיסיה פעילות כרגע."
                />
              </View>
            </View>

            <BarChartCard
              title="מנויים – הצטרפות / עזיבה לפי חודש"
              data={metrics.subscriptionJoinLeaveByMonth}
              keys={[
                { key: 'joined', label: 'מצטרפים', color: '#66BB6A' },
                { key: 'left', label: 'עוזבים', color: '#E57373' },
              ]}
              showValuesAbove
              infoText={HELP_TEXTS.joinLeave}
            />

            <BarChartCard
              title="כרטיסיות לפי חודש"
              data={metrics.punchCardPurchasesByMonth}
              keys={[{ key: 'count', label: 'רכישות', color: '#42A5F5' }]}
              showValuesAbove
              infoText={HELP_TEXTS.punchMonthly}
            />

            <PieChartCard
              title="התפלגות רישומים לפי סוג (30 ימים אחרונים)"
              items={[
                {
                  key: 'subscription',
                  label: 'מנויים',
                  value: metrics.registrationDistributionLastMonth.subscription,
                  color: '#AB5FBD',
                },
                {
                  key: 'punchCard',
                  label: 'כרטיסיות',
                  value: metrics.registrationDistributionLastMonth.punchCard,
                  color: '#42A5F5',
                },
                {
                  key: 'trialLesson',
                  label: 'שיעור ניסיון',
                  value: metrics.registrationDistributionLastMonth.trialLesson,
                  color: '#66BB6A',
                },
                {
                  key: 'singleLesson',
                  label: 'שיעור חד פעמי',
                  value: metrics.registrationDistributionLastMonth.singleLesson,
                  color: '#FFA726',
                },
              ]}
              infoText={HELP_TEXTS.registrationByType}
            />

            <KpiCard
              title="ממוצע תלמידים לשיעור (30 ימים אחרונים)"
              value={Number(metrics.averageStudentsLastMonth.overall || 0)}
              decimals={1}
              subtitle={avgByClassTop3 || 'אין מספיק נתונים לפי סוג שיעור'}
              infoText={HELP_TEXTS.avgStudents}
            />

            <PieChartCard
              title="התפלגות רישומים לפי שיעורים (30 ימים אחרונים)"
              items={dynamicClassItems}
              infoText={HELP_TEXTS.classDistribution}
            />

            <KpiCard
              title="וותק ממוצע"
              value={Number(metrics.averageTenure.subscriptionsMonths || 0)}
              decimals={1}
              suffix=" חודשים"
              subtitle={`כרטיסיות - ממוצע רכישות למשתמש: ${formatDecimal(metrics.averageTenure.punchCardsPurchasesPerUser)}`}
              infoText={HELP_TEXTS.averageTenure}
            />

            <LineChartCard
              title="אחוז נשארים לאורך זמן - מנויים"
              data={metrics.subscriptionRetention}
              lineColor="#66BB6A"
              infoText={HELP_TEXTS.subRetention}
            />
            <LineChartCard
              title="אחוז חוזרים - כרטיסיות"
              data={metrics.punchCardReturnRate}
              lineColor="#42A5F5"
              infoText={HELP_TEXTS.punchReturn}
            />

            <KpiCard
              title="זמן ממוצע בין רכישות כרטיסיות"
              value={Number(metrics.avgDaysBetweenPunchCardPurchases || 0)}
              decimals={1}
              suffix=" ימים"
              compact
              infoText={HELP_TEXTS.punchGap}
            />
          </View>
        ) : null}
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
    color: '#D4B8E0',
    textAlign: 'right',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#D4B8E0',
    textAlign: 'right',
    marginBottom: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: '#FFD1E3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 209, 227, 0.08)',
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionText: {
    color: '#FFD1E3',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFE2ED',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },
  dashboardContent: {
    gap: 14,
    marginBottom: 28,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCell: {
    flex: 1,
  },
  errorText: {
    color: '#FFD1E3',
    textAlign: 'right',
    marginBottom: 10,
  },
});

export default AdminHubScreen;
