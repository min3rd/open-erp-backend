import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserAuditEventDocument = HydratedDocument<UserAuditEvent>;

export enum UserAuditEventType {
  // Authentication events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGIN_FAILED = 'user.login.failed',
  USER_SESSION_EXPIRED = 'user.session.expired',

  // Profile management
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_PROFILE_UPDATED = 'user.profile.updated',
  USER_EMAIL_CHANGED = 'user.email.changed',
  USER_PASSWORD_CHANGED = 'user.password.changed',
  USER_PASSWORD_RESET = 'user.password.reset',
  USER_PASSWORD_RESET_ADMIN = 'user.password.reset.admin',

  // Account status
  USER_BLOCKED = 'user.blocked',
  USER_UNBLOCKED = 'user.unblocked',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',

  // Session management
  USER_SESSIONS_REVOKED = 'user.sessions.revoked',
  USER_SESSIONS_REVOKED_ADMIN = 'user.sessions.revoked.admin',

  // Role and permissions
  USER_ROLE_GRANTED = 'user.role.granted',
  USER_ROLE_REVOKED = 'user.role.revoked',
  USER_PERMISSION_GRANTED = 'user.permission.granted',
  USER_PERMISSION_REVOKED = 'user.permission.revoked',

  // Organization membership
  USER_ORGANIZATION_JOINED = 'user.organization.joined',
  USER_ORGANIZATION_LEFT = 'user.organization.left',
  USER_ORGANIZATION_REMOVED = 'user.organization.removed',
}

@Schema({
  timestamps: true,
  collection: 'user_audit_events',
  versionKey: false,
})
export class UserAuditEvent extends Document {
  @Prop({
    type: String,
    enum: Object.values(UserAuditEventType),
    required: true,
    index: true,
  })
  action: UserAuditEventType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  performedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  resource: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
  })
  payload?: any;

  @Prop({
    type: String,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
    index: true,
  })
  ipAddress?: string;

  @Prop({
    type: String,
    trim: true,
  })
  userAgent?: string;

  @Prop({
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true,
  })
  status: string;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const UserAuditEventSchema =
  SchemaFactory.createForClass(UserAuditEvent);

// Compound indexes for efficient querying
UserAuditEventSchema.index({ userId: 1, createdAt: -1 });
UserAuditEventSchema.index({ action: 1, createdAt: -1 });
UserAuditEventSchema.index({ performedBy: 1, createdAt: -1 });
UserAuditEventSchema.index({ userId: 1, action: 1 });
UserAuditEventSchema.index({ userId: 1, status: 1 });
UserAuditEventSchema.index({ resource: 1, createdAt: -1 });

// Text index for search functionality
UserAuditEventSchema.index(
  { action: 'text', resource: 'text', description: 'text' },
  { name: 'user_audit_events_text_search' },
);

// TTL index to auto-delete old audit logs after 2 years
UserAuditEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 63072000, name: 'user_audit_events_ttl' },
);

// Ensure virtuals are included in JSON output
UserAuditEventSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    ret.timestamp = ret.createdAt;
    delete ret._id;
    return ret;
  },
});

UserAuditEventSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    ret.timestamp = ret.createdAt;
    delete ret._id;
    return ret;
  },
});
