// In this file you can configure migrate-mongo

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017",

    databaseName: process.env.MONGODB_DB || "open_erp",

    options: {
      auth: process.env.MONGODB_USER && process.env.MONGODB_PASS ? {
        username: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASS,
      } : undefined,
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // The mongodb collection where the lock will be created.
  lockCollectionName: "changelog_lock",

  // The value in seconds for the TTL index that will be used for the lock. Value of 0 will disable the feature.
  lockTtl: 0,

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs',
};

module.exports = config;
