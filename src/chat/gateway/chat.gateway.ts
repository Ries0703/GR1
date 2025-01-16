import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from '../service/chat.service';
import { MessageRequestDto } from '../dto/message-request.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: '*',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnGatewayConnection
{
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: any) {
    const validateToken = async (
      socket: Socket,
      next: (err?: Error) => void,
    ) => {
      const authHeader = socket.handshake.headers['authorization'] as string;
      const [bearer, token] = authHeader.split(' ');
      if (bearer !== 'Bearer' || !token) {
        this.logger.error(`Invalid token: ${token}`);
        return next(new WsException('Unauthorized'));
      }
      try {
        const payload = await this.jwtService.verifyAsync(token);
        socket.data.userId = payload.sub;
        this.logger.log(`Token verified`);
        return next();
      } catch (error) {
        this.logger.error(
          `Token verification failed: ${JSON.stringify(error)}`,
        );
        return next(new WsException('Unauthorized'));
      }
    };
    server.use(validateToken);
  }

  handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessageRequestDto,
  ) {
    client.emit('typing');
    try {
      return this.chatService.getChatCompletion(payload, client);
    } catch (e) {
      this.logger.log(e);
      client.emit('error');
    }
  }
}
