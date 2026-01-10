import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryTransaction, InventoryTransactionDocument } from '@shared/schemas';
import { InventoryTransactionType, TransactionStatus } from '@shared/constants';

@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly transactionModel: Model<InventoryTransactionDocument>,
  ) {}

  async create(
    transactionData: Partial<InventoryTransaction>,
  ): Promise<InventoryTransactionDocument> {
    const transaction = new this.transactionModel(transactionData);
    return transaction.save();
  }

  async findById(id: string): Promise<InventoryTransactionDocument | null> {
    return this.transactionModel.findById(id).exec();
  }

  async findByTransactionNumber(
    transactionNumber: string,
  ): Promise<InventoryTransactionDocument | null> {
    return this.transactionModel.findOne({ transactionNumber }).exec();
  }

  async findByProduct(
    productId: string,
    options: {
      skip?: number;
      limit?: number;
      status?: TransactionStatus;
      type?: InventoryTransactionType;
    } = {},
  ): Promise<{ items: InventoryTransactionDocument[]; total: number }> {
    const { skip = 0, limit = 10, status, type } = options;

    const query: any = { productId: new Types.ObjectId(productId) };
    if (status) query.status = status;
    if (type) query.type = type;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByWarehouse(
    warehouseId: string,
    isSource: boolean,
    options: {
      skip?: number;
      limit?: number;
      status?: TransactionStatus;
      type?: InventoryTransactionType;
    } = {},
  ): Promise<{ items: InventoryTransactionDocument[]; total: number }> {
    const { skip = 0, limit = 10, status, type } = options;

    const query: any = {};
    if (isSource) {
      query.sourceWarehouseId = new Types.ObjectId(warehouseId);
    } else {
      query.destinationWarehouseId = new Types.ObjectId(warehouseId);
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByOrganization(
    organizationId: string,
    options: {
      skip?: number;
      limit?: number;
      status?: TransactionStatus;
      type?: InventoryTransactionType;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{ items: InventoryTransactionDocument[]; total: number }> {
    const { skip = 0, limit = 10, status, type, startDate, endDate } = options;

    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = startDate;
      if (endDate) query.transactionDate.$lte = endDate;
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    updateData: Partial<InventoryTransaction>,
  ): Promise<InventoryTransactionDocument | null> {
    return this.transactionModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    userId?: string,
  ): Promise<InventoryTransactionDocument | null> {
    const updateData: any = { status };

    if (status === TransactionStatus.COMPLETED) {
      updateData.completedDate = new Date();
      if (userId) {
        updateData.approvedBy = new Types.ObjectId(userId);
        updateData.approvedAt = new Date();
      }
    } else if (status === TransactionStatus.CANCELLED) {
      updateData.cancelledDate = new Date();
      if (userId) {
        updateData.cancelledBy = new Types.ObjectId(userId);
      }
    }

    return this.transactionModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.transactionModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async generateTransactionNumber(prefix: string = 'TXN'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Find the last transaction of the day
    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);

    const lastTransaction = await this.transactionModel
      .findOne({
        transactionDate: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })
      .sort({ transactionNumber: -1 })
      .exec();

    let sequence = 1;
    if (lastTransaction && lastTransaction.transactionNumber) {
      const lastSequence = parseInt(lastTransaction.transactionNumber.slice(-4));
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${year}${month}${day}${String(sequence).padStart(4, '0')}`;
  }

  async getStockMovementHistory(
    productId: string,
    warehouseId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: InventoryTransactionDocument[]; total: number }> {
    const { skip = 0, limit = 10, startDate, endDate } = options;

    const query: any = {
      productId: new Types.ObjectId(productId),
      status: TransactionStatus.COMPLETED,
      $or: [
        { sourceWarehouseId: new Types.ObjectId(warehouseId) },
        { destinationWarehouseId: new Types.ObjectId(warehouseId) },
      ],
    };

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = startDate;
      if (endDate) query.transactionDate.$lte = endDate;
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }
}
