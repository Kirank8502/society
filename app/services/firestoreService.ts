// Firestore service helpers
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    Unsubscribe,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  location: string;
  profession: string;
  about: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessListing {
  id: string;
  businessName: string;
  description: string;
  contactInfo: string;
  authorUid: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  timestamp: string;
}

export interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

type ChatDocument = {
  participants?: string[];
  participantNames?: Record<string, string>;
  chatName?: string;
  lastMessage?: string;
  updatedAt?: string;
};

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) {
    return '';
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (diffMs < 60 * 1000) {
    return 'now';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

// Users
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as UserProfile));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Businesses
export const createBusinessListing = async (
  businessName: string,
  description: string,
  contactInfo: string,
  authorUid: string,
  authorEmail: string
): Promise<BusinessListing> => {
  try {
    const docRef = await addDoc(collection(db, 'businesses'), {
      businessName,
      description,
      contactInfo,
      authorUid,
      authorEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return {
      id: docRef.id,
      businessName,
      description,
      contactInfo,
      authorUid,
      authorEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as BusinessListing;
  } catch (error) {
    console.error('Error creating business listing:', error);
    throw error;
  }
};

export const getBusinessListings = async (): Promise<BusinessListing[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'businesses'));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as BusinessListing));
  } catch (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }
};

// Messages
export const sendMessage = async (
  chatId: string,
  text: string,
  senderUid: string,
  senderName: string
) => {
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      senderUid,
      senderName,
      timestamp: new Date().toISOString(),
    });

    await setDoc(
      doc(db, 'chats', chatId),
      {
        lastMessage: text,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'))
    );
    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const subscribeMessages = (
  chatId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    messagesQuery,
    (querySnapshot) => {
      const messages = querySnapshot.docs.map(
        (messageDoc) =>
          ({
            id: messageDoc.id,
            ...messageDoc.data(),
          } as Message)
      );
      onUpdate(messages);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

export const subscribeChatPreviews = (
  userUid: string,
  onUpdate: (chats: ChatPreview[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', userUid));

  return onSnapshot(
    chatsQuery,
    async (querySnapshot) => {
      try {
        const previews = await Promise.all(
          querySnapshot.docs.map(async (chatDoc) => {
            const chatData = chatDoc.data() as ChatDocument;
            const participantIds = chatData.participants || [];
            const otherParticipantUid = participantIds.find((participantId) => participantId !== userUid);

            const participantNames = chatData.participantNames || {};
            const chatName =
              chatData.chatName ||
              (otherParticipantUid ? participantNames[otherParticipantUid] : undefined) ||
              'Chat';

            let lastMessageText = chatData.lastMessage || '';
            let updatedAt = chatData.updatedAt || '';

            if (!lastMessageText) {
              const latestMessageSnapshot = await getDocs(
                query(
                  collection(db, 'chats', chatDoc.id, 'messages'),
                  orderBy('timestamp', 'desc'),
                  limit(1)
                )
              );

              if (!latestMessageSnapshot.empty) {
                const latestMessageData = latestMessageSnapshot.docs[0].data() as Message;
                lastMessageText = latestMessageData.text || '';
                updatedAt = latestMessageData.timestamp || updatedAt;
              }
            }

            return {
              id: chatDoc.id,
              name: chatName,
              lastMessage: lastMessageText || 'Start your conversation here.',
              time: formatRelativeTime(updatedAt),
              unreadCount: 0,
              updatedAt,
            } as ChatPreview & { updatedAt?: string };
          })
        );

        previews.sort((firstChat, secondChat) => {
          const firstTime = firstChat.updatedAt ? new Date(firstChat.updatedAt).getTime() : 0;
          const secondTime = secondChat.updatedAt ? new Date(secondChat.updatedAt).getTime() : 0;
          return secondTime - firstTime;
        });

        onUpdate(
          previews.map(({ updatedAt: _updatedAt, ...chatPreview }) => chatPreview)
        );
      } catch (error) {
        console.error('Error preparing chat previews:', error);
        if (onError) {
          onError(error);
        }
      }
    },
    (error) => {
      console.error('Error subscribing to chat previews:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

export const createOrGetDirectChat = async (
  currentUserUid: string,
  currentUserName: string,
  targetUserUid: string,
  targetUserName: string
): Promise<{ chatId: string; chatName: string }> => {
  try {
    const sortedUids = [currentUserUid, targetUserUid].sort();
    const chatId = `direct_${sortedUids[0]}_${sortedUids[1]}`;
    const now = new Date().toISOString();

    await setDoc(
      doc(db, 'chats', chatId),
      {
        participants: [currentUserUid, targetUserUid],
        participantNames: {
          [currentUserUid]: currentUserName,
          [targetUserUid]: targetUserName,
        },
        chatName: targetUserName,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    return { chatId, chatName: targetUserName };
  } catch (error) {
    console.error('Error creating direct chat:', error);
    throw error;
  }
};
