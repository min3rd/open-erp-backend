import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(
    userId: Types.ObjectId,
    tokenHash: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<RefreshTokenDocument> {
    const refreshToken = new this.refreshTokenModel({
      userId,
      tokenHash,
      expiresAt,
      deviceInfo,
      ipAddress,
      revoked: false,
      isRotated: false,
    });
    return refreshToken.save();
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({
      tokenHash,
    });
  }

  async findValidByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({
      tokenHash,
      revoked: false,
      isRotated: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findByToken(token: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOne({
      token,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findByUserId(userId: Types.ObjectId): Promise<RefreshTokenDocument[]> {
    return this.refreshTokenModel.find({
      userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async revokeToken(tokenHash: string, reason: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOneAndUpdate(
      { tokenHash },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true },
    );
  }

  async markAsRotated(
    tokenHash: string,
    replacedByTokenId: Types.ObjectId,
  ): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOneAndUpdate(
      { tokenHash },
      {
        isRotated: true,
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'rotated',
        replacedByTokenId,
      },
      { new: true },
    );
  }

  async revokeAllUserTokens(userId: Types.ObjectId, reason: string): Promise<number> {
    const result = await this.refreshTokenModel.updateMany(
      { userId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
    return result.modifiedCount;
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}
