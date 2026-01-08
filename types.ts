export interface Inspiration {
  id: string;
  title: string;
  content: string;
  position: [number, number, number];
  timestamp: number;
  clusterId: number; // Index of the galaxy it belongs to
  type: 'text' | 'voice' | 'image';
  mediaData?: string; // Base64 string for image or audio (visual representation)
  audioData?: string; // Specific field to store the actual audio recording for playback
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  EXPLORING = 'EXPLORING'
}
