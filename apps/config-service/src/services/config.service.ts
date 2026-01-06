import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigRepository } from '../repositories/config.repository';
import { Config, ConfigScope } from '../schemas/config.schema';
import { CreateConfigDto } from '../dto/create-config.dto';
import { UpdateConfigDto } from '../dto/update-config.dto';
import { EVENT_NAMES } from '@shared/constants/message.constants';

const MAX_CONFIG_SIZE_BYTES = 100 * 1024; // 100KB default limit

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    private readonly configRepository: ConfigRepository,
    @Inject('RABBITMQ_USER_CLIENT') private readonly userClient: ClientProxy,
  ) {}

  /**
   * Create or update a global config
   */
  async upsertGlobalConfig(
    dto: CreateConfigDto,
    userId: string,
  ): Promise<Config> {
    this.validateConfigData(dto.data);

    const config = await this.configRepository.upsert(
      dto.name,
      ConfigScope.GLOBAL,
      dto.data,
      userId,
      undefined,
      dto.description,
    );

    await this.emitConfigEvent('config.global.upserted', config, userId);

    this.logger.log(
      `Global config '${dto.name}' upserted by user ${userId}, version ${config.version}`,
    );

    return config;
  }

  /**
   * Get a global config by name
   */
  async getGlobalConfig(name: string): Promise<Config> {
    const config = await this.configRepository.findOne(
      name,
      ConfigScope.GLOBAL,
    );

    if (!config) {
      throw new NotFoundException(`Global config '${name}' not found`);
    }

    return config;
  }

  /**
   * Update a global config
   */
  async updateGlobalConfig(
    name: string,
    dto: UpdateConfigDto,
    userId: string,
  ): Promise<Config> {
    if (dto.data) {
      this.validateConfigData(dto.data);
    }

    const config = await this.configRepository.update(
      name,
      ConfigScope.GLOBAL,
      { ...dto, updatedBy: userId },
    );

    if (!config) {
      throw new NotFoundException(`Global config '${name}' not found`);
    }

    await this.emitConfigEvent('config.global.updated', config, userId);

    this.logger.log(
      `Global config '${name}' updated by user ${userId}, version ${config.version}`,
    );

    return config;
  }

  /**
   * Delete a global config
   */
  async deleteGlobalConfig(name: string, userId: string): Promise<void> {
    const deleted = await this.configRepository.delete(
      name,
      ConfigScope.GLOBAL,
    );

    if (!deleted) {
      throw new NotFoundException(`Global config '${name}' not found`);
    }

    await this.emitConfigEvent(
      'config.global.deleted',
      { name, scope: ConfigScope.GLOBAL },
      userId,
    );

    this.logger.log(`Global config '${name}' deleted by user ${userId}`);
  }

  /**
   * Create or update a user-scoped config
   */
  async upsertUserConfig(
    userId: string,
    dto: CreateConfigDto,
    actorId: string,
  ): Promise<Config> {
    this.validateConfigData(dto.data);

    const config = await this.configRepository.upsert(
      dto.name,
      ConfigScope.USER,
      dto.data,
      actorId,
      userId,
      dto.description,
    );

    await this.emitConfigEvent('config.user.upserted', config, actorId);

    this.logger.log(
      `User config '${dto.name}' for user ${userId} upserted by ${actorId}, version ${config.version}`,
    );

    return config;
  }

  /**
   * Get a user-scoped config by name, with optional fallback to global
   */
  async getUserConfig(
    userId: string,
    name: string,
    fallbackToGlobal: boolean = false,
  ): Promise<Config> {
    const config = await this.configRepository.findOne(
      name,
      ConfigScope.USER,
      userId,
    );

    if (!config) {
      if (fallbackToGlobal) {
        this.logger.debug(
          `User config '${name}' not found for user ${userId}, falling back to global`,
        );
        return await this.getGlobalConfig(name);
      }
      throw new NotFoundException(
        `User config '${name}' not found for user ${userId}`,
      );
    }

    return config;
  }

  /**
   * Update a user-scoped config
   */
  async updateUserConfig(
    userId: string,
    name: string,
    dto: UpdateConfigDto,
    actorId: string,
  ): Promise<Config> {
    if (dto.data) {
      this.validateConfigData(dto.data);
    }

    const config = await this.configRepository.update(
      name,
      ConfigScope.USER,
      { ...dto, updatedBy: actorId },
      userId,
    );

    if (!config) {
      throw new NotFoundException(
        `User config '${name}' not found for user ${userId}`,
      );
    }

    await this.emitConfigEvent('config.user.updated', config, actorId);

    this.logger.log(
      `User config '${name}' for user ${userId} updated by ${actorId}, version ${config.version}`,
    );

    return config;
  }

  /**
   * Delete a user-scoped config
   */
  async deleteUserConfig(
    userId: string,
    name: string,
    actorId: string,
  ): Promise<void> {
    const deleted = await this.configRepository.delete(
      name,
      ConfigScope.USER,
      userId,
    );

    if (!deleted) {
      throw new NotFoundException(
        `User config '${name}' not found for user ${userId}`,
      );
    }

    await this.emitConfigEvent(
      'config.user.deleted',
      { name, scope: ConfigScope.USER, ownerId: userId },
      actorId,
    );

    this.logger.log(
      `User config '${name}' for user ${userId} deleted by ${actorId}`,
    );
  }

  /**
   * List all global configs
   */
  async listGlobalConfigs(limit: number = 100): Promise<Config[]> {
    return await this.configRepository.find(
      ConfigScope.GLOBAL,
      undefined,
      limit,
    );
  }

  /**
   * List all user-scoped configs for a user
   */
  async listUserConfigs(
    userId: string,
    limit: number = 100,
  ): Promise<Config[]> {
    return await this.configRepository.find(ConfigScope.USER, userId, limit);
  }

  /**
   * Validate config data size
   */
  private validateConfigData(data: Record<string, any>): void {
    const dataSize = Buffer.byteLength(JSON.stringify(data), 'utf8');

    if (dataSize > MAX_CONFIG_SIZE_BYTES) {
      throw new BadRequestException(
        `Config data exceeds maximum size of ${MAX_CONFIG_SIZE_BYTES} bytes (current: ${dataSize} bytes)`,
      );
    }
  }

  /**
   * Emit audit event for config changes
   */
  private async emitConfigEvent(
    eventType: string,
    config: any,
    userId: string,
  ): Promise<void> {
    try {
      // Map event type to constant
      let eventConstant: string;
      switch (eventType) {
        case 'config.global.upserted':
          eventConstant = EVENT_NAMES.CONFIG.GLOBAL_UPSERTED;
          break;
        case 'config.global.updated':
          eventConstant = EVENT_NAMES.CONFIG.GLOBAL_UPDATED;
          break;
        case 'config.global.deleted':
          eventConstant = EVENT_NAMES.CONFIG.GLOBAL_DELETED;
          break;
        case 'config.user.upserted':
          eventConstant = EVENT_NAMES.CONFIG.USER_UPSERTED;
          break;
        case 'config.user.updated':
          eventConstant = EVENT_NAMES.CONFIG.USER_UPDATED;
          break;
        case 'config.user.deleted':
          eventConstant = EVENT_NAMES.CONFIG.USER_DELETED;
          break;
        default:
          eventConstant = eventType;
      }
      
      this.userClient.emit(eventConstant, {
        config,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Failed to emit config event: ${error.message}`);
      // Don't fail the operation if event emission fails
    }
  }
}
