import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrganizationInvitationDocument =
  HydratedDocument<OrganizationInvitation>;

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export enum InvitationScope {
  ORGANIZATION = 'organization',
  ORGANIZATION_AND_CHILDREN = 'organization-and-children',
}

@Schema({
  timestamps: true,
  collection: 'organization_invitations',
  versionKey: false,
})
export class OrganizationInvitation extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({
    trim: true,
    lowercase: true,
  })
  inviteeEmail?: string;

  @Prop({
    trim: true,
  })
  inviteeUsername?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  inviteeUserId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [String],
    required: true,
    default: ['member'],
  })
  roles: string[];

  @Prop({
    type: String,
    enum: Object.values(InvitationScope),
    default: InvitationScope.ORGANIZATION,
    required: true,
  })
  scope: InvitationScope;

  @Prop({
    required: true,
    select: false, // Don't include in queries by default for security
  })
  tokenHash: string;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
    index: true,
  })
  status: InvitationStatus;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  expiresAt: Date;

  @Prop({
    type: Date,
  })
  acceptedAt?: Date;

  @Prop({
    type: Date,
  })
  revokedAt?: Date;

  @Prop({
    type: String,
    maxlength: 500,
  })
  message?: string;

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

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  invitedBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  acceptedBy?: MongooseSchema.Types.ObjectId;
}

export const OrganizationInvitationSchema = SchemaFactory.createForClass(
  OrganizationInvitation,
);

// Compound indexes
OrganizationInvitationSchema.index({ organizationId: 1, status: 1 });
OrganizationInvitationSchema.index({ inviteeEmail: 1, status: 1 });
OrganizationInvitationSchema.index({ inviteeUsername: 1, status: 1 });
OrganizationInvitationSchema.index({ inviteeUserId: 1, status: 1 });
OrganizationInvitationSchema.index({ tokenHash: 1 });
OrganizationInvitationSchema.index({ expiresAt: 1, status: 1 });

// Prevent duplicate pending invitations for same email/username to same org
OrganizationInvitationSchema.index(
  { organizationId: 1, inviteeEmail: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: InvitationStatus.PENDING,
      inviteeEmail: { $exists: true, $ne: null },
    },
  },
);

OrganizationInvitationSchema.index(
  { organizationId: 1, inviteeUsername: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: InvitationStatus.PENDING,
      inviteeUsername: { $exists: true, $ne: null },
    },
  },
);

// TTL index to auto-delete expired invitations after 30 days
OrganizationInvitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 2592000 },
); // 30 days

// TTL index for soft-deleted invitations
OrganizationInvitationSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 7776000 },
); // 90 days

// Middleware to exclude soft-deleted documents by default
OrganizationInvitationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
OrganizationInvitationSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

OrganizationInvitationSchema.virtual('isExpired').get(function () {
  return (
    this.status === InvitationStatus.PENDING && this.expiresAt < new Date()
  );
});

OrganizationInvitationSchema.virtual('isPending').get(function () {
  return (
    this.status === InvitationStatus.PENDING && this.expiresAt >= new Date()
  );
});

OrganizationInvitationSchema.virtual('isAccepted').get(function () {
  return this.status === InvitationStatus.ACCEPTED;
});

// Ensure virtuals are included in JSON output
OrganizationInvitationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.tokenHash; // Never expose token hash
    return ret;
  },
});

OrganizationInvitationSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.tokenHash; // Never expose token hash
    return ret;
  },
});
