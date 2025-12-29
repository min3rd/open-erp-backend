import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

export interface CreateUserDto {
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  password?: string;
  status?: string;
  verifiedAt?: Date;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  lastLoginAt?: Date;
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

  async findAll(): Promise<User[]> {
    try {
      return await this.userModel.find().exec();
    } catch (error) {
      this.logger.error(`Error finding all users: ${error.message}`, error.stack);
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

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.userModel.findOne({ username }).exec();
    } catch (error) {
      this.logger.error(`Error finding user by username: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<User | null> {
    try {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        return null;
      }
      // Manually set deletion fields to avoid type issues
      user.deletedAt = new Date();
      user.status = 'inactive';
      await user.save();
      return user;
    } catch (error) {
      this.logger.error(`Error soft deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.userModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.logger.error(`Error hard deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async restore(id: string): Promise<User | null> {
    try {
      const user = await this.userModel
        .findById(id)
        .setOptions({ includeDeleted: true } as any)
        .exec();
      if (!user) {
        return null;
      }
      // Manually restore to avoid type issues
      user.deletedAt = null as any;
      user.status = 'active';
      await user.save();
      return user;
    } catch (error) {
      this.logger.error(`Error restoring user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async search(query: string): Promise<User[]> {
    try {
      return await this.userModel
        .find({
          $text: { $search: query },
        })
        .exec();
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.userModel.countDocuments().exec();
    } catch (error) {
      this.logger.error(`Error counting users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<User | null> {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating last login: ${error.message}`, error.stack);
      throw error;
    }
  }
}
