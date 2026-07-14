import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";
import { ExpressAdapter } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";

let server: any;

async function getServer() {
  if (server) return server;
  const expressFactory = express as unknown as (() => any);
  const application = expressFactory();
  const { AppModule } = require("../apps/api/dist/apps/api/src/app.module.js") as typeof import("../apps/api/src/app.module");
  const nest = await NestFactory.create(AppModule, new ExpressAdapter(application));
  nest.setGlobalPrefix("api");
  await nest.init();
  server = application;
  return server;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    (await getServer())(req, res);
  } catch (error) {
    console.error("FleetControl API bootstrap failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "API bootstrap failed", detail: error instanceof Error ? error.stack : String(error) }));
    }
  }
}
