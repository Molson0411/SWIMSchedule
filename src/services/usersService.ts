import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export const usersService = {
  subscribeToUsers: (callback: (users: UserProfile[]) => void, onError?: (error: Error) => void) => {
    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((userDoc) => {
          const data = userDoc.data() as Partial<UserProfile>;
          return {
            ...data,
            uid: data.uid || userDoc.id,
          } as UserProfile;
        });
        callback(users);
      },
      (error) => {
        console.error('Failed to subscribe to users:', error);
        onError?.(error);
      },
    );
  },

  updateUserRole: async (uid: string, role: 'Coach' | 'Admin') => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
  }
};
