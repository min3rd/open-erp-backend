import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SwaggerAggregatorController } from './swagger-aggregator.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, SwaggerAggregatorController],
  providers: [AppService],
})
export class AppModule {}
