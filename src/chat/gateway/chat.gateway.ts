import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from '../service/chat.service';
import { MessageRequestDto } from '../dto/message-request.dto';

@Injectable()
@WebSocketGateway({
  cors: '*',
})
export class ChatGateway implements OnGatewayDisconnect, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
    socket.data.userId = socket.handshake.query as { userId: string };
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
