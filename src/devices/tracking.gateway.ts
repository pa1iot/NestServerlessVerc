import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() deviceCode: string, @ConnectedSocket() client: Socket) {
    client.join(deviceCode);
    console.log(`Client ${client.id} joined room: ${deviceCode}`);
  }

  sendLocationUpdate(deviceCode: string, data: any) {
    this.server.to(deviceCode).emit('location-update', data);
  }
}
