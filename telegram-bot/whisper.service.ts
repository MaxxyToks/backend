import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';
import { AgentService } from 'modules/agent/agent.service';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class WhisperService {
    private readonly logger = new Logger(WhisperService.name);

    constructor(private readonly agentService: AgentService) { }

    async transcribeOggFile(oggBuffer: Buffer): Promise<string> {
        const tmpDir = '/tmp';
        const oggPath = join(tmpDir, `${uuid()}.ogg`);

        try {
            await fs.writeFile(oggPath, oggBuffer);
            const transcription = await this.agentService.transcribeAudioFile(oggPath);
            return transcription;
        } catch (err) {
            this.logger.error('Whisper transcription failed', err);
            throw err;
        } finally {
            await fs.remove(oggPath);
        }
    }
}
