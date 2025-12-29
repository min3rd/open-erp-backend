/**
 * Seed script to populate the database with sample data
 * 
 * Usage:
 *   node scripts/seed.js
 * 
 * Environment variables:
 *   MONGODB_URI - MongoDB connection URI (default: mongodb://localhost:27017)
 *   MONGODB_USER - MongoDB username
 *   MONGODB_PASS - MongoDB password
 *   MONGODB_DB - Database name (default: open_erp)
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const sampleUsers = [
  {
    username: 'john_doe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    status: 'active',
    deletedAt: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    username: 'jane_smith',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    status: 'active',
    deletedAt: null,
    lastLoginAt: new Date(Date.now() - 86400000), // 1 day ago
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    username: 'bob_wilson',
    email: 'bob.wilson@example.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    status: 'inactive',
    deletedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    username: 'alice_jones',
    email: 'alice.jones@example.com',
    firstName: 'Alice',
    lastName: 'Jones',
    status: 'active',
    deletedAt: null,
    lastLoginAt: new Date(Date.now() - 3600000), // 1 hour ago
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    username: 'charlie_brown',
    email: 'charlie.brown@example.com',
    firstName: 'Charlie',
    lastName: 'Brown',
    status: 'suspended',
    deletedAt: null,
    lastLoginAt: new Date(Date.now() - 604800000), // 7 days ago
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seed() {
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
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Clear existing data (optional)
    console.log('Clearing existing users...');
    await usersCollection.deleteMany({});

    // Insert sample users
    console.log('Inserting sample users...');
    const result = await usersCollection.insertMany(sampleUsers);
    console.log(`${result.insertedCount} users inserted successfully`);

    // Display inserted users
    const users = await usersCollection.find({}).toArray();
    console.log('\nSample users:');
    users.forEach((user) => {
      console.log(`- ${user.username} (${user.email}) - Status: ${user.status}`);
    });

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = seed;
