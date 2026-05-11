export type UserRole = 'mentor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any;
}

export type CourseHistoryType = 'Current' | 'Schedule' | 'Other' | 'Not enroled';

export interface Student {
  id: string;
  name: string;
  studentNumber?: string;
  phone?: string;
  courseHistory: CourseHistoryType | string;
  mentorId: string;
  status: string;
  lastContactDate?: any;
  notes?: string;
  createdAt: any;
}

export type ResponseType = 
  | 'Yes - Only emoji or thank you'
  | 'Yes - High impact conversation'
  | 'Yes - Moderately significant conversation'
  | 'No Response';

export type ContactType = 
  | 'Significant High Impact' 
  | 'Significant Moderately' 
  | 'Emoji' 
  | 'Emoji and Thank you' 
  | 'No Response';

export type MessageType = 'Follow up' | 'RA' | 'Video Call';

export interface Interaction {
  id: string;
  studentId: string;
  mentorId: string;
  week: number;
  date: any;
  typeContact?: ContactType;
  messages?: MessageType;
  responseType: ResponseType;
  content: string;
  chatHistory?: string;
  summary?: string;
}

export interface Template {
  id: string;
  mentorId: string;
  title: string;
  content: string;
}

export interface WeeklyReport {
  id: string;
  mentorId: string;
  week: number;
  summary: string;
  improvementPoints: string[];
  createdAt: any;
}
