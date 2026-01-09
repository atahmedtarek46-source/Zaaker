
export type YearLevel = 'أولى ثانوي' | 'تانية ثانوي' | 'تالتة ثانوي';
export type Branch = 'أدبي' | 'علمي علوم' | 'علمي رياضة' | 'عام (أولى ثانوي)';
export type ChatMode = 'study' | 'friend' | 'translate' | 'curriculum';
export type EmojiLevel = 'default' | 'less' | 'more';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  year: YearLevel;
  branch: Branch;
  governorate: string;
  administration: string;
  school: string;
  curriculumFiles: Record<string, FileData[]>;
  memories: string[];
  emojiPreference: EmojiLevel;
  lightEnglish: boolean;
  hasSeenWelcome: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ChatMessage[];
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  isActionable?: boolean;
  difficulty?: 1 | 2 | 3;
}

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64
}

// Added to support QuizMode component
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizSettings {
  count: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizState {
  isSettingUp: boolean;
  questions: QuizQuestion[];
  currentStep: number;
  answers: Record<number, string>;
  timeLeft: number | null;
  results: boolean;
}
