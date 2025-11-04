export interface WebSocketMessage {
  type: 'portfolio_update' | 'market_data' | 'transaction_status' | 'price_update' | 'yield_update';
  data: any;
  timestamp: Date;
  userAddress?: string;
}

export interface MarketDataUpdate {
  bnbPrice: number;
  priceChange24h: number;
  protocolAPYs: Record<string, number>;
  tvlData: Record<string, number>;
}

export interface PortfolioUpdate {
  totalValue: number;
  totalYield: number;
  currentAPY: number;
  riskScore: number;
}

export interface TransactionUpdate {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: string;
  amount: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(userAddress?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // In real implementation, use actual WebSocket endpoint
        const wsUrl = `wss://api.aion-vault.com/ws${userAddress ? `?user=${userAddress}` : ''}`;
        
        // For demo, simulate WebSocket connection
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        // Simulate connection success
        setTimeout(() => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('✅ WebSocket connected');
          
          this.startHeartbeat();
          this.startMockDataStream();
          
          resolve();
        }, 1000);

      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isConnected = false;
    console.log('🔌 WebSocket disconnected');
  }

  subscribe(type: WebSocketMessage['type'], callback: (data: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);
    console.log(`👂 Subscribed to ${type} updates`);
  }

  unsubscribe(type: WebSocketMessage['type'], callback: (data: any) => void): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(callback);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
    }
    console.log(`🔇 Unsubscribed from ${type} updates`);
  }

  private emit(message: WebSocketMessage): void {
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('❌ Error in WebSocket callback:', error);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Send ping message
        console.log('💓 WebSocket heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  private startMockDataStream(): void {
    // Simulate real-time market data updates
    setInterval(() => {
      if (this.isConnected) {
        const marketData: MarketDataUpdate = {
          bnbPrice: 326.12 + (Math.random() - 0.5) * 10,
          priceChange24h: (Math.random() - 0.5) * 8,
          protocolAPYs: {
            'Venus': 8.5 + (Math.random() - 0.5) * 2,
            'Beefy': 12.3 + (Math.random() - 0.5) * 3,
            'PancakeSwap': 15.7 + (Math.random() - 0.5) * 4,
            'Aave': 6.8 + (Math.random() - 0.5) * 1.5
          },
          tvlData: {
            'Venus': 450000000 + Math.random() * 50000000,
            'Beefy': 320000000 + Math.random() * 30000000,
            'PancakeSwap': 890000000 + Math.random() * 100000000,
            'Aave': 280000000 + Math.random() * 20000000
          }
        };

        this.emit({
          type: 'market_data',
          data: marketData,
          timestamp: new Date()
        });
      }
    }, 15000); // Every 15 seconds

    // Simulate portfolio updates
    setInterval(() => {
      if (this.isConnected) {
        const portfolioUpdate: PortfolioUpdate = {
          totalValue: 3200 + (Math.random() - 0.5) * 200,
          totalYield: 180 + (Math.random() - 0.5) * 20,
          currentAPY: 12.8 + (Math.random() - 0.5) * 2,
          riskScore: 45 + (Math.random() - 0.5) * 10
        };

        this.emit({
          type: 'portfolio_update',
          data: portfolioUpdate,
          timestamp: new Date()
        });
      }
    }, 30000); // Every 30 seconds

    // Simulate transaction updates
    setInterval(() => {
      if (this.isConnected && Math.random() < 0.1) { // 10% chance
        const transactionUpdate: TransactionUpdate = {
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          status: Math.random() > 0.8 ? 'confirmed' : 'pending',
          type: ['deposit', 'withdraw', 'claimYield'][Math.floor(Math.random() * 3)],
          amount: (Math.random() * 2 + 0.1).toFixed(4)
        };

        this.emit({
          type: 'transaction_status',
          data: transactionUpdate,
          timestamp: new Date()
        });
      }
    }, 10000); // Every 10 seconds

    // Simulate price updates
    setInterval(() => {
      if (this.isConnected) {
        this.emit({
          type: 'price_update',
          data: {
            bnb: 326.12 + (Math.random() - 0.5) * 5,
            change: (Math.random() - 0.5) * 2
          },
          timestamp: new Date()
        });
      }
    }, 5000); // Every 5 seconds
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Utility methods for specific data types
  subscribeToMarketData(callback: (data: MarketDataUpdate) => void): void {
    this.subscribe('market_data', callback);
  }

  subscribeToPortfolioUpdates(callback: (data: PortfolioUpdate) => void): void {
    this.subscribe('portfolio_update', callback);
  }

  subscribeToTransactionUpdates(callback: (data: TransactionUpdate) => void): void {
    this.subscribe('transaction_status', callback);
  }

  subscribeToPriceUpdates(callback: (data: any) => void): void {
    this.subscribe('price_update', callback);
  }
}

export const websocketService = new WebSocketService();