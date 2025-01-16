import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import config from '../../config';
import Redis from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Socket } from 'socket.io';
import { MessageRequestDto } from '../dto/message-request.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { TextContentBlock } from 'openai/resources/beta/threads';

@Injectable()
export class ChatService {
  private readonly openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  private readonly logger = new Logger(ChatService.name);
  private readonly redis: Redis;
  private readonly instruction: string = `Bạn là trợ lý ảo của hệ thống CRM+ RedAI`;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  async getChatSessionId(userId: number): Promise<string> {
    this.logger.log(`Retrieving chat session ID for user ID ${userId}`);
    try {
      const sessionId = await this.redis.get(`chat:${userId}`);
      if (!sessionId) {
        this.logger.warn(`No chat session ID found for key chat:${userId}`);
        const session = await this.openai.beta.threads.create();
        await this.setChatSessionId(userId, session.id);
        this.logger.log(
          `Created chat session ID for chat:${userId}: ${session.id}`,
        );
        return session.id;
      } else {
        this.logger.log(
          `Retrieved chat session ID for chat:${userId}: ${sessionId}`,
        );
      }
      return sessionId;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve key chat:${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getChatCompletion(
    payload: MessageRequestDto,
    socket: Socket,
  ): Promise<void> {
    const sessionId = await this.getChatSessionId(parseInt(socket.data.userId));
    await this.openai.beta.threads.messages.create(sessionId, {
      role: 'user',
      content: payload.getContent(),
    });
    const stream = this.openai.beta.threads.runs.stream(sessionId, {
      assistant_id: config.REDAI_ASSISTANT_ID,
      additional_instructions: this.instruction,
    });
    for await (const chunk of stream) {
      if (chunk.event === 'thread.message.completed') {
        const messageResponse = new MessageResponseDto(
          (chunk.data.content[0] as TextContentBlock).text.value,
        );
        socket.emit('message', messageResponse);
      } else if (chunk.event === 'thread.run.completed') {
        socket.emit('finish');
      }
    }
  }

  private async setChatSessionId(
    userId: number,
    sessionId: string,
  ): Promise<void> {
    this.logger.log(
      `Setting chat session ID ${sessionId} for user ID ${userId}`,
    );
    try {
      await this.redis.setex(`chat:${userId}`, 60 * 60, sessionId);
      const ttl = await this.redis.ttl(`chat:${userId}`);
      this.logger.log(`Key chat:${userId} set with TTL: ${ttl}`);
    } catch (error) {
      this.logger.error(`Failed to set key chat:${userId}: ${error.message}`);
      throw error;
    }
  }
}
