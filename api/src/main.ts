import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Controller()
class HealthController {
  @Get("health")
  health() {
    return { status: "ok", service: "opshub-api", mode: "scaffold" };
  }
}

@Module({ controllers: [HealthController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: false });
  await app.listen(process.env.PORT ?? 4000, "0.0.0.0");
}
void bootstrap();
