import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VerificationToken,
  VerificationTokenDocument,
} from '../schemas/verification-token.schema';

@Injectable()
export class VerificationTokenRepository {
  private readonly logger = new Logger(VerificationTokenRepository.name);

  constructor(
    @InjectModel(VerificationToken.name)
    private tokenModel: Model<VerificationTokenDocument>,
  ) {}

  async create(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<VerificationToken> {
    try {
      // Delete any existing unused tokens for this email
      await this.tokenModel
        .deleteMany({ email: email.toLowerCase(), usedAt: null })
        .exec();

      const verificationToken = new this.tokenModel({
        email: email.toLowerCase(),
        token,
        expiresAt,
        attempts: 0,
      });
      return await verificationToken.save();
    } catch (error) {
      this.logger.error(
        `Error creating verification token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findValidToken(
    email: string,
    token: string,
  ): Promise<VerificationToken | null> {
    try {
      return await this.tokenModel
        .findOne({
          email: email.toLowerCase(),
          token,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding valid token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAsUsed(id: string): Promise<VerificationToken | null> {
    try {
      return await this.tokenModel
        .findByIdAndUpdate(id, { usedAt: new Date() }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error marking token as used: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async incrementAttempts(id: string): Promise<VerificationToken | null> {
    try {
      return await this.tokenModel
        .findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error incrementing attempts: ${error.message}`,
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
        `Error counting recent tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
