import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema({
  timestamps: true,
  collection: 'departments',
  versionKey: false,
})
export class Department extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  })
  tenantId: MongooseSchema.Types.ObjectId;

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
    lowercase: true,
    match: /^[a-z0-9-]+$/,
  })
  code: string;

  @Prop({
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true,
  })
  parentId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  managerId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  })
  status: string;

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

export const DepartmentSchema = SchemaFactory.createForClass(Department);

// Compound indexes for tenant isolation and uniqueness
DepartmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ tenantId: 1, name: 1 });
DepartmentSchema.index({ tenantId: 1, status: 1 });
DepartmentSchema.index({ tenantId: 1, parentId: 1 });

// Text index for search within tenant
DepartmentSchema.index({
  name: 'text',
  description: 'text',
  code: 'text',
});

// TTL index for soft-deleted departments (auto-delete after 90 days)
DepartmentSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7776000 });

// Middleware to exclude soft-deleted documents by default
DepartmentSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
DepartmentSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

DepartmentSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// Ensure virtuals are included in JSON output
DepartmentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

DepartmentSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
