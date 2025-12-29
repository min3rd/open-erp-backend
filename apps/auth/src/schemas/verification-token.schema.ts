import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type VerificationTokenDocument = HydratedDocument<VerificationToken>;

@Schema({
  timestamps: true,
  collection: 'verification_tokens',
  versionKey: false,
})
export class VerificationToken extends Document {
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
  token: string;

  @Prop({
    required: true,
    type: Date,
    index: true,
  })
  expiresAt: Date;

  @Prop({
    type: Date,
    default: null,
  })
  usedAt?: Date;

  @Prop({
    type: Number,
    default: 0,
  })
  attempts: number;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);

// Indexes
VerificationTokenSchema.index({ email: 1, token: 1 }, { unique: true });
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
