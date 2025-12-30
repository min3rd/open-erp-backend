import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({
  timestamps: true,
  collection: 'tenants',
  versionKey: false,
})
export class Tenant extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    index: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
    index: true,
  })
  slug: string;

  @Prop({
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  settings?: Map<string, string>;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  trialExpiresAt?: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Add indexes
TenantSchema.index({ name: 1, status: 1 });
TenantSchema.index({ slug: 1, status: 1 });

// Text index for search
TenantSchema.index({
  name: 'text',
  description: 'text',
});

// TTL index for soft-deleted tenants (auto-delete after 365 days)
TenantSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 31536000 });

// Middleware to exclude soft-deleted documents by default
TenantSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
TenantSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

TenantSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

TenantSchema.virtual('isTrialExpired').get(function () {
  return this.trialExpiresAt && this.trialExpiresAt < new Date();
});

// Ensure virtuals are included in JSON output
TenantSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

TenantSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
