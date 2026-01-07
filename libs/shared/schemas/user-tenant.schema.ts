import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserTenantDocument = HydratedDocument<UserTenant>;

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  BILLING = 'billing',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  REVOKED = 'revoked',
}

@Schema({
  timestamps: true,
  collection: 'user_tenants',
  versionKey: false,
})
export class UserTenant extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  })
  tenantId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TenantRole),
    default: TenantRole.MEMBER,
    required: true,
    index: true,
  })
  role: TenantRole;

  @Prop({
    type: String,
    enum: Object.values(MembershipStatus),
    default: MembershipStatus.ACTIVE,
    required: true,
    index: true,
  })
  status: MembershipStatus;

  @Prop({
    type: Date,
    default: null,
  })
  joinedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  invitedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  invitedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Date,
    default: null,
  })
  revokedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  revokedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;
}

export const UserTenantSchema = SchemaFactory.createForClass(UserTenant);

// Compound indexes
// Ensure one user can only have one membership per tenant
UserTenantSchema.index(
  { userId: 1, tenantId: 1 },
  { unique: true },
);

UserTenantSchema.index({ tenantId: 1, status: 1 });
UserTenantSchema.index({ userId: 1, status: 1 });
UserTenantSchema.index({ tenantId: 1, role: 1 });
UserTenantSchema.index({ tenantId: 1, userId: 1, status: 1 });

// TTL index for soft-deleted memberships
UserTenantSchema.index(
  { deletedAt: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { deletedAt: { $ne: null } },
  },
);

// Middleware to exclude soft-deleted documents by default
UserTenantSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
UserTenantSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

UserTenantSchema.virtual('isActive').get(function () {
  return this.status === MembershipStatus.ACTIVE;
});

UserTenantSchema.virtual('isInvited').get(function () {
  return this.status === MembershipStatus.INVITED;
});

// Ensure virtuals are included in JSON output
UserTenantSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

UserTenantSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
