/**
 * Seed Weekly Recurring Classes
 *
 * This script adds three weekly recurring classes to the database:
 * 1. תרגיל מתחלף - שיעור הדגל (Wednesday)
 * 2. פורטרט (Tuesday)
 * 3. רישום (Sunday)
 *
 * Each class has 2 time slots: 18:00-19:30 and 19:30-21:00
 * Max 8 attendees per slot
 */

import { db } from '../src/config/firebase.js';
import { EVENT_TYPES } from '../src/config/constants.js';

// Get next occurrence of a day of week
const getNextOccurrence = (dayOfWeek) => {
  const today = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = daysOfWeek.indexOf(dayOfWeek);
  const currentDay = today.getDay();

  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
};

const weeklyClasses = [
  {
    title: 'תרגיל מתחלף - שיעור הדגל',
    description: 'שיעור מתקדם עם תרגילים מתחלפים המתמקד בהתפתחות אישית ובשיפור מתמיד',
    dayOfWeek: 'Wednesday',
    slots: [
      { startTime: '18:00', duration: 90 },
      { startTime: '19:30', duration: 90 },
    ],
    instructorName: 'יערה בודה',
    maxRegistrations: 8,
    eventType: EVENT_TYPES.TRIAL,
    price: null,
  },
  {
    title: 'פורטרט',
    description: 'שיעור פורטרט המתמקד בציור ריאליסטי ובהבנת מבנה הפנים',
    dayOfWeek: 'Tuesday',
    slots: [
      { startTime: '18:00', duration: 90 },
      { startTime: '19:30', duration: 90 },
    ],
    instructorName: 'יערה בודה',
    maxRegistrations: 8,
    eventType: EVENT_TYPES.TRIAL,
    price: null,
  },
  {
    title: 'רישום',
    description: 'שיעור רישום למתחילים המתמקד בטכניקות ריאליסטיות ובסיסיות',
    dayOfWeek: 'Sunday',
    slots: [
      { startTime: '18:00', duration: 90 },
      { startTime: '19:30', duration: 90 },
    ],
    instructorName: 'יערה בודה',
    maxRegistrations: 8,
    eventType: EVENT_TYPES.TRIAL,
    price: null,
  },
];

const seedWeeklyClasses = async () => {
  try {
    console.log('🌱 Starting to seed weekly classes...\n');

    let totalCreated = 0;

    for (const classData of weeklyClasses) {
      const { title, description, dayOfWeek, slots, instructorName, maxRegistrations, eventType, price } = classData;

      console.log(`📅 Creating class: ${title}`);

      // Get the next occurrence of this day of week
      const nextDate = getNextOccurrence(dayOfWeek);

      // Create an event for each time slot
      for (const slot of slots) {
        const eventDoc = {
          date: nextDate,
          startTime: slot.startTime,
          duration: slot.duration,
          title,
          description,
          isRecurring: true,
          recurringIntervalDays: 7, // Weekly
          instructorName,
          maxRegistrations,
          eventType,
          price,
          isActive: true,
          registeredCount: 0,
          registeredUsers: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system-seed',
        };

        const docRef = await db.collection('events').add(eventDoc);
        console.log(`  ✅ Created slot ${slot.startTime} (ID: ${docRef.id})`);
        totalCreated++;
      }

      console.log('');
    }

    console.log(`\n🎉 Successfully created ${totalCreated} weekly recurring class events!`);
    console.log('\nClass schedule:');
    console.log('  Sunday:    רישום (18:00-19:30, 19:30-21:00)');
    console.log('  Tuesday:   פורטרט (18:00-19:30, 19:30-21:00)');
    console.log('  Wednesday: תרגיל מתחלף - שיעור הדגל (18:00-19:30, 19:30-21:00)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding weekly classes:', error);
    process.exit(1);
  }
};

// Run the seed script
seedWeeklyClasses();
