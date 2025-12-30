import { Schema } from 'mongoose';

/**
 * Plugin to add soft-delete functionality to schema
 */
export function softDeletePlugin(schema: Schema) {
  // Add deletedAt field
  schema.add({
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  // Add isDeleted virtual
  schema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
  });

  // Override default find methods to exclude soft-deleted documents
  const typesFindQueryMiddleware = [
    'count',
    'countDocuments',
    'find',
    'findOne',
    'findOneAndDelete',
    'findOneAndRemove',
    'findOneAndUpdate',
    'update',
    'updateOne',
    'updateMany',
  ];

  const setDeletedFalse = function (this: any, next: any) {
    const filter = this.getFilter();
    if (!('deletedAt' in filter)) {
      this.where({ deletedAt: null });
    }
    next();
  };

  typesFindQueryMiddleware.forEach((type) => {
    schema.pre(type as any, setDeletedFalse);
  });

  // Add soft delete method
  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  // Add restore method
  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
  };

  // Add static method to find deleted documents
  schema.statics.findDeleted = function (conditions = {}) {
    return this.find({ ...conditions, deletedAt: { $ne: null } });
  };

  // Add static method to find with deleted documents
  schema.statics.findWithDeleted = function (conditions = {}) {
    return this.find(conditions);
  };
}
