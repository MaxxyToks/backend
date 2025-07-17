import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Observation } from '../entities/observation.entity';
import { BaseRepository } from './base.repository';

export interface SaveObservationDto {
    userId: string;
    observedAddress: string;
    tokenSymbol?: string;
    chainName?: string;
}

@Injectable()
export class ObservationRepository extends BaseRepository<Observation> {
    constructor(
        @InjectRepository(Observation)
        public readonly repository: Repository<Observation>,
    ) {
        super(repository);
    }

    public async saveObservation(
        data: SaveObservationDto
    ): Promise<Observation> {
        if (data.tokenSymbol === undefined) {
            data.tokenSymbol = 'all';
        }
        if (data.chainName === undefined) {
            data.chainName = 'all';
        }

        data.observedAddress = data.observedAddress.toLowerCase();
        const observation = this.repository.create(data);
        return this.repository.save(observation);
    }

    public async getObservationsByUserId(userId: string): Promise<Observation[]> {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    public async getObservationsByObservedAddress(
        observedAddress: string,
    ): Promise<Observation[]> {
        return this.repository.find({
            where: { observedAddress: observedAddress.toLowerCase() },
            order: { createdAt: 'DESC' },
        });
    }

    public async deleteObservation(id: string): Promise<string> {
        const observation = await this.repository.findOne({
            where: { id },
        });
        if (!observation) {
            throw new Error('Observation not found');
        }
        const observedAddress = observation.observedAddress;
        await this.repository.delete({
            id,
        });

        return observedAddress;
    }
}
