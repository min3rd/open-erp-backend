import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { InventoryTransactionType, TransactionStatus } from '../constants/product.constants';

/**
 * Product snapshot for transaction (minimal fields needed)
 */
@Schema({ _id: false })
export class TransactionProductSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  sku: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  unit: string;

  @Prop({ type: String })
  hazardLevel?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  storageRequirements?: any;
}

/**
 * Warehouse snapshot for transaction
 */
@Schema({ _id: false })
export class TransactionWarehouseSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  code: string;

  @Prop({ required: true, type: String })
  name: string;
}

/**
 * Lot/Batch information for transaction
 */
@Schema({ _id: false })
export class TransactionLotInfo {
  @Prop({ type: String })
  lotNumber?: string;

  @Prop({ type: String })
  serialNumber?: string;

  @Prop({ type: Date })
  manufactureDate?: Date;

  @Prop({ type: Date })
  expiryDate?: Date;
}

export type InventoryTransactionDocument = HydratedDocument<InventoryTransaction>;

@Schema({
  timestamps: true,
  collection: 'inventory_transactions',
  versionKey: false,
})
export class InventoryTransaction extends Document {
  // ========== IDENTIFICATION ==========
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  transactionNumber: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(InventoryTransactionType),
    index: true,
  })
  type: InventoryTransactionType;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  // ========== REFERENCES ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: TransactionProductSnapshot,
    required: true,
  })
  productSnapshot: TransactionProductSnapshot;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  })
  organizationId?: MongooseSchema.Types.ObjectId;

  // ========== SOURCE & DESTINATION ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Warehouse',
    index: true,
  })
  sourceWarehouseId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: TransactionWarehouseSnapshot,
  })
  sourceWarehouseSnapshot?: TransactionWarehouseSnapshot;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Warehouse',
    index: true,
  })
  destinationWarehouseId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: TransactionWarehouseSnapshot,
  })
  destinationWarehouseSnapshot?: TransactionWarehouseSnapshot;

  // ========== QUANTITY & VALUE ==========
  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  quantity: number;

  @Prop({
    type: Number,
    min: 0,
  })
  unitCost?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  totalCost?: number;

  @Prop({
    type: String,
    default: 'VND',
  })
  currency?: string;

  // ========== LOT/BATCH ==========
  @Prop({
    type: TransactionLotInfo,
  })
  lotInfo?: TransactionLotInfo;

  // ========== LOCATION ==========
  @Prop({
    type: String,
    trim: true,
  })
  sourceLocation?: string;

  @Prop({
    type: String,
    trim: true,
  })
  destinationLocation?: string;

  // ========== DATES ==========
  @Prop({
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  })
  transactionDate: Date;

  @Prop({
    type: Date,
  })
  completedDate?: Date;

  @Prop({
    type: Date,
  })
  cancelledDate?: Date;

  // ========== REFERENCES & NOTES ==========
  @Prop({
    type: String,
    trim: true,
  })
  referenceType?: string; // 'purchase_order', 'sales_order', 'production_order', etc.

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  referenceId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    trim: true,
  })
  referenceNumber?: string;

  @Prop({
    type: String,
    maxlength: 1000,
  })
  notes?: string;

  @Prop({
    type: String,
    maxlength: 500,
  })
  reason?: string;

  // ========== STOCK BEFORE/AFTER ==========
  @Prop({
    type: Number,
    min: 0,
  })
  stockBefore?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  stockAfter?: number;

  // ========== AUDIT ==========
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  approvedBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Date,
  })
  approvedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  cancelledBy?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);

// ========== INDEXES ==========

// Compound indexes for queries
InventoryTransactionSchema.index({ productId: 1, transactionDate: -1 });
InventoryTransactionSchema.index({ sourceWarehouseId: 1, transactionDate: -1 });
InventoryTransactionSchema.index({ destinationWarehouseId: 1, transactionDate: -1 });
InventoryTransactionSchema.index({ organizationId: 1, transactionDate: -1 });
InventoryTransactionSchema.index({ type: 1, status: 1, transactionDate: -1 });
InventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });
InventoryTransactionSchema.index({ createdBy: 1, transactionDate: -1 });

// Index for lot tracking
InventoryTransactionSchema.index({ 'lotInfo.lotNumber': 1 });
InventoryTransactionSchema.index({ 'lotInfo.serialNumber': 1 });

// ========== VIRTUALS ==========

InventoryTransactionSchema.virtual('isCompleted').get(function () {
  return this.status === TransactionStatus.COMPLETED;
});

InventoryTransactionSchema.virtual('isPending').get(function () {
  return this.status === TransactionStatus.PENDING;
});

InventoryTransactionSchema.virtual('isCancelled').get(function () {
  return this.status === TransactionStatus.CANCELLED;
});

// ========== JSON/OBJECT TRANSFORMATION ==========

InventoryTransactionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

InventoryTransactionSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// ========== MIDDLEWARE ==========

// Pre-save validation
InventoryTransactionSchema.pre('save', function (next) {
  // Validate source/destination based on type
  if (this.type === InventoryTransactionType.TRANSFER) {
    if (!this.sourceWarehouseId || !this.destinationWarehouseId) {
      throw new Error('Transfer transactions require both source and destination warehouses');
    }
  } else if (this.type === InventoryTransactionType.IN) {
    if (!this.destinationWarehouseId) {
      throw new Error('IN transactions require a destination warehouse');
    }
  } else if (this.type === InventoryTransactionType.OUT) {
    if (!this.sourceWarehouseId) {
      throw new Error('OUT transactions require a source warehouse');
    }
  }

  // Set completed date when status changes to completed
  if (this.isModified('status') && this.status === TransactionStatus.COMPLETED && !this.completedDate) {
    this.completedDate = new Date();
  }

  // Set cancelled date when status changes to cancelled
  if (this.isModified('status') && this.status === TransactionStatus.CANCELLED && !this.cancelledDate) {
    this.cancelledDate = new Date();
  }

  next();
});
