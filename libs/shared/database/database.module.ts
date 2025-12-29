import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig, getMongooseOptions } from './database.config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
