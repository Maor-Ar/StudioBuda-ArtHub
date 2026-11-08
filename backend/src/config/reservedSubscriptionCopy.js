export const RESERVED_SUBSCRIPTION_PRODUCT_ID = 'reserved-subscription-weekly';
export const RESERVED_SUBSCRIPTION_TITLE = 'מנוי שיעור קבוע';
export const RESERVED_SUBSCRIPTION_SUBTITLE = 'שיעור שבועי קבוע - מתחדש';
export const STUDIO_OVERBOOK_EMAIL = 'studio.buda2@gmail.com';

/**
 * New terms, same tone as the live 4-entrance subscription.
 * Price is not stored here; the seed script copies it from that product.
 */
export const RESERVED_SUBSCRIPTION_TERMS_HTML = [
  '<p dir="rtl">* המנוי משריין מקום בשיעור שבועי אחד שנבחר, והוא בתוקף לחודש אחד מיום התשלום. זה אינו מנוי של 4 כניסות כלליות.</p>',
  '<p dir="rtl">• כל מפגש של השיעור שנבחר כלול כל עוד התקופה ששולמה פעילה, גם אם בחודש יש מפגש חמישי. בחודש ארוך המפגש הנוסף כלול במחיר, כך שאפשר לקבל מפגש אחד נוסף בלי תשלום נפרד, והוא לא יורד ממכסה.</p>',
  '<p dir="rtl">• בחודש קצר יותר לא נשארת יתרה ואין זיכוי לחודש הבא. המפגשים אינם נצברים ואינם עוברים לחודש הבא.</p>',
  '<p dir="rtl">• החיוב חודשי ומתחדש. ניתן לבטל את המנוי בכל שלב, והביטול ייכנס לתוקף מהחיוב הבא שטרם בוצע. אחרי הביטול המקום נשאר שמור עד סוף התקופה ששולמה.</p>',
  '<p dir="rtl">• אם חיוב החידוש נכשל, המקום שמור משתחרר מיד.</p>',
  '<p dir="rtl">• לא ניתן לבטל שבוע בודד בנפרד מהמנוי.</p>',
  '<p dir="rtl">• לאחר ביצוע תשלום חודשי, לא יתבצע החזר כספי עבור אותו חודש.</p>',
  '<p dir="rtl">• המנוי הוא אישי ואינו ניתן להעברה.</p>',
  '<p dir="rtl">* הסטודיו שומר לעצמו את הזכות לבצע שינויים בלו״ז או במדריכים/ות במקרה הצורך. לשאלות ולביטול אפשר לפנות לסטודיו.</p>',
].join('');
