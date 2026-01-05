import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from '../schemas/password-reset-token.schema';

@Injectable()
export class PasswordResetTokenRepository {
  private readonly logger = new Logger(PasswordResetTokenRepository.name);

  constructor(
    @InjectModel(PasswordResetToken.name)
    private tokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  async create(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    try {
      // Delete any existing unused tokens for this email
      await this.tokenModel
        .deleteMany({ email: email.toLowerCase(), usedAt: null })
        .exec();

      const resetToken = new this.tokenModel({
        email: email.toLowerCase(),
        tokenHash,
        expiresAt,
      });
      return await resetToken.save();
    } catch (error) {
      this.logger.error(
        `Error creating password reset token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findValidToken(
    email: string,
    tokenHash: string,
  ): Promise<PasswordResetToken | null> {
    try {
      return await this.tokenModel
        .findOne({
          email: email.toLowerCase(),
          tokenHash,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding valid reset token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findToken(
    email: string,
    tokenHash: string,
  ): Promise<PasswordResetToken | null> {
    try {
      // If email is empty, search by tokenHash only
      const query: any = {
        tokenHash,
        usedAt: null,
      };

      if (email) {
        query.email = email.toLowerCase();
      }

      return await this.tokenModel.findOne(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding reset token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAsUsed(id: string): Promise<PasswordResetToken | null> {
    try {
      return await this.tokenModel
        .findByIdAndUpdate(id, { usedAt: new Date() }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error marking reset token as used: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async countRecentTokens(email: string, sinceDate: Date): Promise<number> {
    try {
      return await this.tokenModel
        .countDocuments({
          email: email.toLowerCase(),
          createdAt: { $gte: sinceDate },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error counting recent reset tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
