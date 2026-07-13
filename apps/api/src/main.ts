import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const appUrl = config.getOrThrow<string>("APP_URL");

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({
    origin: appUrl,
    credentials: true,
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("FleetControl API")
      .setDescription("Enterprise fleet management API")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(4000);
}

void bootstrap();
