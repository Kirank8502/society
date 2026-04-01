// Authentication service helper
import {
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type AuthUser = User | null;

const isValidPassword = (value: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,10}$/.test(value);
};

// Register new user
export const registerUser = async (
  email: string,
  password: string,
  fullName: string
): Promise<User> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidPassword(password)) {
      const invalidPasswordError = new Error(
        'Password must be 6-10 characters and include uppercase, lowercase, number, and special character.'
      ) as Error & { code: string };
      invalidPasswordError.code = 'auth/invalid-password-format';
      throw invalidPasswordError;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: fullName });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: normalizedEmail,
      fullName,
      profileImageUrl: '',
      notificationsLastSeenFriendRequestAt: '',
      notificationsLastSeenBusinessAt: '',
      notificationsLastSeenChatAt: '',
      location: '',
      profession: '',
      about: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (email: string, password: string): Promise<User> => {
  const rawEmail = email.trim();
  const normalizedEmail = rawEmail.toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    return userCredential.user;
  } catch (error: any) {
    const errorCode = typeof error?.code === 'string' ? error.code : '';

    if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);

        if (signInMethods.length > 0) {
          const wrongPasswordError = new Error('Incorrect password.') as Error & { code: string };
          wrongPasswordError.code = 'auth/wrong-password';
          console.error('Login error:', wrongPasswordError);
          throw wrongPasswordError;
        }

        const invalidLoginError = new Error('Email or password is incorrect.') as Error & { code: string };
        invalidLoginError.code = 'auth/invalid-login';
        console.error('Login error:', invalidLoginError);
        throw invalidLoginError;
      } catch (methodLookupError: any) {
        // If lookup is unavailable (for example due to project auth settings),
        // fall back to a generic invalid-login error to avoid misleading messages.
        console.error('Login lookup warning:', methodLookupError);

        const invalidLoginError = new Error('Email or password is incorrect.') as Error & { code: string };
        invalidLoginError.code = 'auth/invalid-login';
        console.error('Login error:', invalidLoginError);
        throw invalidLoginError;
      }
    }

    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): AuthUser => {
  return auth.currentUser;
};
