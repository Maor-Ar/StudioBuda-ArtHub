/**
 * Script to clean the database - removes all users, events, registrations, and transactions
 * WARNING: This will delete ALL data from the database!
 * 
 * Usage: node scripts/cleanDatabase.js
 */

import { db, auth } from '../src/config/firebase.js';
import logger from '../src/utils/logger.js';

const cleanDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup...\n');

    // 1. Delete all event registrations
    console.log('📋 Deleting event registrations...');
    const registrationsSnapshot = await db.collection('event_registrations').get();
    const registrationsBatch = db.batch();
    let registrationsCount = 0;
    registrationsSnapshot.forEach((doc) => {
      registrationsBatch.delete(doc.ref);
      registrationsCount++;
    });
    if (registrationsCount > 0) {
      await registrationsBatch.commit();
      console.log(`   ✅ Deleted ${registrationsCount} event registrations`);
    } else {
      console.log('   ℹ️  No event registrations to delete');
    }

    // 2. Delete all transactions
    console.log('💳 Deleting transactions...');
    const transactionsSnapshot = await db.collection('transactions').get();
    const transactionsBatch = db.batch();
    let transactionsCount = 0;
    transactionsSnapshot.forEach((doc) => {
      transactionsBatch.delete(doc.ref);
      transactionsCount++;
    });
    if (transactionsCount > 0) {
      await transactionsBatch.commit();
      console.log(`   ✅ Deleted ${transactionsCount} transactions`);
    } else {
      console.log('   ℹ️  No transactions to delete');
    }

    // 3. Delete all events
    console.log('📅 Deleting events...');
    const eventsSnapshot = await db.collection('events').get();
    const eventsBatch = db.batch();
    let eventsCount = 0;
    eventsSnapshot.forEach((doc) => {
      eventsBatch.delete(doc.ref);
      eventsCount++;
    });
    if (eventsCount > 0) {
      await eventsBatch.commit();
      console.log(`   ✅ Deleted ${eventsCount} events`);
    } else {
      console.log('   ℹ️  No events to delete');
    }

    // 4. Delete all Firestore users
    console.log('👥 Deleting Firestore users...');
    const usersSnapshot = await db.collection('users').get();
    const usersBatch = db.batch();
    let usersCount = 0;
    const firebaseUids = [];
    usersSnapshot.forEach((doc) => {
      usersBatch.delete(doc.ref);
      usersCount++;
      // Collect Firebase UIDs for deletion from Firebase Auth
      const userData = doc.data();
      if (doc.id && doc.id.length < 30) {
        // If document ID looks like a Firebase UID, collect it
        firebaseUids.push(doc.id);
      }
    });
    if (usersCount > 0) {
      await usersBatch.commit();
      console.log(`   ✅ Deleted ${usersCount} Firestore user documents`);
    } else {
      console.log('   ℹ️  No Firestore users to delete');
    }

    // 5. Delete all Firebase Auth users
    console.log('🔥 Deleting Firebase Auth users...');
    let authUsersCount = 0;
    let listUsersResult;
    do {
      listUsersResult = await auth.listUsers(1000); // List up to 1000 users at a time
      const deletePromises = listUsersResult.users.map((userRecord) => {
        return auth.deleteUser(userRecord.uid);
      });
      await Promise.all(deletePromises);
      authUsersCount += listUsersResult.users.length;
    } while (listUsersResult.pageToken);
    
    if (authUsersCount > 0) {
      console.log(`   ✅ Deleted ${authUsersCount} Firebase Auth users`);
    } else {
      console.log('   ℹ️  No Firebase Auth users to delete');
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Event Registrations: ${registrationsCount}`);
    console.log(`   - Transactions: ${transactionsCount}`);
    console.log(`   - Events: ${eventsCount}`);
    console.log(`   - Firestore Users: ${usersCount}`);
    console.log(`   - Firebase Auth Users: ${authUsersCount}`);
    console.log('\n💡 You can now seed the database with fresh data using:');
    console.log('   npm run seed:classes');

  } catch (error) {
    console.error('\n❌ Error during database cleanup:', error);
    logger.error('Database cleanup failed:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Confirm before proceeding
console.log('⚠️  WARNING: This will delete ALL data from the database!');
console.log('   - All users (Firebase Auth + Firestore)');
console.log('   - All events');
console.log('   - All event registrations');
console.log('   - All transactions');
console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');

await new Promise((resolve) => setTimeout(resolve, 3000));

cleanDatabase()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

