import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

NestFactory.createApplicationContext(AppModule, {
  logger: ['log', 'error', 'warn']
})
  .then(async (app) => {
    const logger = new Logger('WorkerMain');
    logger.log('Rifaria worker started and listening for jobs');

    const shutdown = async () => {
      logger.log('Shutting down worker...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void shutdown();
    });

    process.on('SIGTERM', () => {
      void shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled rejection: ${String(reason)}`);
    });

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
    });
  })
  .catch((error: unknown) => {
    const logger = new Logger('WorkerMain');
    logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exit(1);
  });
