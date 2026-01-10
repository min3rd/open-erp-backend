import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  timestamps: true,
  collection: 'refresh_tokens',
  versionKey: false,
})
export class RefreshToken extends Document {
  @Prop({
    required: true,
    type: Types.ObjectId,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    index: true,
  })
  token?: string; // Legacy field - for backward compatibility during migration

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  tokenHash: string; // Hashed token for secure storage

  @Prop({
    required: true,
    type: Date,
    index: true,
  })
  expiresAt: Date;

  @Prop({
    type: String,
    default: null,
  })
  deviceInfo?: string;

  @Prop({
    type: String,
    default: null,
  })
  ipAddress?: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  revoked: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  revokedAt?: Date;

  @Prop({
    type: String,
    default: null,
  })
  revokedReason?: string; // Reason for revocation (e.g., 'rotated', 'manual', 'compromised')

  @Prop({
    type: Types.ObjectId,
    default: null,
  })
  replacedByTokenId?: Types.ObjectId; // Reference to new token if rotated

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isRotated: boolean; // Flag to track if token has been rotated
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Indexes
RefreshTokenSchema.index({ userId: 1, revoked: 1 });
RefreshTokenSchema.index({ userId: 1, isRotated: 1 });
RefreshTokenSchema.index({ tokenHash: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
