import { api, getApiBaseUrl, getStoredToken } from '@/lib/api';
import type {
  ChatMessage,
  StaffWorkspaceData,
  StaffProfileDetail,
  ChannelType,
  WebSocketEvent,
} from '@/types/chat';

class ChatSocketManager {
  private socket: WebSocket | null = null;
  private listeners: Set<(event: WebSocketEvent) => void> = new Set();
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private isExplicitlyClosed = false;

  private getWsUrl(): string {
    const httpUrl = getApiBaseUrl();
    const wsBase = httpUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    const token = getStoredToken() || '';
    return `${wsBase}/chat/ws?token=${encodeURIComponent(token)}`;
  }

  public connect(): void {
    const token = getStoredToken();
    if (!token) return;

    this.isExplicitlyClosed = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = this.getWsUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        // Start heartbeat ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('Error in chat WS listener', err);
            }
          });
        } catch (err) {
          console.error('Error parsing chat WS message', err);
        }
      };

      this.socket.onclose = (event) => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.socket = null;

        if (!this.isExplicitlyClosed && event.code !== 1008) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = window.setTimeout(() => {
            this.connect();
          }, 3000);
        }
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (err) {
      console.error('Failed to initialize chat WebSocket', err);
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(listener: (event: WebSocketEvent) => void): () => void {
    this.listeners.add(listener);
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public send(payload: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}

export const chatSocket = new ChatSocketManager();

export const chatService = {
  // REST API Methods
  async getWorkspace(): Promise<StaffWorkspaceData> {
    const { data } = await api.get<StaffWorkspaceData>('/chat/workspace');
    return data;
  },

  async getMessages(params: {
    channel_type: ChannelType;
    department_id?: number | null;
    recipient_id?: number | null;
    limit?: number;
    offset?: number;
  }): Promise<ChatMessage[]> {
    const { data } = await api.get<ChatMessage[]>('/chat/messages', {
      params: {
        channel_type: params.channel_type,
        department_id: params.department_id || undefined,
        recipient_id: params.recipient_id || undefined,
        limit: params.limit || 100,
        offset: params.offset || 0,
      },
    });
    return data;
  },

  async sendMessage(payload: {
    channel_type: ChannelType;
    content: string;
    department_id?: number | null;
    recipient_id?: number | null;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_type?: string | null;
    attachment_size?: number | null;
  }): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>('/chat/messages', payload);
    return data;
  },

  async uploadAttachment(file: File): Promise<{
    attachment_url: string;
    attachment_name: string;
    attachment_type: 'image' | 'document';
    attachment_size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<{
      attachment_url: string;
      attachment_name: string;
      attachment_type: 'image' | 'document';
      attachment_size: number;
    }>('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async editMessage(messageId: number, content: string): Promise<ChatMessage> {
    const { data } = await api.put<ChatMessage>(`/chat/messages/${messageId}`, { content });
    return data;
  },

  async deleteMessage(messageId: number): Promise<ChatMessage> {
    const { data } = await api.delete<ChatMessage>(`/chat/messages/${messageId}`);
    return data;
  },

  async markAsRead(channelKey: string, lastMessageId: number): Promise<void> {
    if (!lastMessageId) return;
    await api.post('/chat/read', {
      channel_key: channelKey,
      last_message_id: lastMessageId,
    });
  },

  async getStaffProfile(userId: number): Promise<StaffProfileDetail> {
    const { data } = await api.get<StaffProfileDetail>(`/chat/staff/${userId}/profile`);
    return data;
  },

  sendTyping(channelKey: string, recipientId?: number): void {
    chatSocket.send({
      type: 'typing',
      channel_key: channelKey,
      recipient_id: recipientId,
    });
  },

  subscribeToEvents(listener: (event: WebSocketEvent) => void): () => void {
    return chatSocket.subscribe(listener);
  },

  connectSocket(): void {
    chatSocket.connect();
  },

  disconnectSocket(): void {
    chatSocket.disconnect();
  },
};
