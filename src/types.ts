export type UserRole = 'Coach' | 'Admin';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

export interface AvailabilityDay {
  day: number;
  label: string;
  isAvailable: boolean;
  slots: AvailabilityTimeSlot[];
}

export interface AvailabilityTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  availability?: AvailabilityDay[];
}

export type PoolType = '25m' | 'Small';
export type LessonType = '1:1' | '1:2' | '1:3' | 'Group';
export type LessonStatus = 'Pending' | 'Approved';

export interface Lesson {
  id: string;
  coachId: string;
  coachName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  poolType: PoolType;
  lessonType: LessonType;
  studentCount: number;
  studentNames: string;
  lane?: number; // 1-6 for 25m
  status: LessonStatus;
  checkedIn: boolean;
  checkInTime?: any; // Firestore Timestamp
  adminNote?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  active: boolean;
}

export interface CoachAvailability {
  coachId: string;
  slots: AvailabilitySlot[];
  updatedAt: any;
}
