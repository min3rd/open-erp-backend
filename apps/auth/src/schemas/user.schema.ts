import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'auth_users',
  versionKey: false,
})
export class User extends Document {
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
    required: true,
    trim: true,
    minlength: 2,
  })
  fullName: string;

  @Prop({
    required: true,
    select: false, // Don't include password in queries by default
  })
  password: string;

  @Prop({
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({
    type: Date,
    default: null,
  })
  verifiedAt?: Date;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1, status: 1 });

// Middleware to exclude soft-deleted documents by default
UserSchema.pre(/^find/, function (this: any, next: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});
