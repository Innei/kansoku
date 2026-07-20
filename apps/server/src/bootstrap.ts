import 'reflect-metadata';
import { createApplication, type HonoHttpApplication } from '@tsuki-hono/core';
import { Module, type Constructor } from '@tsuki-hono/common';
import { AppExceptionFilter } from './filters/app-exception.filter.js';
import { AppModule } from './modules/app.module.js';

export interface Kernel {
  app: HonoHttpApplication;
}

// globalPrefix "/api" lets controllers use bare paths (e.g. @Controller("health"))
// for "/api/health". extraModules come from the server's pro composition point
// (see edition/pro.ts) and are wrapped around AppModule rather than folded into
// it, since AppModule's own decorator metadata is fixed at class-definition time.
export async function createKernel(extraModules: readonly Constructor[] = []): Promise<Kernel> {
  @Module({ imports: [AppModule, ...extraModules] })
  class RootModule {}

  const app = await createApplication(RootModule, { globalPrefix: '/api' });
  app.useGlobalFilters(new AppExceptionFilter());
  return { app };
}
