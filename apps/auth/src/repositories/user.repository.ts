import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

export interface CreateUserDto {
  email: string;
  fullName: string;
  password: string;
  status?: string;
}

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    try {
      const query = this.userModel.findOne({ email: email.toLowerCase() });
      if (includePassword) {
        query.select('+password');
      }
      return await query.exec();
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateVerificationStatus(email: string): Promise<User | null> {
    try {
      return await this.userModel
        .findOneAndUpdate(
          { email: email.toLowerCase() },
          { 
            status: 'active',
            verifiedAt: new Date(),
          },
          { new: true }
        )
        .exec();
    } catch (error) {
      this.logger.error(`Error updating verification status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.userModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding user by id: ${error.message}`, error.stack);
      throw error;
    }
  }
}
