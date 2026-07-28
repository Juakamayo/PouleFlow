import { PartialType } from '@nestjs/mapped-types';
import { CreateFencerDto } from './create-fencer.dto';

export class UpdateFencerDto extends PartialType(CreateFencerDto) {}
