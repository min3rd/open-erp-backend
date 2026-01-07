import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

/**
 * Role scope determines where the role can be applied
 * - global: Can be applied across all organizations (e.g., system admin)
 * - organization: Only applicable within a specific organization
 */
export type RoleScope = 'global' | 'organization';

@Schema({
  timestamps: true,
  collection: 'roles',
  versionKey: false,
})
export class Role extends Document {
  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  name: string;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z0-9_]+$/,
  })
  code: string;

  @Prop({
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    enum: ['global', 'organization'],
    required: true,
    index: true,
  })
  scope: RoleScope;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true,
  })
  organizationId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [String],
    default: [],
    validate: {
      validator: function (permissions: string[]) {
        // Validate that all permissions are valid strings
        return permissions.every(
          (p) => typeof p === 'string' && p.length > 0 && p.includes('.'),
        );
      },
      message: 'Permissions must be valid strings in format: resource.action',
    },
  })
  permissions: string[];

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isSystem: boolean; // System roles cannot be deleted or modified

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  metadata?: Map<string, string>;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Compound indexes
// Global roles must have unique codes
// Organization roles must have unique codes within their organization
RoleSchema.index(
  { code: 1, scope: 1, organizationId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

RoleSchema.index({ scope: 1, status: 1 });
RoleSchema.index({ organizationId: 1, status: 1 });
RoleSchema.index({ organizationId: 1, scope: 1 });

// Text index for search
RoleSchema.index({
  name: 'text',
  description: 'text',
  code: 'text',
});

// TTL index for soft-deleted roles (auto-delete after 90 days)
RoleSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7776000 });

// Validation: global roles cannot have organizationId
RoleSchema.pre('save', function (next: any) {
  if (this.scope === 'global' && this.organizationId) {
    return next(new Error('Global roles cannot have an organizationId'));
  } else if (this.scope === 'organization' && !this.organizationId) {
    return next(new Error('Organization roles must have an organizationId'));
  }
  return next();
});

// Middleware to exclude soft-deleted documents by default
RoleSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
RoleSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

RoleSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

RoleSchema.virtual('isGlobal').get(function () {
  return this.scope === 'global';
});

RoleSchema.virtual('isOrganization').get(function () {
  return this.scope === 'organization';
});

// Ensure virtuals are included in JSON output
RoleSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

RoleSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
