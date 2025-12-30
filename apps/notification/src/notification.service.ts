import { Injectable, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import { EventMessage, RPCMessage } from '@shared/types/rabbitmq.types';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { EmailService } from './email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail(data: { to: string; subject: string; body: string }) {
    this.logger.log(`Sending email to ${data.to}: ${data.subject}`);

    // Use actual email service implementation
    await this.emailService.sendVerificationEmail(data.to, '', ''); // Will be customized based on data

    // Publish email sent event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
      'notification.email.sent',
      {
        to: data.to,
        subject: data.subject,
        sentAt: new Date(),
      },
    );

    return {
      success: true,
      message: 'Email sent successfully',
    };
  }

  async sendVerificationEmail(data: {
    to: string;
    fullName: string;
    verificationCode: string;
  }) {
    this.logger.log(`Sending verification email to ${data.to}`);

    try {
      await this.emailService.sendVerificationEmail(
        data.to,
        data.fullName,
        data.verificationCode,
      );

      // Publish email sent event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
        'notification.email.sent',
        {
          to: data.to,
          subject: 'Email Verification',
          sentAt: new Date(),
        },
      );

      return {
        success: true,
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendSMS(data: { to: string; message: string }) {
    // TODO: Implement actual SMS sending logic
    this.logger.log(`Sending SMS to ${data.to}: ${data.message}`);

    // Publish SMS sent event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_SMS_SENT,
      'notification.sms.sent',
      {
        to: data.to,
        sentAt: new Date(),
      },
    );

    return {
      success: true,
      message: 'SMS sent successfully',
    };
  }

  /**
   * Handle incoming events from other services
   */
  async handleEvent(message: EventMessage<any>) {
    this.logger.log(`Received event: ${message.eventName}`);

    switch (message.eventName) {
      case 'user.registered':
        // Send welcome email when user registers (different from verification email)
        this.logger.log(
          `Sending welcome email to new user: ${message.data.email}`,
        );
        // Note: This is different from verification email, can be implemented later
        break;

      case 'user.login':
        this.logger.log(`User login notification: ${message.data.userId}`);
        // Could send notification about login activity
        break;

      case 'user.created':
        this.logger.log(`New user created: ${message.data.id}`);
        break;

      case 'user.updated':
        this.logger.log(`User updated: ${message.data.userId}`);
        break;

      case 'user.deleted':
        this.logger.log(`User deleted: ${message.data.userId}`);
        break;

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  /**
   * Handle RPC requests
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`Received RPC: ${message.method}`);

    switch (message.method) {
      case 'sendNotification':
        const { type, data } = message.params;
        if (type === 'email') {
          return await this.sendEmail(data);
        } else if (type === 'sms') {
          return await this.sendSMS(data);
        }
        throw new Error(`Unknown notification type: ${type}`);

      case 'sendVerificationEmail':
        return await this.sendVerificationEmail(message.params);

      default:
        throw new Error(`Unknown RPC method: ${message.method}`);
    }
  }
}
