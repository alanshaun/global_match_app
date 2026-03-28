import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { productsRouter } from "./routers/products";
import { jobsRouter } from "./routers/jobs";
import { subscriptionsRouter } from "./routers/subscriptions";
import { adminRouter } from "./routers/admin";
import { jobsRealRouter } from "./routers/jobs-real";

import { propertiesRealRouter } from "./routers/properties-real";
import { jobSubscriptionsRouter } from "./routers/job-subscriptions";
import { supplyChainRouter } from "./routers/supply-chain";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 功能一：产品匹配路由
  products: productsRouter,

  // 功能二：职位匹配路由
  jobs: jobsRouter,

  // 邮件订阅路由
  subscriptions: subscriptionsRouter,

  // 管理员路由
  admin: adminRouter,

  // 真实数据路由
  jobsReal: jobsRealRouter,
  propertiesReal: propertiesRealRouter,

  // 职位搜索订阅路由
  jobSubscriptions: jobSubscriptionsRouter,

  // 供应链搜索路由
  supplyChain: supplyChainRouter,
});

export type AppRouter = typeof appRouter;
