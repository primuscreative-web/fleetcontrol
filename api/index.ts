import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";
import { ExpressAdapter } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "../apps/api/src/app.module";

let server: express.Express | undefined;

async function getServer() {
  if (server) return server;
  const application = express();
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(application));
  nest.setGlobalPrefix("api");
  await nest.init();
  server = application;
  return server;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  (await getServer())(req, res);
}
