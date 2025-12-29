import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

// Define interface for instance methods
export interface UserMethods {
  softDelete(): Promise<this>;
  restore(): Promise<this>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;

@Schema({
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'users',
  versionKey: false,
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    index: true,
  })
  username: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true,
  })
  email: string;

  @Prop({
    trim: true,
    maxlength: 100,
  })
  firstName?: string;

  @Prop({
    trim: true,
    maxlength: 100,
  })
  lastName?: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt?: Date;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  metadata?: Map<string, string>;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add compound indexes
UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ username: 1, status: 1 });

// Add text index for search
UserSchema.index({ username: 'text', email: 'text', firstName: 'text', lastName: 'text' });

// Add TTL index for soft-deleted users (optional: auto-delete after 90 days)
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtuals
UserSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

UserSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

// Ensure virtuals are included in JSON output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

UserSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// Middleware to exclude soft-deleted documents by default
UserSchema.pre(/^find/, function (this: any, next: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Add soft delete method
UserSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.status = 'inactive';
  return this.save();
};

// Add restore method
UserSchema.methods.restore = function () {
  this.deletedAt = null;
  this.status = 'active';
  return this.save();
};
