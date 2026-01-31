// Shared Email type between backend and frontend
export interface Email {
  id: string;
  subject: string;
  body?: string;
  senderId?: string;
  createdAt?: string;
}
