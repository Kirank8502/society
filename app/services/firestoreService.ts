// Firestore service helpers
import {
    addDoc,
    arrayUnion,
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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
  notificationsLastSeenFriendRequestAt?: string;
  notificationsLastSeenBusinessAt?: string;
  notificationsLastSeenChatAt?: string;
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
  avatarUrl?: string;
  lastMessage: string;
  lastMessageSenderUid?: string;
  updatedAt?: string;
  time: string;
  unreadCount: number;
}

export interface FriendProfile {
  id: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
  location: string;
  profession: string;
  about: string;
  friendedAt: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  fromEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  caption: string;
  mediaUrl: string;
  mediaPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostMediaInput {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

export interface SupportRequestInput {
  type: 'query' | 'bug';
  subject: string;
  message: string;
}

type ChatDocument = {
  participants?: string[];
  participantNames?: Record<string, string>;
  chatName?: string;
  lastMessage?: string;
  lastMessageSenderUid?: string;
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

const isPermissionError = (error: unknown): boolean => {
  const code = (error as { code?: string })?.code;
  return code === 'permission-denied' || code === 'firestore/permission-denied';
};

const normalizePost = (postId: string, data: Record<string, unknown>): Post => {
  return {
    id: postId,
    authorUid: (data.authorUid as string) || '',
    authorName: (data.authorName as string) || 'Community Member',
    authorUsername: (data.authorUsername as string) || 'member',
    authorProfileImageUrl: (data.authorProfileImageUrl as string) || '',
    caption: (data.caption as string) || '',
    mediaUrl: (data.mediaUrl as string) || '',
    mediaPath: (data.mediaPath as string) || '',
    createdAt: (data.createdAt as string) || '',
    updatedAt: (data.updatedAt as string) || '',
  };
};

const getAuthenticatedUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in again before creating a post.');
  }

  await currentUser.reload();
  await currentUser.getIdToken(true);

  const refreshedUser = auth.currentUser;
  if (!refreshedUser) {
    throw new Error('Please sign in again before creating a post.');
  }

  return refreshedUser;
};

export const uploadPostMedia = async (authorUid: string, media: PostMediaInput): Promise<{ mediaUrl: string; mediaPath: string }> => {
  const currentUser = await getAuthenticatedUser();

  if (currentUser.uid !== authorUid) {
    throw new Error('Your sign-in state changed. Please sign in again before uploading post media.');
  }

  const fileExtension = media.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = media.mimeType || 'image/jpeg';
  const mediaPath = `post-media/${authorUid}/${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, mediaPath);

  const response = await fetch(media.uri);
  if (!response.ok) {
    throw new Error('Unable to read selected media file for upload.');
  }

  const mediaBlob = await response.blob();
  await uploadBytes(storageRef, mediaBlob, { contentType });

  const mediaUrl = await getDownloadURL(storageRef);
  return { mediaUrl, mediaPath };
};

export const createPost = async ({
  authorUid,
  authorName,
  authorUsername,
  authorProfileImageUrl,
  caption,
  media,
}: {
  authorUid: string;
  authorName: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  caption: string;
  media?: PostMediaInput | null;
}): Promise<Post> => {
  try {
    const currentUser = await getAuthenticatedUser();

    if (currentUser.uid !== authorUid) {
      throw new Error('Your sign-in state changed. Please sign in again before creating a post.');
    }

    const now = new Date().toISOString();
    const uploadedMedia = media ? await uploadPostMedia(authorUid, media) : { mediaUrl: '', mediaPath: '' };

    const postRef = await addDoc(collection(db, 'posts'), {
      authorUid: currentUser.uid,
      authorName,
      authorUsername,
      authorProfileImageUrl,
      caption,
      mediaUrl: uploadedMedia.mediaUrl,
      mediaPath: uploadedMedia.mediaPath,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: postRef.id,
      authorUid: currentUser.uid,
      authorName,
      authorUsername,
      authorProfileImageUrl,
      caption,
      mediaUrl: uploadedMedia.mediaUrl,
      mediaPath: uploadedMedia.mediaPath,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const getPosts = async (): Promise<Post[]> => {
  try {
    const snapshot = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((postDoc) => normalizePost(postDoc.id, postDoc.data()));
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Posts not accessible with current Firestore rules.');
      return [];
    }

    console.error('Error fetching posts:', error);
    throw error;
  }
};

export const subscribePosts = (
  onUpdate: (posts: Post[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    postsQuery,
    (querySnapshot) => {
      const posts = querySnapshot.docs.map((postDoc) => normalizePost(postDoc.id, postDoc.data()));
      onUpdate(posts);
    },
    (error) => {
      console.error('Error subscribing to posts:', error);
      if (onError) {
        onError(error);
      }
    }
  );
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

export const addFriendConnection = async (
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<void> => {
  if (currentUser.id === targetUser.id) {
    return;
  }

  try {
    const currentUserRef = doc(db, 'users', currentUser.id);
    await setDoc(
      currentUserRef,
      {
        friendIds: arrayUnion(targetUser.id),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

export const sendFriendRequest = async (
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<void> => {
  if (currentUser.id === targetUser.id) {
    return;
  }

  try {
    const now = new Date().toISOString();
    const requestId = `${currentUser.id}_${targetUser.id}`;
    await setDoc(
      doc(db, 'friend_requests', requestId),
      {
        fromUid: currentUser.id,
        toUid: targetUser.id,
        fromName: currentUser.fullName || 'Community Member',
        fromEmail: currentUser.email || '',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'users', currentUser.id),
      {
        outgoingRequestIds: arrayUnion(targetUser.id),
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

export const getIncomingFriendRequests = async (userUid: string): Promise<FriendRequest[]> => {
  try {
    const requestSnapshot = await getDocs(
      query(
        collection(db, 'friend_requests'),
        where('toUid', '==', userUid),
        where('status', '==', 'pending')
      )
    );

    return requestSnapshot.docs
      .map((requestDoc) => {
        const data = requestDoc.data();
        return {
          id: requestDoc.id,
          fromUid: (data.fromUid as string) || '',
          toUid: (data.toUid as string) || '',
          fromName: (data.fromName as string) || 'Community Member',
          fromEmail: (data.fromEmail as string) || '',
          status: ((data.status as 'pending' | 'accepted' | 'rejected') || 'pending'),
          createdAt: (data.createdAt as string) || '',
          updatedAt: (data.updatedAt as string) || '',
        } as FriendRequest;
      })
      .sort((firstRequest, secondRequest) => {
        return new Date(secondRequest.createdAt || 0).getTime() - new Date(firstRequest.createdAt || 0).getTime();
      });
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Incoming friend requests not accessible with current Firestore rules.');
      return [];
    }

    console.error('Error fetching friend requests:', error);
    throw error;
  }
};

export const getOutgoingFriendRequestUserIds = async (userUid: string): Promise<string[]> => {
  try {
    const requestSnapshot = await getDocs(
      query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', userUid),
        where('status', '==', 'pending')
      )
    );

    const outgoingRequestIds = requestSnapshot.docs
      .map((requestDoc) => requestDoc.data().toUid as string)
      .filter((toUid) => typeof toUid === 'string' && toUid.length > 0);

    return Array.from(new Set(outgoingRequestIds));
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Outgoing friend requests not accessible with current Firestore rules.');
      return [];
    }

    console.error('Error fetching outgoing friend requests:', error);
    throw error;
  }
};

export const acceptFriendRequest = async (request: FriendRequest): Promise<void> => {
  try {
    const now = new Date().toISOString();

    await setDoc(
      doc(db, 'users', request.toUid),
      {
        friendIds: arrayUnion(request.fromUid),
        updatedAt: now,
      },
      { merge: true }
    );

    await updateDoc(doc(db, 'friend_requests', request.id), {
      status: 'accepted',
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'friend_requests', requestId), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

export const getUserFriends = async (userUid: string): Promise<FriendProfile[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userUid));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as { friendIds?: string[] };
    const friendIdsFromProfile = Array.isArray(userData.friendIds) ? userData.friendIds : [];

    // Include users whose outgoing request from this user has been accepted.
    // This keeps sender-side friend state accurate even if friendIds is not mirrored yet.
    const acceptedOutgoingRequests = await getDocs(
      query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', userUid),
        where('status', '==', 'accepted')
      )
    );

    const acceptedFriendIds = acceptedOutgoingRequests.docs
      .map((requestDoc) => requestDoc.data().toUid as string)
      .filter((toUid) => typeof toUid === 'string' && toUid.length > 0);

    const friendIds = Array.from(new Set([...friendIdsFromProfile, ...acceptedFriendIds]));
    if (friendIds.length === 0) {
      return [];
    }

    const allUsers = await getAllUsers();
    return allUsers
      .filter((user) => friendIds.includes(user.id))
      .map((user) => {
        return {
          id: user.id,
          email: user.email || '',
          fullName: user.fullName || 'Community Member',
          profileImageUrl: user.profileImageUrl || '',
          location: user.location || '',
          profession: user.profession || '',
          about: user.about || '',
          friendedAt: '',
        } as FriendProfile;
      });
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn('Friends list not accessible with current Firestore rules.');
      return [];
    }

    console.error('Error fetching friends:', error);
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
        lastMessageSenderUid: senderUid,
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
            const otherParticipantProfile = otherParticipantUid
              ? await getUserProfile(otherParticipantUid)
              : null;

            const participantNames = chatData.participantNames || {};
            const isDirectChat = participantIds.length === 2;
            const directChatName =
              otherParticipantProfile?.fullName ||
              (otherParticipantUid ? participantNames[otherParticipantUid] : undefined) ||
              '';
            const chatName = isDirectChat ? directChatName || 'Chat' : chatData.chatName || 'Chat';

            let lastMessageText = chatData.lastMessage || '';
            let lastMessageSenderUid = chatData.lastMessageSenderUid || '';
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
                lastMessageSenderUid = latestMessageData.senderUid || '';
                updatedAt = latestMessageData.timestamp || updatedAt;
              }
            }

            return {
              id: chatDoc.id,
              name: chatName,
              avatarUrl: otherParticipantProfile?.profileImageUrl || '',
              lastMessage: lastMessageText || 'Start your conversation here.',
              lastMessageSenderUid,
              time: formatRelativeTime(updatedAt),
              unreadCount: 0,
              updatedAt,
            } as ChatPreview;
          })
        );

        previews.sort((firstChat, secondChat) => {
          const firstTime = firstChat.updatedAt ? new Date(firstChat.updatedAt).getTime() : 0;
          const secondTime = secondChat.updatedAt ? new Date(secondChat.updatedAt).getTime() : 0;
          return secondTime - firstTime;
        });

        onUpdate(previews);
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

export const submitSupportRequest = async ({
  type,
  subject,
  message,
}: SupportRequestInput): Promise<void> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Please sign in again before sending support request.');
  }

  const now = new Date().toISOString();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  if (!trimmedSubject || !trimmedMessage) {
    throw new Error('Subject and message are required.');
  }

  try {
    await addDoc(collection(db, 'support_requests'), {
      type,
      subject: trimmedSubject,
      message: trimmedMessage,
      fromUid: currentUser.uid,
      fromEmail: currentUser.email || '',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    const errorCode = (error as { code?: string })?.code;
    const isPermissionDenied = errorCode === 'permission-denied' || errorCode === 'firestore/permission-denied';

    if (!isPermissionDenied) {
      console.error('Error submitting support request:', error);
      throw error;
    }

    // Fallback path for projects where support_requests rules are not deployed yet.
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          supportRequests: arrayUnion({
            type,
            subject: trimmedSubject,
            message: trimmedMessage,
            fromUid: currentUser.uid,
            fromEmail: currentUser.email || '',
            status: 'open',
            createdAt: now,
            updatedAt: now,
          }),
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (fallbackError) {
      console.error('Error submitting support request with fallback:', fallbackError);
      throw fallbackError;
    }
  }
};
