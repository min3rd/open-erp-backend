import { MongooseModuleOptions } from '@nestjs/mongoose';

export interface DatabaseConfig {
  uri: string;
  user?: string;
  pass?: string;
  dbName: string;
  authSource?: string;
  replicaSet?: string;
  useTls?: boolean;
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  connectTimeoutMS?: number;
  socketTimeoutMS?: number;
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  user: process.env.MONGODB_USER,
  pass: process.env.MONGODB_PASS || process.env.MONGODB_PASSWORD,
  dbName: process.env.MONGODB_DB || 'open_erp',
  authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
  replicaSet: process.env.MONGODB_REPLICA_SET || undefined,
  useTls: process.env.MONGODB_USE_TLS === 'true',
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
  serverSelectionTimeoutMS: parseInt(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000',
    10,
  ),
  connectTimeoutMS: parseInt(
    process.env.MONGODB_CONNECT_TIMEOUT || '10000',
    10,
  ),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
});

export const getMongooseOptions = (
  config: DatabaseConfig,
): MongooseModuleOptions => {
  const options: MongooseModuleOptions = {
    uri: config.uri,
    dbName: config.dbName,
    maxPoolSize: config.maxPoolSize,
    minPoolSize: config.minPoolSize,
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
    connectTimeoutMS: config.connectTimeoutMS,
    socketTimeoutMS: config.socketTimeoutMS,
    retryAttempts: 5,
    retryDelay: 3000,
  };

  if (config.user && config.pass) {
    options.auth = {
      username: config.user,
      password: config.pass,
    };
    options.authSource = config.authSource;
  }

  if (config.replicaSet) {
    options.replicaSet = config.replicaSet;
  }

  if (config.useTls) {
    options.tls = true;
    options.tlsAllowInvalidCertificates =
      process.env.NODE_ENV === 'development';
  }

  return options;
};
