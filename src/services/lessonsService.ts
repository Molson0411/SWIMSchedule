import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lesson, OperationType } from '../types';

export enum FirestoreOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

function normalizeFirestoreError(error: unknown, operationType: FirestoreOperation, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

function handleFirestoreError(error: unknown, operationType: FirestoreOperation, path: string): never {
  throw normalizeFirestoreError(error, operationType, path);
}

function removeUndefinedFields<T extends Record<string, any>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasTimeOverlap(
  newStartTime: string,
  newEndTime: string,
  existingStartTime: string,
  existingEndTime: string
) {
  const newStart = timeToMinutes(newStartTime);
  const newEnd = timeToMinutes(newEndTime);
  const existingStart = timeToMinutes(existingStartTime);
  const existingEnd = timeToMinutes(existingEndTime);

  return newStart < existingEnd && newEnd > existingStart;
}

export const lessonsService = {
  subscribeToLessons: (
    date: string,
    callback: (lessons: Lesson[]) => void,
    onError?: (error: Error) => void,
  ) => {
    const q = query(
      collection(db, 'lessons'),
      where('date', '==', date),
      orderBy('startTime', 'asc')
    );

    return onSnapshot(q, 
      (snapshot) => {
        const lessons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lesson[];
        callback(lessons);
      },
      (error) => onError?.(normalizeFirestoreError(error, FirestoreOperation.LIST, 'lessons'))
    );
  },

  subscribeToDateRange: (startDate: string, endDate: string, callback: (lessons: Lesson[]) => void) => {
    const q = query(
      collection(db, 'lessons'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );

    return onSnapshot(q, 
      (snapshot) => {
        const lessons = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lesson[];
        callback(lessons);
      },
      (error) => handleFirestoreError(error, FirestoreOperation.LIST, 'lessons')
    );
  },

  checkTimeConflict: async ({
    coachId,
    date,
    startTime,
    endTime,
    excludeLessonId,
  }: {
    coachId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeLessonId?: string;
  }) => {
    try {
      const q = query(
        collection(db, 'lessons'),
        where('coachId', '==', coachId),
        where('date', '==', date)
      );

      const snapshot = await getDocs(q);
      const existingLessons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Lesson[];

      return existingLessons.some((lesson) => {
        if (excludeLessonId && lesson.id === excludeLessonId) return false;
        return hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime);
      });
    } catch (error) {
      handleFirestoreError(error, FirestoreOperation.LIST, 'lessons');
    }
  },

  createLesson: async (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { id: _id, ...lessonWithoutId } = lesson as Partial<Lesson>;
      const lessonToCreate = removeUndefinedFields({
        ...lessonWithoutId,
        studentNames: lessonWithoutId.studentNames ?? '',
        adminNote: lessonWithoutId.adminNote ?? '',
        lane: lessonWithoutId.poolType === '25m' ? lessonWithoutId.lane : null,
      });

      await addDoc(collection(db, 'lessons'), {
        status: 'Pending',
        checkedIn: false,
        ...lessonToCreate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, FirestoreOperation.CREATE, 'lessons');
    }
  },

  updateLesson: async (id: string, data: Partial<Lesson>) => {
    try {
      const { id: _id, createdAt: _createdAt, ...dataWithoutManagedFields } = data;
      await updateDoc(doc(db, 'lessons', id), {
        ...removeUndefinedFields(dataWithoutManagedFields),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, FirestoreOperation.UPDATE, `lessons/${id}`);
    }
  },

  deleteLesson: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lessons', id));
    } catch (error) {
      handleFirestoreError(error, FirestoreOperation.DELETE, `lessons/${id}`);
    }
  }
};
