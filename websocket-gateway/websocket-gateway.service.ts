import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthService } from '../modules/auth/auth.service';
import { getChainNameById } from '../modules/blockchain/constants';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { CloseDcaDto } from '../modules/dca/dto/dca.dto';
import { CloseOrderNotificationDto, DcaBuyDto } from '../modules/notifications/dto/notifications.dto';
import { UserService } from '../modules/user/user.service';

interface AuthenticateData {
  token: string;
}

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class WebSocketGatewayService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayService.name);
  private readonly connectedClients = new Map<string, string>(); // socketId -> walletAddress
  private readonly authenticatedSockets = new Set<string>(); // Set of authenticated socket IDs

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,

    private readonly evmUtils: EvmUtils,
  ) { }

  afterInit(_: Server): void {
    this.logger.log('Socket.IO server initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`);

    // Set a timeout for authentication
    setTimeout(() => {
      if (!this.authenticatedSockets.has(client.id)) {
        this.logger.warn(`Client ${client.id} did not authenticate within timeout, disconnecting`);
        client.disconnect(true);
      }
    }, 30000); // 30 seconds timeout
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.authenticatedSockets.delete(client.id);
  }

  @SubscribeMessage('auth')
  async handleAuthenticate(client: Socket, data: AuthenticateData): Promise<void> {
    try {
      if (!data.token) {
        throw new Error('Authentication error: Missing token');
      }

      const user = await this.authService.userJwtGuard(data.token);
      if (!user) {
        throw new Error('Invalid authentication token');
      }

      // Store user data and mark as authenticated
      client.data.user = user;
      this.authenticatedSockets.add(client.id);

      if (user.walletAddress) {
        this.connectedClients.set(client.id, user.id.toLowerCase());
        this.logger.log(`Authenticated client ${client.id} mapped to userId ${user.id}`);
      }

      // Notify client of successful authentication
      client.emit('authenticated', { status: 'success' });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Authentication failed for client ${client.id}: ${err.message}`);
      client.emit('authenticated', {
        status: 'error',
        message: err.message,
      });
      client.disconnect(true);
    }
  }

  private isAuthenticated(socketId: string): boolean {
    return this.authenticatedSockets.has(socketId);
  }

  findClientsByUserId(userId: string): Socket[] {
    const clients: Socket[] = [];
    const lowercaseUserId = userId.toLowerCase();

    for (const [socketId, address] of this.connectedClients.entries()) {
      if (address === lowercaseUserId && this.isAuthenticated(socketId)) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          clients.push(socket);
        }
      }
    }

    return clients;
  }

  public async sendTransferEvent(data: any): Promise<void> {
    this.logger.log('Moralis webhook data:', data);

    let { erc20Transfers, chainId: chainIdHex } = data;

    if (!erc20Transfers || !Array.isArray(erc20Transfers)) {
      this.logger.warn('No erc20Transfers found in webhook data');
      erc20Transfers = [data];
    }

    for (const transfer of erc20Transfers) {
      const { from, to, valueWithDecimals, contract, tokenSymbol, tokenName, transactionHash } = transfer;
      this.logger.log('Transfer to:', to);

      const users = await this.userService.getUsersByAddress(to.toLowerCase());
      if (!users.length) {
        this.logger.warn(`Users not found for address ${to}`);
        continue;
      }
      const chainId = transfer.chainId ? parseInt(transfer.chainId) : parseInt(chainIdHex, 16);
      const chainName = getChainNameById(chainId);
      const transactionExplorerUrl = this.evmUtils.explorerUrlForTx(chainName, transactionHash);

      for (const user of users) {
        const incomingNotification = {
          userId: user.id,
          chainId,
          chainName,
          from,
          to,
          valueWithDecimals,
          tokenSymbol,
          tokenName,
          tokenContract: contract,
          transactionHash,
          transactionExplorerUrl,
        };


        // Find connected clients for this user's wallet address
        if (to) {
          const clients = this.findClientsByUserId(user.id);
          this.logger.log(`Found ${clients.length} clients for user ${user.id}`);

          clients.forEach((client) => {
            this.logger.log(`Sending transfer data to client ${client.id}: ${JSON.stringify(incomingNotification)}`);
            client.emit('transferEvent', incomingNotification);
          });
        } else {
          this.logger.warn(`No wallet address found for user ${user.id}`);
        }
      }
    }
  }

  public async sendDcaBuyNotification(data: DcaBuyDto): Promise<void> {
    const user = data.subscription.userId ? await this.userService.getUserById(data.subscription.userId) : null;
    if (!user || !user.id) {
      this.logger.warn(`User not found or missing user profile for user`);
      return;
    }
    const clients = this.findClientsByUserId(user.id);
    this.logger.log(`Sending DCA buy notification to ${clients.length} clients for user ${user.id}`);

    try {
      clients.forEach((client) => {
        client.emit('dcaBuyNotification', data);
      });
    } catch (error) {
      this.logger.error('Error sending dca buy order notification:', error);
    }
  }

  public async sendCloseOrderNotification(notification: CloseOrderNotificationDto): Promise<void> {
    const user = await this.userService.getUserById(notification.userId);
    if (!user || !user.id) {
      this.logger.warn(`User not found or missing user profile for user ${notification.userId}`);
      return;
    }
    const clients = this.findClientsByUserId(user.id);
    this.logger.log(user.walletAddress);
    this.logger.log(`Sending close order notification to ${clients.length} clients for user id ${notification.userId}`);

    try {
      clients.forEach((client) => {
        client.emit('closeOrderNotification', notification);
      });
    } catch (error) {
      this.logger.error('Error sending close order notification:', error);
    }
  }

  public async sendCloseDcaNotification(notification: CloseDcaDto): Promise<void> {
    if (!notification.userAddress) {
      this.logger.warn(`Missing user address in close DCA notification`);
      return;
    }
    const clients = this.findClientsByUserId(notification.userId);
    this.logger.log(notification.userId);
    this.logger.log(`Sending close DCA notification to ${clients.length} clients for userId ${notification.userId}`);

    try {
      clients.forEach((client) => {
        client.emit('closeDcaNotification', notification);
      });
    } catch (error) {
      this.logger.error('Error sending close DCA notification:', error);
    }
  }
}