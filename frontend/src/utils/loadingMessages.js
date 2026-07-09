const OPERATION_LOADING_MESSAGES = {
  Login: 'מתחבר...',
  LoginWithOAuth: 'מתחבר...',
  Register: 'נרשם...',
  ForgotPassword: 'שולח קישור איפוס...',
  ResetPassword: 'מעדכן סיסמה...',
  RegisterForEvent: 'נרשמים לשיעור...',
  CancelRegistration: 'מבטל הרשמה...',
  AdminCancelRegistration: 'מבטל הרשמה...',
  AdminReserveSpot: 'שומר שריון...',
  AdminRemoveReservedSpot: 'מסיר שריון...',
  AdminCancelEventOccurrence: 'מבטל שיעור...',
  AdminReenableEventOccurrence: 'מפעיל שיעור מחדש...',
  CreatePaymentSession: 'מכין תשלום...',
  CreateEvent: 'יוצר אירוע...',
  UpdateEvent: 'שומר אירוע...',
  DeleteEvent: 'מוחק אירוע...',
  CreateProduct: 'יוצר מוצר...',
  UpdateProduct: 'שומר מוצר...',
  DeleteProduct: 'מוחק מוצר...',
  CreateTransaction: 'יוצר עסקה...',
  UpdateTransaction: 'שומר עסקה...',
  RenewSubscription: 'מחדש מנוי...',
  CancelSubscription: 'מבטל מנוי...',
  AdminUpdateUser: 'שומר משתמש...',
  AdminCreateTransactionForUser: 'שומר רכישה...',
  Me: 'טוען פרופיל...',
  GetEvents: 'טוען אירועים...',
  GetEvent: 'טוען אירוע...',
  GetMyRegistrations: 'טוען רישומים...',
  GetEventRegistrations: 'טוען רשימת נרשמים...',
  GetMyTransactions: 'טוען עסקאות...',
  GetProducts: 'טוען מוצרים...',
  GetAllEvents: 'טוען אירועים...',
  GetAllTransactions: 'טוען עסקאות...',
  GetAllUsers: 'טוען משתמשים...',
  GetAllProducts: 'טוען מוצרים...',
  GetAdminDashboardMetrics: 'טוען נתוני דשבורד...',
};

const OPERATION_MESSAGE_PRIORITY = [
  'Login',
  'LoginWithOAuth',
  'Register',
  'ForgotPassword',
  'ResetPassword',
  'RegisterForEvent',
  'CancelRegistration',
  'AdminCancelRegistration',
  'AdminReserveSpot',
  'AdminRemoveReservedSpot',
  'AdminCancelEventOccurrence',
  'AdminReenableEventOccurrence',
  'CreatePaymentSession',
  'CreateEvent',
  'UpdateEvent',
  'DeleteEvent',
  'CreateProduct',
  'UpdateProduct',
  'DeleteProduct',
  'CreateTransaction',
  'UpdateTransaction',
  'RenewSubscription',
  'CancelSubscription',
  'AdminUpdateUser',
  'AdminCreateTransactionForUser',
  'Me',
  'GetEvents',
  'GetEvent',
  'GetMyRegistrations',
  'GetEventRegistrations',
  'GetMyTransactions',
  'GetProducts',
  'GetAllEvents',
  'GetAllTransactions',
  'GetAllUsers',
  'GetAllProducts',
  'GetAdminDashboardMetrics',
];

export function resolveLoadingMessage(activeOperationNames) {
  if (!activeOperationNames.length) {
    return null;
  }

  for (const name of OPERATION_MESSAGE_PRIORITY) {
    if (activeOperationNames.includes(name) && OPERATION_LOADING_MESSAGES[name]) {
      return OPERATION_LOADING_MESSAGES[name];
    }
  }

  for (const name of activeOperationNames) {
    if (OPERATION_LOADING_MESSAGES[name]) {
      return OPERATION_LOADING_MESSAGES[name];
    }
  }

  return 'טוען...';
}
