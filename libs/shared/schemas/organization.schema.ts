import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

export enum OrganizationType {
  HOLDING = 'holding',
  COMPANY = 'company',
  JOINT_VENTURE = 'joint-venture',
  PARTNER = 'partner',
  BRANCH = 'branch',
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Schema({
  timestamps: true,
  collection: 'organizations',
  versionKey: false,
})
export class Organization extends Document {
  @Prop({
    required: true,
    type: String,
    enum: Object.values(OrganizationType),
    index: true,
  })
  type: OrganizationType;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
    index: true,
  })
  name: string;

  @Prop({
    trim: true,
    maxlength: 200,
  })
  internationalName?: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  taxId: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 500,
  })
  headquartersAddress: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
  })
  legalRepresentative: string;

  @Prop({
    required: true,
    trim: true,
    match: /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  })
  contactPhone: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  contactEmail: string;

  @Prop({
    required: true,
    type: Date,
  })
  foundedDate: Date;

  @Prop({
    type: String,
    enum: Object.values(OrganizationStatus),
    default: OrganizationStatus.ACTIVE,
    index: true,
  })
  status: OrganizationStatus;

  @Prop({
    type: String,
    default: 'VN',
    uppercase: true,
    minlength: 2,
    maxlength: 2,
  })
  country: string;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
  })
  website?: string;

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

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Compound indexes
OrganizationSchema.index({ taxId: 1, country: 1 }, { unique: true });
OrganizationSchema.index({ name: 1, status: 1 });
OrganizationSchema.index({ type: 1, status: 1 });
OrganizationSchema.index({ createdBy: 1 });

// Text index for search
OrganizationSchema.index({
  name: 'text',
  internationalName: 'text',
  description: 'text',
});

// TTL index for soft-deleted organizations (auto-delete after 730 days / 2 years)
OrganizationSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 63072000 });

// Middleware to exclude soft-deleted documents by default
OrganizationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
OrganizationSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

OrganizationSchema.virtual('isActive').get(function () {
  return this.status === OrganizationStatus.ACTIVE;
});

// Ensure virtuals are included in JSON output
OrganizationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

OrganizationSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
