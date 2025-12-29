// In this file you can configure migrate-mongo

const config = {
  mongodb: {
    url: (() => {
      const baseUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const user = process.env.MONGODB_USER;
      const pass = process.env.MONGODB_PASS;
      const dbName = process.env.MONGODB_DB || "open_erp";
      const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
      
      // If credentials are provided, build connection string with auth
      if (user && pass) {
        // Extract host and port from URI
        const match = baseUri.match(/mongodb:\/\/(.+)/);
        if (match) {
          const hostPort = match[1];
          return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hostPort}/${dbName}?authSource=${authSource}`;
        }
      }
      
      return `${baseUri}/${dbName}`;
    })(),

    databaseName: process.env.MONGODB_DB || "open_erp",

    options: {
      serverSelectionTimeoutMS: 10000,
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
