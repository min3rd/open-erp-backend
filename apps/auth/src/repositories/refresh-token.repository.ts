import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(
    userId: Types.ObjectId,
    token: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<RefreshTokenDocument> {
    const refreshToken = new this.refreshTokenModel({
      userId,
      token,
      expiresAt,
      deviceInfo,
      ipAddress,
    });
    return refreshToken.save();
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

  async revokeToken(token: string): Promise<RefreshTokenDocument | null> {
    return this.refreshTokenModel.findOneAndUpdate(
      { token },
      {
        revoked: true,
        revokedAt: new Date(),
      },
      { new: true },
    );
  }

  async revokeAllUserTokens(userId: Types.ObjectId): Promise<number> {
    const result = await this.refreshTokenModel.updateMany(
      { userId, revoked: false },
      {
        revoked: true,
        revokedAt: new Date(),
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
