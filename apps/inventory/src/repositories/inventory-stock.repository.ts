import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryStock, InventoryStockDocument } from '@shared/schemas';

@Injectable()
export class InventoryStockRepository {
  constructor(
    @InjectModel(InventoryStock.name)
    private readonly stockModel: Model<InventoryStockDocument>,
  ) {}

  async create(
    stockData: Partial<InventoryStock>,
  ): Promise<InventoryStockDocument> {
    const stock = new this.stockModel(stockData);
    return stock.save();
  }

  async findById(id: string): Promise<InventoryStockDocument | null> {
    return this.stockModel.findById(id).exec();
  }

  async findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
  ): Promise<InventoryStockDocument | null> {
    const query: any = {
      productId: new Types.ObjectId(productId),
      warehouseId: new Types.ObjectId(warehouseId),
    };

    return this.stockModel.findOne(query).exec();
  }

  async findByProduct(
    productId: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<{ items: InventoryStockDocument[]; total: number }> {
    const { skip = 0, limit = 10 } = options;

    const query: any = { productId: new Types.ObjectId(productId) };

    const [items, total] = await Promise.all([
      this.stockModel.find(query).skip(skip).limit(limit).exec(),
      this.stockModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByWarehouse(
    warehouseId: string,
    options: { skip?: number; limit?: number; filter?: any } = {},
  ): Promise<{ items: InventoryStockDocument[]; total: number }> {
    const { skip = 0, limit = 10, filter = {} } = options;

    const query = {
      warehouseId: new Types.ObjectId(warehouseId),
      ...filter,
    };

    const [items, total] = await Promise.all([
      this.stockModel.find(query).skip(skip).limit(limit).exec(),
      this.stockModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByOrganization(
    organizationId: string,
    options: { skip?: number; limit?: number; filter?: any } = {},
  ): Promise<{ items: InventoryStockDocument[]; total: number }> {
    const { skip = 0, limit = 10, filter = {} } = options;

    const query = {
      organizationId: new Types.ObjectId(organizationId),
      ...filter,
    };

    const [items, total] = await Promise.all([
      this.stockModel.find(query).skip(skip).limit(limit).exec(),
      this.stockModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    updateData: Partial<InventoryStock>,
  ): Promise<InventoryStockDocument | null> {
    return this.stockModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async updateQuantities(
    id: string,
    quantities: {
      availableQuantity?: number;
      reservedQuantity?: number;
      damagedQuantity?: number;
      inTransitQuantity?: number;
    },
  ): Promise<InventoryStockDocument | null> {
    const updateFields: any = {};

    if (quantities.availableQuantity !== undefined) {
      updateFields.availableQuantity = quantities.availableQuantity;
    }
    if (quantities.reservedQuantity !== undefined) {
      updateFields.reservedQuantity = quantities.reservedQuantity;
    }
    if (quantities.damagedQuantity !== undefined) {
      updateFields.damagedQuantity = quantities.damagedQuantity;
    }
    if (quantities.inTransitQuantity !== undefined) {
      updateFields.inTransitQuantity = quantities.inTransitQuantity;
    }

    updateFields.lastMovementDate = new Date();

    return this.stockModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.stockModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async findLowStock(
    organizationId?: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<{ items: InventoryStockDocument[]; total: number }> {
    const { skip = 0, limit = 10 } = options;

    const query: any = {
      $expr: {
        $lt: [
          '$availableQuantity',
          { $ifNull: ['$productSnapshot.minStockLevel', 0] },
        ],
      },
    };

    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const [items, total] = await Promise.all([
      this.stockModel
        .find(query)
        .sort({ availableQuantity: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findExpiringStock(
    daysUntilExpiry: number,
    options: { skip?: number; limit?: number } = {},
  ): Promise<{ items: InventoryStockDocument[]; total: number }> {
    const { skip = 0, limit = 10 } = options;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const query = {
      'lots.expiryDate': {
        $lte: expiryDate,
        $gte: new Date(),
      },
    };

    const [items, total] = await Promise.all([
      this.stockModel
        .find(query)
        .sort({ 'lots.expiryDate': 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }
}
