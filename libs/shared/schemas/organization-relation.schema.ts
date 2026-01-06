import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrganizationRelationDocument =
  HydratedDocument<OrganizationRelation>;

export enum RelationType {
  OWNER_SUBSIDIARY = 'owner-subsidiary',
  JOINT_VENTURE = 'joint-venture',
  PARTNER = 'partner',
  BRANCH = 'branch',
  AFFILIATED = 'affiliated',
}

export enum RelationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DISSOLVED = 'dissolved',
}

@Schema({
  timestamps: true,
  collection: 'organization_relations',
  versionKey: false,
})
export class OrganizationRelation extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  parentId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  childId: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(RelationType),
    index: true,
  })
  relationType: RelationType;

  @Prop({
    type: Number,
    min: 0,
    max: 100,
  })
  sharePercentage?: number;

  @Prop({
    type: Date,
    required: true,
  })
  effectiveDate: Date;

  @Prop({
    type: Date,
  })
  endDate?: Date;

  @Prop({
    type: String,
    enum: Object.values(RelationStatus),
    default: RelationStatus.ACTIVE,
    index: true,
  })
  status: RelationStatus;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  notes?: string;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;

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
    index: true,
  })
  updatedBy?: MongooseSchema.Types.ObjectId;
}

export const OrganizationRelationSchema = SchemaFactory.createForClass(
  OrganizationRelation,
);

// Compound indexes
// Ensure uniqueness: one parent-child pair can only have one active relation at a time
OrganizationRelationSchema.index(
  { parentId: 1, childId: 1, deletedAt: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

OrganizationRelationSchema.index({ parentId: 1, status: 1 });
OrganizationRelationSchema.index({ childId: 1, status: 1 });
OrganizationRelationSchema.index({ relationType: 1, status: 1 });

// TTL index for soft-deleted relations
OrganizationRelationSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 63072000 },
); // 2 years

// Middleware to exclude soft-deleted documents by default
OrganizationRelationSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Virtuals
OrganizationRelationSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

OrganizationRelationSchema.virtual('isActive').get(function () {
  return this.status === RelationStatus.ACTIVE;
});

OrganizationRelationSchema.virtual('isExpired').get(function () {
  return this.endDate && this.endDate < new Date();
});

// Ensure virtuals are included in JSON output
OrganizationRelationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

OrganizationRelationSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
