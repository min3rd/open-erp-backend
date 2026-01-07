import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrganizationMemberDocument = HydratedDocument<OrganizationMember>;

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  FINANCE = 'finance',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  REVOKED = 'revoked',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Schema({
  timestamps: true,
  collection: 'organization_members',
  versionKey: false,
})
export class OrganizationMember extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [String],
    enum: Object.values(MemberRole),
    default: [MemberRole.MEMBER],
    required: true,
  })
  roles: MemberRole[];

  @Prop({
    type: String,
    enum: Object.values(MemberStatus),
    default: MemberStatus.ACTIVE,
    index: true,
  })
  status: MemberStatus;

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
    type: Date,
  })
  leftAt?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  isPrimaryOwner: boolean;

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
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  updatedBy?: MongooseSchema.Types.ObjectId;
}

export const OrganizationMemberSchema =
  SchemaFactory.createForClass(OrganizationMember);

// Compound indexes
// Ensure one user can only have one membership per organization
OrganizationMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);

OrganizationMemberSchema.index({ organizationId: 1, status: 1 });
OrganizationMemberSchema.index({ userId: 1, status: 1 });
OrganizationMemberSchema.index({ organizationId: 1, roles: 1 });

// Index to ensure only one primary owner per organization
OrganizationMemberSchema.index(
  { organizationId: 1, isPrimaryOwner: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isPrimaryOwner: true,
      deletedAt: null,
    },
  },
);

// TTL index for soft-deleted memberships
OrganizationMemberSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 63072000 },
); // 2 years

// Middleware to exclude soft-deleted documents by default
OrganizationMemberSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
OrganizationMemberSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

OrganizationMemberSchema.virtual('isActive').get(function () {
  return this.status === MemberStatus.ACTIVE;
});

OrganizationMemberSchema.virtual('hasLeft').get(function () {
  return this.leftAt !== null && this.leftAt !== undefined;
});

// Ensure virtuals are included in JSON output
OrganizationMemberSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

OrganizationMemberSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
