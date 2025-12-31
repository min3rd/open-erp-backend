import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

@Schema({
  timestamps: true,
  collection: 'password_reset_tokens',
  versionKey: false,
})
export class PasswordResetToken extends Document {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
    index: true,
  })
  tokenHash: string;

  @Prop({
    required: true,
    type: Date,
  })
  expiresAt: Date;

  @Prop({
    type: Date,
    default: null,
  })
  usedAt?: Date;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

// Indexes
PasswordResetTokenSchema.index({ email: 1, tokenHash: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
PasswordResetTokenSchema.index({ email: 1, createdAt: 1 }); // For rate limiting
