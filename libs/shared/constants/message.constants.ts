/**
 * Message Constants for RPC and Event Handling
 * 
 * This file contains all RPC method names and event names used across microservices.
 * Using constants instead of hardcoded strings provides:
 * - Type safety and autocompletion
 * - Single source of truth
 * - Easy refactoring and renaming
 * - Prevention of typos
 */

/**
 * RPC Method Names
 * Used for synchronous request-response communication between services
 */
export const RPC_METHODS = {
  // User Service RPC Methods
  USER: {
    GET_USER: 'getUser',
    GET_USER_BY_EMAIL: 'getUserByEmail',
    FIND_USER_BY_EMAIL: 'findUserByEmail',
    FIND_USER_BY_ID: 'findUserById',
    CREATE_USER: 'createUser',
    UPDATE_USER_STATUS: 'updateUserStatus',
    UPDATE_LAST_LOGIN: 'updateLastLogin',
    UPDATE_USER_PASSWORD: 'updateUserPassword',
  },
  
  // Notification Service RPC Methods
  NOTIFICATION: {
    SEND_NOTIFICATION: 'sendNotification',
    SEND_VERIFICATION_EMAIL: 'sendVerificationEmail',
    SEND_PASSWORD_RESET_EMAIL: 'sendPasswordResetEmail',
    SEND_PASSWORD_CHANGED_EMAIL: 'sendPasswordChangedEmail',
  },
  
  // Auth Service RPC Methods (placeholder for future)
  AUTH: {
    // Add auth RPC methods as needed
  },
  
  // Tenant Service RPC Methods (placeholder for future)
  TENANT: {
    // Add tenant RPC methods as needed
  },
} as const;

/**
 * Event Names
 * Used for asynchronous event-driven communication between services
 */
export const EVENT_NAMES = {
  // User Events
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    REGISTERED: 'user.registered',
    LOGIN: 'user.login',
    PROFILE_UPDATED: 'user.profile.updated',
    PASSWORD_CHANGED: 'user.password.changed',
  },
  
  // Auth Events
  AUTH: {
    USER_REGISTERED: 'auth.user.registered',
    USER_LOGIN: 'auth.user.login',
    USER_LOGOUT: 'auth.user.logout',
    PASSWORD_CHANGED: 'auth.password.changed', // Legacy - deprecated
    USER_PASSWORD_CHANGED: 'auth.user.password.changed', // Use this for new code
    USER_VERIFIED: 'auth.user.verified',
  },
  
  // Notification Events
  NOTIFICATION: {
    EMAIL_SENT: 'notification.email.sent',
    SMS_SENT: 'notification.sms.sent',
    PUSH_SENT: 'notification.push.sent',
  },
  
  // Tenant Events
  TENANT: {
    ORG_CREATED: 'tenant.organization.created',
    ORG_UPDATED: 'tenant.organization.updated',
    ORG_DELETED: 'tenant.organization.deleted',
    MEMBER_INVITED: 'tenant.member.invited',
    MEMBER_JOINED: 'tenant.member.joined',
    MEMBER_REMOVED: 'tenant.member.removed',
    INVITATION_ACCEPTED: 'tenant.invitation.accepted',
    RELATION_CREATED: 'tenant.relation.created',
    RELATION_UPDATED: 'tenant.relation.updated',
  },
} as const;

/**
 * Type helpers for RPC methods
 */
export type UserRpcMethod = typeof RPC_METHODS.USER[keyof typeof RPC_METHODS.USER];
export type NotificationRpcMethod = typeof RPC_METHODS.NOTIFICATION[keyof typeof RPC_METHODS.NOTIFICATION];
export type AuthRpcMethod = typeof RPC_METHODS.AUTH[keyof typeof RPC_METHODS.AUTH];
export type TenantRpcMethod = typeof RPC_METHODS.TENANT[keyof typeof RPC_METHODS.TENANT];

/**
 * Type helpers for event names
 */
export type UserEvent = typeof EVENT_NAMES.USER[keyof typeof EVENT_NAMES.USER];
export type AuthEvent = typeof EVENT_NAMES.AUTH[keyof typeof EVENT_NAMES.AUTH];
export type NotificationEvent = typeof EVENT_NAMES.NOTIFICATION[keyof typeof EVENT_NAMES.NOTIFICATION];
export type TenantEvent = typeof EVENT_NAMES.TENANT[keyof typeof EVENT_NAMES.TENANT];
