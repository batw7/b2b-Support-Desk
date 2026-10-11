import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Firm } from './entities/firm.entity';
import { FirmsService } from './firms.service';
import { FirmsController } from './firms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Firm])],
  providers: [FirmsService],
  controllers: [FirmsController],
  exports: [FirmsService],
})
export class FirmsModule {}
