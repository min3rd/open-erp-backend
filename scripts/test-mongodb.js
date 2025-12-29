#!/usr/bin/env node

/**
 * Test MongoDB connection and CRUD operations
 * 
 * This script tests the MongoDB setup by:
 * 1. Connecting to MongoDB
 * 2. Creating a test user
 * 3. Reading the user
 * 4. Updating the user
 * 5. Deleting the user
 * 
 * Usage:
 *   node scripts/test-mongodb.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDB() {
  // Build connection string with credentials if provided
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'open_erp';
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASS;
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

  // Build connection string with credentials
  if (user && pass) {
    const match = uri.match(/mongodb:\/\/(.+)/);
    if (match) {
      const hostPort = match[1];
      uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hostPort}/?authSource=${authSource}`;
    }
  }
  
  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  const client = new MongoClient(uri, options);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // CREATE
    console.log('📝 Testing CREATE operation...');
    const testUser = {
      username: 'test_user_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const insertResult = await usersCollection.insertOne(testUser);
    console.log(`✅ User created with ID: ${insertResult.insertedId}\n`);

    // READ
    console.log('📖 Testing READ operation...');
    const foundUser = await usersCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ User found:', {
      id: foundUser._id,
      username: foundUser.username,
      email: foundUser.email,
    });
    console.log('');

    // UPDATE
    console.log('✏️  Testing UPDATE operation...');
    const updateResult = await usersCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { firstName: 'Updated', lastName: 'Name', updatedAt: new Date() } }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} user(s)\n`);

    // READ updated
    const updatedUser = await usersCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Updated user:', {
      id: updatedUser._id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    });
    console.log('');

    // SOFT DELETE (set deletedAt)
    console.log('🗑️  Testing SOFT DELETE operation...');
    await usersCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { deletedAt: new Date(), status: 'inactive' } }
    );
    console.log('✅ User soft deleted\n');

    // COUNT
    console.log('🔢 Testing COUNT operation...');
    const totalCount = await usersCollection.countDocuments({});
    const activeCount = await usersCollection.countDocuments({ deletedAt: null });
    console.log(`✅ Total users: ${totalCount}`);
    console.log(`✅ Active users: ${activeCount}\n`);

    // CLEANUP - Hard delete
    console.log('🧹 Cleaning up test data...');
    await usersCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test user deleted\n');

    console.log('✅ All MongoDB CRUD operations completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  ✅ Connection: OK');
    console.log('  ✅ CREATE: OK');
    console.log('  ✅ READ: OK');
    console.log('  ✅ UPDATE: OK');
    console.log('  ✅ SOFT DELETE: OK');
    console.log('  ✅ COUNT: OK');
    console.log('  ✅ HARD DELETE: OK');

  } catch (error) {
    console.error('❌ Error during MongoDB test:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMongoDB();
}

module.exports = testMongoDB;
