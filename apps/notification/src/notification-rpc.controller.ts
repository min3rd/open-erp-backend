import { Controller, Logger, Inject } from '@nestjs/common';
import { RPC_METHODS } from '@shared/constants/message.constants';
import { EmailService } from './email.service';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { RPCMessage } from '@shared/types/rabbitmq.types';

/**
 * NotificationRpcController handles RPC requests for the Notification service
 * Methods are registered with the custom RabbitMQ client
 */
@Controller()
export class NotificationRpcController {
  private readonly logger = new Logger(NotificationRpcController.name);

  constructor(
    private readonly emailService: EmailService,
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  /**
   * Main RPC handler that routes messages to specific methods
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`RPC: ${message.method}`);

    switch (message.method) {
      case RPC_METHODS.NOTIFICATION.SEND_NOTIFICATION:
        return await this.sendNotification(message.params);

      case RPC_METHODS.NOTIFICATION.SEND_VERIFICATION_EMAIL:
        return await this.sendVerificationEmail(message.params);

      case RPC_METHODS.NOTIFICATION.SEND_PASSWORD_RESET_EMAIL:
        return await this.sendPasswordResetEmail(message.params);

      case RPC_METHODS.NOTIFICATION.SEND_PASSWORD_CHANGED_EMAIL:
        return await this.sendPasswordChangedEmail(message.params);

      default:
        throw new Error(`Unknown RPC method: ${message.method}`);
    }
  }

  private async sendNotification(params: { type: string; data: any }) {
    const { type, data } = params;
    if (type === 'email') {
      return await this.sendEmail(data);
    } else if (type === 'sms') {
      return await this.sendSMS(data);
    }
    throw new Error(`Unknown notification type: ${type}`);
  }

  private async sendVerificationEmail(params: {
    to: string;
    fullName: string;
    verificationCode: string;
  }) {
    try {
      await this.emailService.sendVerificationEmail(
        params.to,
        params.fullName,
        params.verificationCode,
      );

      // Publish email sent event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
        EVENT_NAMES.NOTIFICATION.EMAIL_SENT,
        {
          to: params.to,
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

  private async sendPasswordResetEmail(params: {
    to: string;
    fullName: string;
    resetLink: string;
  }) {
    try {
      await this.emailService.sendPasswordResetEmail(
        params.to,
        params.fullName,
        params.resetLink,
      );

      // Publish email sent event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
        EVENT_NAMES.NOTIFICATION.EMAIL_SENT,
        {
          to: params.to,
          subject: 'Password Reset Request',
          sentAt: new Date(),
        },
      );

      return {
        success: true,
        message: 'Password reset email sent successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async sendPasswordChangedEmail(params: {
    to: string;
    fullName: string;
    timestamp: string;
  }) {
    try {
      await this.emailService.sendPasswordChangedEmail(
        params.to,
        params.fullName,
        params.timestamp,
      );

      // Publish email sent event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
        EVENT_NAMES.NOTIFICATION.EMAIL_SENT,
        {
          to: params.to,
          subject: 'Password Changed Successfully',
          sentAt: new Date(),
        },
      );

      return {
        success: true,
        message: 'Password changed email sent successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send password changed email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async sendEmail(data: { to: string; subject: string; body: string }) {
    this.logger.log(`Sending email to ${data.to}: ${data.subject}`);

    // Use actual email service implementation
    await this.emailService.sendVerificationEmail(data.to, '', ''); // Will be customized based on data

    // Publish email sent event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_EMAIL_SENT,
      EVENT_NAMES.NOTIFICATION.EMAIL_SENT,
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

  private async sendSMS(data: { to: string; message: string }) {
    // TODO: Implement actual SMS sending logic
    this.logger.log(`Sending SMS to ${data.to}: ${data.message}`);

    // Publish SMS sent event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_SMS_SENT,
      EVENT_NAMES.NOTIFICATION.SMS_SENT,
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
}
