import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQClient, RABBITMQ_CLIENT, RABBITMQ_USER_CLIENT } from '@shared/rabbitmq';
import { EventMessage, RPCMessage } from '@shared/types/rabbitmq.types';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { EVENT_NAMES, RPC_METHODS } from '@shared/constants/message.constants';
import { EmailService } from './email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    @Inject(RABBITMQ_USER_CLIENT) private readonly userClient: ClientProxy,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail(data: { to: string; subject: string; body: string }) {
    this.logger.log(`Sending email to ${data.to}: ${data.subject}`);

    // Use actual email service implementation
    await this.emailService.sendVerificationEmail(data.to, '', ''); // Will be customized based on data

    // Publish email sent event
    try {
      this.userClient.emit(EVENT_NAMES.NOTIFICATION.EMAIL_SENT, {
        to: data.to,
        subject: data.subject,
        sentAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to emit email sent event: ${error.message}`);
    }

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
      try {
        this.userClient.emit(EVENT_NAMES.NOTIFICATION.EMAIL_SENT, {
          to: data.to,
          subject: 'Email Verification',
          sentAt: new Date(),
        });
      } catch (error) {
        this.logger.warn(`Failed to emit email sent event: ${error.message}`);
      }

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
    try {
      this.userClient.emit(EVENT_NAMES.NOTIFICATION.SMS_SENT, {
        to: data.to,
        sentAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to emit SMS sent event: ${error.message}`);
    }

    return {
      success: true,
      message: 'SMS sent successfully',
    };
  }

  /**
   * Handle incoming events from other services
   * @deprecated Use NotificationEventController with @EventPattern decorators instead
   */
  async handleEvent(message: EventMessage<any>) {
    this.logger.log(`Received event: ${message.eventName}`);

    switch (message.eventName) {
      case EVENT_NAMES.AUTH.USER_REGISTERED:
        // Send welcome email when user registers (different from verification email)
        this.logger.log(
          `Sending welcome email to new user: ${message.data.email}`,
        );
        // Note: This is different from verification email, can be implemented later
        break;

      case EVENT_NAMES.AUTH.USER_LOGIN:
        this.logger.log(`User login notification: ${message.data.userId}`);
        // Could send notification about login activity
        break;

      case EVENT_NAMES.USER.CREATED:
        this.logger.log(`New user created: ${message.data.id}`);
        break;

      case EVENT_NAMES.USER.UPDATED:
        this.logger.log(`User updated: ${message.data.userId}`);
        break;

      case EVENT_NAMES.USER.DELETED:
        this.logger.log(`User deleted: ${message.data.userId}`);
        break;

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  /**
   * Handle RPC requests
   * @deprecated Use NotificationRpcController with @MessagePattern decorators instead
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`Received RPC: ${message.method}`);

    switch (message.method) {
      case RPC_METHODS.NOTIFICATION.SEND_NOTIFICATION:
        const { type, data } = message.params;
        if (type === 'email') {
          return await this.sendEmail(data);
        } else if (type === 'sms') {
          return await this.sendSMS(data);
        }
        throw new Error(`Unknown notification type: ${type}`);

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

  async sendPasswordResetEmail(data: {
    to: string;
    fullName: string;
    resetLink: string;
  }) {
    this.logger.log(`Sending password reset email to ${data.to}`);

    try {
      await this.emailService.sendPasswordResetEmail(
        data.to,
        data.fullName,
        data.resetLink,
      );

      // Publish email sent event
      try {
        this.userClient.emit(EVENT_NAMES.NOTIFICATION.EMAIL_SENT, {
          to: data.to,
          subject: 'Password Reset Request',
          sentAt: new Date(),
        });
      } catch (error) {
        this.logger.warn(`Failed to emit email sent event: ${error.message}`);
      }

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

  async sendPasswordChangedEmail(data: {
    to: string;
    fullName: string;
    timestamp: string;
  }) {
    this.logger.log(`Sending password changed email to ${data.to}`);

    try {
      await this.emailService.sendPasswordChangedEmail(
        data.to,
        data.fullName,
        data.timestamp,
      );

      // Publish email sent event
      try {
        this.userClient.emit(EVENT_NAMES.NOTIFICATION.EMAIL_SENT, {
          to: data.to,
          subject: 'Password Changed Successfully',
          sentAt: new Date(),
        });
      } catch (error) {
        this.logger.warn(`Failed to emit email sent event: ${error.message}`);
      }

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
}
