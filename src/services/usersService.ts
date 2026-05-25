import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export const usersService = {
  subscribeToUsers: (callback: (users: UserProfile[]) => void) => {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      callback(users);
    });
  },

  updateUserRole: async (uid: string, role: 'Coach' | 'Admin') => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
  }
};
