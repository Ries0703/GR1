import { Module } from '@nestjs/common';
import { ChatGateway } from './gateway/chat.gateway';
import { ChatService } from './service/chat.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import config from '../config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: Buffer.from(config.SECRET_KEY, 'base64'),
      verifyOptions: { algorithms: ['HS256'] },
    }),
    RedisModule.forRoot({
      config: {
        url: config.REDIS_URL,
      },
    }),
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatGateway],
})
export class ChatModule {}
