import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, ms }) => {
                return `${timestamp} [${context}] ${level}: ${message} ${ms}`;
              }),
            ),
          }),
          new winston.transports.DailyRotateFile({
            dirname: 'logs',
            filename: '%DATE%-error.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
          new winston.transports.DailyRotateFile({
            dirname: 'logs',
            filename: '%DATE%-combined.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
