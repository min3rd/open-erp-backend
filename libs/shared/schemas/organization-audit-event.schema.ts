import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrganizationAuditEventDocument =
  HydratedDocument<OrganizationAuditEvent>;

export enum AuditEventType {
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  ORGANIZATION_DELETED = 'organization.deleted',
  ORGANIZATION_RESTORED = 'organization.restored',
  RELATION_CREATED = 'relation.created',
  RELATION_UPDATED = 'relation.updated',
  RELATION_DELETED = 'relation.deleted',
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  MEMBER_ROLE_UPDATED = 'member.role_updated',
  MEMBER_REMOVED = 'member.removed',
  INVITATION_ACCEPTED = 'invitation.accepted',
  INVITATION_REJECTED = 'invitation.rejected',
  INVITATION_REVOKED = 'invitation.revoked',
  INVITATION_EXPIRED = 'invitation.expired',
}

@Schema({
  timestamps: true,
  collection: 'organization_audit_events',
  versionKey: false,
})
export class OrganizationAuditEvent extends Document {
  @Prop({
    type: String,
    enum: Object.values(AuditEventType),
    required: true,
    index: true,
  })
  eventType: AuditEventType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  eventData: any;

  @Prop({
    type: String,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
  })
  ipAddress?: string;

  @Prop({
    type: String,
    trim: true,
  })
  userAgent?: string;

  @Prop({
    type: Map,
    of: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata?: Map<string, any>;
}

export const OrganizationAuditEventSchema = SchemaFactory.createForClass(
  OrganizationAuditEvent,
);

// Compound indexes for efficient querying
OrganizationAuditEventSchema.index({ organizationId: 1, createdAt: -1 });
OrganizationAuditEventSchema.index({ userId: 1, createdAt: -1 });
OrganizationAuditEventSchema.index({ eventType: 1, createdAt: -1 });
OrganizationAuditEventSchema.index({ organizationId: 1, eventType: 1 });

// TTL index to auto-delete old audit logs after 2 years
OrganizationAuditEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 63072000 },
);

// Ensure virtuals are included in JSON output
OrganizationAuditEventSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

OrganizationAuditEventSchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});
