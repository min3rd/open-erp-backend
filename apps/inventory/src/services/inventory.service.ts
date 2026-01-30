import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { InventoryTransactionRepository } from '../repositories/inventory-transaction.repository';
import { ProductRepository } from '../repositories/product.repository';
import {
  CreateTransactionDto,
  StockAdjustmentDto,
  TransferStockDto,
} from '../dto/inventory.dto';
import { InventoryTransactionType, TransactionStatus } from '@shared/constants';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly stockRepository: InventoryStockRepository,
    private readonly transactionRepository: InventoryTransactionRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async getStockByProductAndWarehouse(productId: string, warehouseId: string) {
    const stock = await this.stockRepository.findByProductAndWarehouse(
      productId,
      warehouseId,
    );
    if (!stock) {
      throw new NotFoundException(
        'Stock not found for this product and warehouse',
      );
    }
    return stock;
  }

  async getStocksByProduct(
    productId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const result = await this.stockRepository.findByProduct(productId, {
      skip,
      limit,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getStocksByWarehouse(
    warehouseId: string,
    filter: any = {},
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const result = await this.stockRepository.findByWarehouse(warehouseId, {
      skip,
      limit,
      filter,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getLowStockAlert(
    organizationId?: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const result = await this.stockRepository.findLowStock(organizationId, {
      skip,
      limit,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async getExpiringStockAlert(
    daysUntilExpiry: number = 30,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const result = await this.stockRepository.findExpiringStock(
      daysUntilExpiry,
      {
        skip,
        limit,
      },
    );

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async createTransaction(createDto: CreateTransactionDto) {
    this.logger.log(
      `Creating transaction type: ${createDto.type} for product: ${createDto.productId}`,
    );
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Validate product exists
      const product = await this.productRepository.findById(
        createDto.productId,
      );
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Generate transaction number
      const transactionNumber =
        await this.transactionRepository.generateTransactionNumber();

      // Create product snapshot
      const productSnapshot: any = {
        id: product._id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        hazardLevel: product.hazardLevel,
        storageRequirements: product.storageConditions,
      };

      // Build transaction data
      const transactionData: any = {
        transactionNumber,
        type: createDto.type,
        status: TransactionStatus.PENDING,
        productId: new Types.ObjectId(createDto.productId),
        productSnapshot,
        organizationId: createDto.organizationId
          ? new Types.ObjectId(createDto.organizationId)
          : undefined,
        quantity: createDto.quantity,
        unitCost: createDto.unitCost,
        totalCost: createDto.unitCost
          ? createDto.unitCost * createDto.quantity
          : undefined,
        currency: createDto.currency,
        lotInfo: createDto.lotInfo,
        sourceLocation: createDto.sourceLocation,
        destinationLocation: createDto.destinationLocation,
        referenceType: createDto.referenceType,
        referenceId: createDto.referenceId
          ? new Types.ObjectId(createDto.referenceId)
          : undefined,
        referenceNumber: createDto.referenceNumber,
        notes: createDto.notes,
        reason: createDto.reason,
        transactionDate: new Date(),
        createdBy: new Types.ObjectId(createDto.createdBy),
      };

      // Add warehouse IDs and snapshots based on transaction type
      if (createDto.sourceWarehouseId) {
        transactionData.sourceWarehouseId = new Types.ObjectId(
          createDto.sourceWarehouseId,
        );
        // TODO: Add warehouse snapshot
      }

      if (createDto.destinationWarehouseId) {
        transactionData.destinationWarehouseId = new Types.ObjectId(
          createDto.destinationWarehouseId,
        );
        // TODO: Add warehouse snapshot
      }

      // Create transaction
      const transaction =
        await this.transactionRepository.create(transactionData);

      // Process transaction immediately (auto-complete)
      await this.processTransaction(
        transaction._id.toString(),
        createDto.createdBy,
        session,
      );

      await session.commitTransaction();

      this.logger.log(
        `Transaction completed: ${transaction.transactionNumber}`,
      );
      return await this.transactionRepository.findById(
        transaction._id.toString(),
      );
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async processTransaction(
    transactionId: string,
    userId: string,
    session?: any,
  ) {
    const transaction =
      await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction is not in pending status');
    }

    // Process based on transaction type
    switch (transaction.type) {
      case InventoryTransactionType.IN:
        await this.processInTransaction(transaction, session);
        break;
      case InventoryTransactionType.OUT:
        await this.processOutTransaction(transaction, session);
        break;
      case InventoryTransactionType.TRANSFER:
        await this.processTransferTransaction(transaction, session);
        break;
      case InventoryTransactionType.ADJUSTMENT:
        await this.processAdjustmentTransaction(transaction, session);
        break;
      default:
        throw new BadRequestException(
          `Unsupported transaction type: ${transaction.type}`,
        );
    }

    // Update transaction status
    await this.transactionRepository.updateStatus(
      transactionId,
      TransactionStatus.COMPLETED,
      userId,
    );
  }

  async adjustStock(adjustmentDto: StockAdjustmentDto) {
    this.logger.log(
      `Adjusting stock for product: ${adjustmentDto.productId} in warehouse: ${adjustmentDto.warehouseId}`,
    );
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Get or create stock record
      let stock = await this.stockRepository.findByProductAndWarehouse(
        adjustmentDto.productId,
        adjustmentDto.warehouseId,
      );

      const stockBefore = stock ? stock.availableQuantity : 0;

      if (!stock) {
        // Create new stock record
        const product = await this.productRepository.findById(
          adjustmentDto.productId,
        );
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const productSnapshot: any = {
          id: product._id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          hazardLevel: product.hazardLevel,
          storageRequirements: product.storageConditions,
        };

        stock = await this.stockRepository.create({
          productId: new Types.ObjectId(adjustmentDto.productId) as any,
          productSnapshot,
          warehouseId: new Types.ObjectId(adjustmentDto.warehouseId) as any,
          availableQuantity: adjustmentDto.newQuantity,
          reservedQuantity: 0,
          damagedQuantity: 0,
          inTransitQuantity: 0,
          createdBy: new Types.ObjectId(adjustmentDto.adjustedBy) as any,
        });
      } else {
        // Update existing stock
        await this.stockRepository.update(stock._id.toString(), {
          availableQuantity: adjustmentDto.newQuantity,
          lastMovementDate: new Date(),
        });
      }

      // Create adjustment transaction
      const transactionNumber =
        await this.transactionRepository.generateTransactionNumber('ADJ');
      await this.transactionRepository.create({
        transactionNumber,
        type: InventoryTransactionType.ADJUSTMENT,
        status: TransactionStatus.COMPLETED,
        productId: new Types.ObjectId(adjustmentDto.productId) as any,
        productSnapshot: stock.productSnapshot,
        destinationWarehouseId: new Types.ObjectId(
          adjustmentDto.warehouseId,
        ) as any,
        quantity: Math.abs(adjustmentDto.newQuantity - stockBefore),
        stockBefore,
        stockAfter: adjustmentDto.newQuantity,
        reason: adjustmentDto.reason,
        transactionDate: new Date(),
        completedDate: new Date(),
        createdBy: new Types.ObjectId(adjustmentDto.adjustedBy) as any,
        approvedBy: new Types.ObjectId(adjustmentDto.adjustedBy) as any,
        approvedAt: new Date(),
      } as any);

      await session.commitTransaction();

      this.logger.log(
        `Stock adjusted: ${adjustmentDto.productId}, new quantity: ${adjustmentDto.newQuantity}`,
      );
      return await this.stockRepository.findById(stock._id.toString());
    } catch (error) {
      this.logger.error(
        `Stock adjustment failed: ${error.message}`,
        error.stack,
      );
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async transferStock(transferDto: TransferStockDto) {
    this.logger.log(
      `Transferring stock from ${transferDto.sourceWarehouseId} to ${transferDto.destinationWarehouseId}`,
    );
    // Create transfer transaction
    const createDto: CreateTransactionDto = {
      type: InventoryTransactionType.TRANSFER,
      productId: transferDto.productId,
      sourceWarehouseId: transferDto.sourceWarehouseId,
      destinationWarehouseId: transferDto.destinationWarehouseId,
      quantity: transferDto.quantity,
      sourceLocation: transferDto.sourceLocation,
      destinationLocation: transferDto.destinationLocation,
      notes: transferDto.notes,
      createdBy: transferDto.initiatedBy,
    };

    return this.createTransaction(createDto);
  }

  // Private helper methods

  private async processInTransaction(transaction: any, session?: any) {
    if (!transaction.destinationWarehouseId) {
      throw new BadRequestException(
        'Destination warehouse is required for IN transactions',
      );
    }

    // Get or create stock record
    let stock = await this.stockRepository.findByProductAndWarehouse(
      transaction.productId.toString(),
      transaction.destinationWarehouseId.toString(),
    );

    const stockBefore = stock ? stock.availableQuantity : 0;

    if (!stock) {
      // Create new stock record
      stock = await this.stockRepository.create({
        productId: transaction.productId,
        productSnapshot: transaction.productSnapshot,
        warehouseId: transaction.destinationWarehouseId,
        organizationId: transaction.organizationId,
        availableQuantity: transaction.quantity,
        reservedQuantity: 0,
        damagedQuantity: 0,
        inTransitQuantity: 0,
        lots: transaction.lotInfo
          ? [
              {
                lotNumber: transaction.lotInfo.lotNumber || '',
                manufactureDate: transaction.lotInfo.manufactureDate,
                expiryDate: transaction.lotInfo.expiryDate,
                quantity: transaction.quantity,
                costPerUnit: transaction.unitCost,
              },
            ]
          : [],
        createdBy: transaction.createdBy,
      } as any);
    } else {
      // Update existing stock
      const newQuantity = stock.availableQuantity + transaction.quantity;
      await this.stockRepository.update(stock._id.toString(), {
        availableQuantity: newQuantity,
        lastMovementDate: new Date(),
        lastTransactionId: transaction._id,
      });

      // Add lot info if provided
      if (transaction.lotInfo && transaction.lotInfo.lotNumber) {
        stock.lots.push({
          lotNumber: transaction.lotInfo.lotNumber,
          manufactureDate: transaction.lotInfo.manufactureDate,
          expiryDate: transaction.lotInfo.expiryDate,
          quantity: transaction.quantity,
          costPerUnit: transaction.unitCost,
        });
        await stock.save();
      }
    }

    // Update transaction with stock levels
    await this.transactionRepository.update(transaction._id.toString(), {
      stockBefore,
      stockAfter: stockBefore + transaction.quantity,
    });
  }

  private async processOutTransaction(transaction: any, session?: any) {
    if (!transaction.sourceWarehouseId) {
      throw new BadRequestException(
        'Source warehouse is required for OUT transactions',
      );
    }

    // Get stock record
    const stock = await this.stockRepository.findByProductAndWarehouse(
      transaction.productId.toString(),
      transaction.sourceWarehouseId.toString(),
    );

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }

    if (stock.availableQuantity < transaction.quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    const stockBefore = stock.availableQuantity;
    const newQuantity = stock.availableQuantity - transaction.quantity;

    await this.stockRepository.update(stock._id.toString(), {
      availableQuantity: newQuantity,
      lastMovementDate: new Date(),
      lastTransactionId: transaction._id,
    });

    // Update transaction with stock levels
    await this.transactionRepository.update(transaction._id.toString(), {
      stockBefore,
      stockAfter: newQuantity,
    });
  }

  private async processTransferTransaction(transaction: any, session?: any) {
    if (!transaction.sourceWarehouseId || !transaction.destinationWarehouseId) {
      throw new BadRequestException(
        'Both source and destination warehouses are required for TRANSFER',
      );
    }

    // Process OUT from source
    const sourceStock = await this.stockRepository.findByProductAndWarehouse(
      transaction.productId.toString(),
      transaction.sourceWarehouseId.toString(),
    );

    if (!sourceStock) {
      throw new NotFoundException('Source stock not found');
    }

    if (sourceStock.availableQuantity < transaction.quantity) {
      throw new BadRequestException('Insufficient stock at source warehouse');
    }

    // Reduce from source
    await this.stockRepository.update(sourceStock._id.toString(), {
      availableQuantity: sourceStock.availableQuantity - transaction.quantity,
      lastMovementDate: new Date(),
      lastTransactionId: transaction._id,
    });

    // Process IN to destination
    let destStock = await this.stockRepository.findByProductAndWarehouse(
      transaction.productId.toString(),
      transaction.destinationWarehouseId.toString(),
    );

    if (!destStock) {
      // Create new stock record at destination
      destStock = await this.stockRepository.create({
        productId: transaction.productId,
        productSnapshot: transaction.productSnapshot,
        warehouseId: transaction.destinationWarehouseId,
        organizationId: transaction.organizationId,
        availableQuantity: transaction.quantity,
        reservedQuantity: 0,
        damagedQuantity: 0,
        inTransitQuantity: 0,
        createdBy: transaction.createdBy,
      } as any);
    } else {
      // Update existing stock at destination
      await this.stockRepository.update(destStock._id.toString(), {
        availableQuantity: destStock.availableQuantity + transaction.quantity,
        lastMovementDate: new Date(),
        lastTransactionId: transaction._id,
      });
    }
  }

  private async processAdjustmentTransaction(transaction: any, session?: any) {
    // Adjustment transactions are processed directly in adjustStock method
    // This is here for completeness
  }

  async getTransactionHistory(
    filter: {
      productId?: string;
      warehouseId?: string;
      organizationId?: string;
      type?: InventoryTransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    let result;

    if (filter.productId) {
      result = await this.transactionRepository.findByProduct(
        filter.productId,
        {
          skip,
          limit,
          status: filter.status,
          type: filter.type,
        },
      );
    } else if (filter.organizationId) {
      result = await this.transactionRepository.findByOrganization(
        filter.organizationId,
        {
          skip,
          limit,
          status: filter.status,
          type: filter.type,
          startDate: filter.startDate,
          endDate: filter.endDate,
        },
      );
    } else {
      // Default: return empty or implement a general query
      result = { items: [], total: 0 };
    }

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}
