/**
 * RabbitMQ Configuration Constants
 * Defines exchanges, queues, bindings, and routing keys
 */

export const RABBITMQ_EXCHANGES = {
  // Event exchanges (Topic)
  EVENTS: 'erp.events',

  // RPC exchanges (Direct)
  RPC: 'erp.rpc',

  // Dead Letter Exchange
  DLX: 'erp.dlx',
} as const;

export const RABBITMQ_QUEUES = {
  // Auth service queues
  AUTH_EVENTS: 'auth.events',
  AUTH_RPC: 'auth.rpc',
  AUTH_DLX: 'auth.dlx',

  // User service queues
  USER_EVENTS: 'user.events',
  USER_RPC: 'user.rpc',
  USER_DLX: 'user.dlx',

  // Notification service queues
  NOTIFICATION_EVENTS: 'notification.events',
  NOTIFICATION_RPC: 'notification.rpc',
  NOTIFICATION_DLX: 'notification.dlx',

  // Tenant service queues
  TENANT_EVENTS: 'tenant.events',
  TENANT_RPC: 'tenant.rpc',
  TENANT_DLX: 'tenant.dlx',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  // Auth events
  AUTH_USER_REGISTERED: 'auth.user.registered',
  AUTH_USER_LOGIN: 'auth.user.login',
  AUTH_USER_LOGOUT: 'auth.user.logout',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  AUTH_USER_PASSWORD_CHANGED: 'auth.user.password.changed',
  AUTH_USER_VERIFIED: 'auth.user.verified',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PROFILE_UPDATED: 'user.profile.updated',

  // Notification events
  NOTIFICATION_EMAIL_SENT: 'notification.email.sent',
  NOTIFICATION_SMS_SENT: 'notification.sms.sent',
  NOTIFICATION_PUSH_SENT: 'notification.push.sent',

  // Tenant events
  TENANT_ORG_CREATED: 'tenant.organization.created',
  TENANT_ORG_UPDATED: 'tenant.organization.updated',
  TENANT_ORG_DELETED: 'tenant.organization.deleted',
  TENANT_MEMBER_INVITED: 'tenant.member.invited',
  TENANT_MEMBER_JOINED: 'tenant.member.joined',
  TENANT_MEMBER_REMOVED: 'tenant.member.removed',
  TENANT_INVITATION_ACCEPTED: 'tenant.invitation.accepted',
  TENANT_RELATION_CREATED: 'tenant.relation.created',
  TENANT_RELATION_UPDATED: 'tenant.relation.updated',

  // RPC routing keys
  RPC_AUTH: 'rpc.auth',
  RPC_USER: 'rpc.user',
  RPC_NOTIFICATION: 'rpc.notification',
  RPC_TENANT: 'rpc.tenant',
} as const;

export const RABBITMQ_DEFAULT_CONFIG = {
  heartbeat: 30,
  prefetch: 10,
  connectionTimeout: 10000,
  socketOptions: {
    // Connection recovery settings
    heartbeatIntervalInSeconds: 30,
    reconnectTimeInSeconds: 5,
  },
  vhost: '/',

  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // Dead letter configuration
  deadLetter: {
    ttl: 60000, // 1 minute
  },
  
  // Message handler timeout (milliseconds)
  handlerTimeout: 30000, // 30 seconds
} as const;

/**
 * Get RabbitMQ configuration from environment variables
 */
export function getRabbitMQConfig() {
  const heartbeat = parseInt(
    process.env.RABBITMQ_HEARTBEAT ||
      String(RABBITMQ_DEFAULT_CONFIG.heartbeat),
  );
  const reconnectTime = parseInt(
    process.env.RABBITMQ_RECONNECT_TIME || '5',
  );

  return {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    user: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASS || 'guest',
    vhost: process.env.RABBITMQ_VHOST || RABBITMQ_DEFAULT_CONFIG.vhost,
    heartbeat,
    prefetch: parseInt(
      process.env.RABBITMQ_PREFETCH || String(RABBITMQ_DEFAULT_CONFIG.prefetch),
    ),
    connectionTimeout: parseInt(
      process.env.RABBITMQ_CONNECTION_TIMEOUT ||
        String(RABBITMQ_DEFAULT_CONFIG.connectionTimeout),
    ),
    socketOptions: {
      heartbeatIntervalInSeconds: heartbeat,
      reconnectTimeInSeconds: reconnectTime,
    },
    handlerTimeout: parseInt(
      process.env.RABBITMQ_HANDLER_TIMEOUT ||
        String(RABBITMQ_DEFAULT_CONFIG.handlerTimeout),
    ),
  };
}
