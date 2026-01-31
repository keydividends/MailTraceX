// Shared event types
export interface OpenEvent {
  id: string;
  emailId: string;
  recipientId?: string;
  ip?: string;
  userAgent?: string;
  createdAt?: string;
}

export interface ClickEvent {
  id: string;
  emailId: string;
  url: string;
  createdAt?: string;
}
