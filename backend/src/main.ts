import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';

const uploadRoot = join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
if (!existsSync(uploadRoot)) {
  mkdirSync(uploadRoot, { recursive: true });
}
const ticketsUpload = join(uploadRoot, 'tickets');
if (!existsSync(ticketsUpload)) {
  mkdirSync(ticketsUpload, { recursive: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
  const usersService = app.get(UsersService);
  await usersService.seedOwnerIfNeeded().catch((err) => console.error('[Seed]', err));
  const cyan = '\x1b[36m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const green = '\x1b[32m';
  const reset = '\x1b[0m';
  const url = `http://localhost:${port}/api`;
  console.log(`
${dim}  ╭────────────────────────────────────────────╮${reset}
${bold}  │${reset}  ${cyan}Nevers${reset} ${bold}Support API${reset}                        ${bold}│${reset}
${dim}  ├────────────────────────────────────────────┤${reset}
${green}  │${reset}  ${bold}▶${reset} ${dim}LISTEN${reset}   ${url}
${green}  │${reset}  ${bold}▶${reset} ${dim}PREFIX${reset}  /api
${green}  │${reset}  ${bold}▶${reset} ${dim}STATUS${reset}  ${green}ready${reset}
${dim}  ╰────────────────────────────────────────────╯${reset}
`);
}
bootstrap();
