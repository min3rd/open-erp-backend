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
    FIND_USER_BY_USERNAME: 'findUserByUsername',
    FIND_USER_BY_ID: 'findUserById',
    CREATE_USER: 'createUser',
    UPDATE_USER: 'updateUser',
    UPDATE_USER_STATUS: 'updateUserStatus',
    UPDATE_LAST_LOGIN: 'updateLastLogin',
    UPDATE_USER_PASSWORD: 'updateUserPassword',
    GET_USER_ORGANIZATIONS: 'getUserOrganizations',
    ADD_USER_TO_ORGANIZATION: 'addUserToOrganization',
    REMOVE_USER_FROM_ORGANIZATION: 'removeUserFromOrganization',
    COUNT_USERS: 'countUsers',
    GET_USER_WITH_ROLES: 'getUserWithRoles',
    ADD_ROLE_TO_USER: 'addRoleToUser',
    REMOVE_ROLE_FROM_USER: 'removeRoleFromUser',
    ENSURE_SYSTEM_ROLE_EXISTS: 'ensureSystemRoleExists',
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

  // Organization Service RPC Methods (placeholder for future)
  ORGANIZATION: {
    // Add organization RPC methods as needed
  },

  // Config Service RPC Methods
  CONFIG: {
    // Navigation RPC Methods
    GET_NAVIGATION_GLOBAL: 'getNavigationGlobal',
    GET_NAVIGATION_MODULE: 'getNavigationModule',
    RELOAD_NAVIGATION_CACHE: 'reloadNavigationCache',
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

  // Organization Events
  ORGANIZATION: {
    ORG_CREATED: 'organization.organization.created',
    ORG_UPDATED: 'organization.organization.updated',
    ORG_DELETED: 'organization.organization.deleted',
    MEMBER_INVITED: 'organization.member.invited',
    MEMBER_JOINED: 'organization.member.joined',
    MEMBER_REMOVED: 'organization.member.removed',
    INVITATION_ACCEPTED: 'organization.invitation.accepted',
    RELATION_CREATED: 'organization.relation.created',
    RELATION_UPDATED: 'organization.relation.updated',
  },

  // Config Events
  CONFIG: {
    GLOBAL_UPSERTED: 'config.global.upserted',
    GLOBAL_UPDATED: 'config.global.updated',
    GLOBAL_DELETED: 'config.global.deleted',
    USER_UPSERTED: 'config.user.upserted',
    USER_UPDATED: 'config.user.updated',
    USER_DELETED: 'config.user.deleted',
  },

  // Navigation Events
  NAVIGATION: {
    CREATED: 'navigation.created',
    UPDATED: 'navigation.updated',
    DELETED: 'navigation.deleted',
    MOVED: 'navigation.moved',
  },
} as const;

/**
 * Type helpers for RPC methods
 */
export type UserRpcMethod =
  (typeof RPC_METHODS.USER)[keyof typeof RPC_METHODS.USER];
export type NotificationRpcMethod =
  (typeof RPC_METHODS.NOTIFICATION)[keyof typeof RPC_METHODS.NOTIFICATION];
export type AuthRpcMethod =
  (typeof RPC_METHODS.AUTH)[keyof typeof RPC_METHODS.AUTH];
export type OrganizationRpcMethod =
  (typeof RPC_METHODS.ORGANIZATION)[keyof typeof RPC_METHODS.ORGANIZATION];
export type ConfigRpcMethod =
  (typeof RPC_METHODS.CONFIG)[keyof typeof RPC_METHODS.CONFIG];

/**
 * Type helpers for event names
 */
export type UserEvent =
  (typeof EVENT_NAMES.USER)[keyof typeof EVENT_NAMES.USER];
export type AuthEvent =
  (typeof EVENT_NAMES.AUTH)[keyof typeof EVENT_NAMES.AUTH];
export type NotificationEvent =
  (typeof EVENT_NAMES.NOTIFICATION)[keyof typeof EVENT_NAMES.NOTIFICATION];
export type OrganizationEvent =
  (typeof EVENT_NAMES.ORGANIZATION)[keyof typeof EVENT_NAMES.ORGANIZATION];
export type ConfigEvent =
  (typeof EVENT_NAMES.CONFIG)[keyof typeof EVENT_NAMES.CONFIG];
export type NavigationEvent =
  (typeof EVENT_NAMES.NAVIGATION)[keyof typeof EVENT_NAMES.NAVIGATION];
