/**
 * Seed User Transactions
 *
 * This script adds a subscription and punch card transaction for a specific user
 * Usage: node scripts/seedUserTransactions.js <userEmail>
 */

import { db } from '../src/config/firebase.js';
import { TRANSACTION_TYPES } from '../src/config/constants.js';

const USER_EMAIL = 'maorarnon@gmail.com';

// Find user by email
const findUserByEmail = async (email) => {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();
  
  if (snapshot.empty) {
    throw new Error(`User with email ${email} not found`);
  }
  
  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() };
};

// Create subscription transaction
const createSubscription = async (userId) => {
  const now = new Date();
  const subscriptionData = {
    userId,
    transactionType: TRANSACTION_TYPES.SUBSCRIPTION,
    amount: 300.0, // Example amount
    monthlyEntries: 8, // 8 entries per month
    invoiceId: `INV-SUB-${Date.now()}`, // Mock invoice ID
    isActive: true,
    purchaseDate: now,
    lastRenewalDate: now,
    entriesUsedThisMonth: 0,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('transactions').add(subscriptionData);
  console.log(`✅ Created subscription transaction: ${docRef.id}`);
  return { id: docRef.id, ...subscriptionData };
};

// Create punch card transaction
const createPunchCard = async (userId) => {
  const now = new Date();
  const punchCardData = {
    userId,
    transactionType: TRANSACTION_TYPES.PUNCH_CARD,
    amount: 400.0, // Example amount
    totalEntries: 10, // 10 entries total
    entriesRemaining: 10, // All entries available
    invoiceId: `INV-PC-${Date.now()}`, // Mock invoice ID
    isActive: true,
    purchaseDate: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('transactions').add(punchCardData);
  console.log(`✅ Created punch card transaction: ${docRef.id}`);
  return { id: docRef.id, ...punchCardData };
};

// Main function
const seedTransactions = async () => {
  try {
    console.log(`\n🔍 Looking for user: ${USER_EMAIL}`);
    
    // Find user
    const user = await findUserByEmail(USER_EMAIL);
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.id})`);
    
    // Create subscription
    console.log('\n📝 Creating subscription transaction...');
    await createSubscription(user.id);
    
    // Create punch card
    console.log('\n📝 Creating punch card transaction...');
    await createPunchCard(user.id);
    
    console.log('\n✅ Successfully added transactions for user!');
    console.log('\nTransactions created:');
    console.log('  - Subscription: 8 monthly entries');
    console.log('  - Punch Card: 10 total entries');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the script
seedTransactions()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

