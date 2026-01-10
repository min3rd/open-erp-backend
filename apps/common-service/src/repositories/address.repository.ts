import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from '@shared/schemas';

@Injectable()
export class AddressRepository {
  constructor(
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  async findAll(
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    },
  ): Promise<{ items: Address[]; total: number }> {
    const query = this.addressModel.find(filter);

    if (options?.sort) {
      query.sort(options.sort);
    }

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      this.addressModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<Address | null> {
    return this.addressModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  async create(data: Partial<Address>): Promise<Address> {
    const address = new this.addressModel(data);
    return address.save();
  }

  async update(id: string, data: Partial<Address>): Promise<Address | null> {
    return this.addressModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<Address | null> {
    return this.addressModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async search(
    searchTerm: string,
    filter: Record<string, any> = {},
    options?: {
      skip?: number;
      limit?: number;
    },
  ): Promise<{ items: Address[]; total: number }> {
    const searchFilter: Record<string, any> = {
      ...filter,
      $text: { $search: searchTerm },
    };

    const query = this.addressModel.find(searchFilter);

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      this.addressModel.countDocuments(searchFilter),
    ]);

    return { items, total };
  }
}
