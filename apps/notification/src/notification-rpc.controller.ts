import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPC_METHODS } from '@shared/constants/message.constants';
import { EmailService } from './email.service';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { EVENT_NAMES } from '@shared/constants/message.constants';

/**
 * NotificationRpcController handles RPC requests for the Notification service
 * Uses @MessagePattern decorators for NestJS microservice pattern
 */
@Controller()
export class NotificationRpcController {
  private readonly logger = new Logger(NotificationRpcController.name);

  constructor(
    private readonly emailService: EmailService,
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  @MessagePattern(RPC_METHODS.NOTIFICATION.SEND_NOTIFICATION)
  async sendNotification(@Payload() params: { type: string; data: any }) {
    this.logger.log(`RPC: ${RPC_METHODS.NOTIFICATION.SEND_NOTIFICATION}`);
    const { type, data } = params;
    if (type === 'email') {
      return await this.sendEmail(data);
    } else if (type === 'sms') {
      return await this.sendSMS(data);
    }
    throw new Error(`Unknown notification type: ${type}`);
  }

  @MessagePattern(RPC_METHODS.NOTIFICATION.SEND_VERIFICATION_EMAIL)
  async sendVerificationEmail(
    @Payload()
    params: {
      to: string;
      fullName: string;
      verificationCode: string;
    },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.NOTIFICATION.SEND_VERIFICATION_EMAIL}`);
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

  @MessagePattern(RPC_METHODS.NOTIFICATION.SEND_PASSWORD_RESET_EMAIL)
  async sendPasswordResetEmail(
    @Payload()
    params: {
      to: string;
      fullName: string;
      resetLink: string;
    },
  ) {
    this.logger.log(
      `RPC: ${RPC_METHODS.NOTIFICATION.SEND_PASSWORD_RESET_EMAIL}`,
    );
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

  @MessagePattern(RPC_METHODS.NOTIFICATION.SEND_PASSWORD_CHANGED_EMAIL)
  async sendPasswordChangedEmail(
    @Payload()
    params: {
      to: string;
      fullName: string;
      timestamp: string;
    },
  ) {
    this.logger.log(
      `RPC: ${RPC_METHODS.NOTIFICATION.SEND_PASSWORD_CHANGED_EMAIL}`,
    );
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
