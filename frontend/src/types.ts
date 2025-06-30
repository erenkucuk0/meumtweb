export interface Message {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
} 