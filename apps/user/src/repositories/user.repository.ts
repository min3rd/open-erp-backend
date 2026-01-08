import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@shared/schemas';

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
  verifiedAt?: Date;
  avatarUrl?: string;
  password?: string;
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
      this.logger.error(
        `Error finding all users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.userModel.findById(id).exec();
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEmail(
    email: string,
    includePassword: boolean = false,
  ): Promise<User | null> {
    try {
      if (includePassword) {
        const user = await this.userModel
          .findOne(
            { email },
            {
              _id: 1,
              username: 1,
              email: 1,
              fullName: 1,
              password: 1,
              status: 1,
              avatarUrl: 1,
            },
          )
          .exec();
        return user;
      }
      const user = await this.userModel.findOne({ email }).exec();
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.userModel.findOne({ username }).exec();
    } catch (error) {
      this.logger.error(
        `Error finding user by username: ${error.message}`,
        error.stack,
      );
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
      this.logger.error(
        `Error soft deleting user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.userModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.logger.error(
        `Error hard deleting user: ${error.message}`,
        error.stack,
      );
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
      this.logger.error(
        `Error updating last login: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findWithPagination(options: {
    query?: any;
    page?: number;
    limit?: number;
    sort?: any;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        query = {},
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
      } = options;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.userModel.find(query).skip(skip).limit(limit).sort(sort).exec(),
        this.userModel.countDocuments(query).exec(),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Error finding users with pagination: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async searchUsers(options: {
    searchQuery?: string;
    email?: string;
    username?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { searchQuery, email, username, page = 1, limit = 10 } = options;

      const query: any = {};

      if (searchQuery) {
        query.$or = [
          { username: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { firstName: { $regex: searchQuery, $options: 'i' } },
          { lastName: { $regex: searchQuery, $options: 'i' } },
          { fullName: { $regex: searchQuery, $options: 'i' } },
        ];
      }

      if (email) {
        query.email = email;
      }

      if (username) {
        query.username = username;
      }

      return await this.findWithPagination({ query, page, limit });
    } catch (error) {
      this.logger.error(`Error searching users: ${error.message}`, error.stack);
      throw error;
    }
  }
}
