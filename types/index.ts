export type RelationshipType = 'married' | 'engaged' | 'serious' | 'dating';

export type RelationshipStatus = 'pending' | 'verified' | 'ended';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
  role: UserRole;
  verifications: {
    phone: boolean;
    email: boolean;
    id: boolean;
  };
  createdAt: string;
}

export interface Relationship {
  id: string;
  userId: string;
  partnerName: string;
  partnerPhone: string;
  partnerUserId?: string;
  type: RelationshipType;
  status: RelationshipStatus;
  startDate: string;
  verifiedDate?: string;
  endDate?: string;
  privacyLevel: 'public' | 'private' | 'verified-only';
}

export interface RelationshipRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  relationshipType: RelationshipType;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface SearchResult {
  userId: string;
  fullName: string;
  profilePicture?: string;
  relationship?: {
    partnerName: string;
    type: RelationshipType;
    status: RelationshipStatus;
    startDate: string;
    verified: boolean;
  };
}

export type NotificationType = 'relationship_request' | 'cheating_alert' | 'relationship_verified' | 'relationship_ended';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'mixed';
  likes: string[];
  commentCount: number;
  createdAt: string;
}

export interface Reel {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  likes: string[];
  commentCount: number;
  viewCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  participantAvatars: (string | undefined)[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  type: 'banner' | 'card' | 'video';
  placement: 'feed' | 'reels' | 'messages' | 'all';
  active: boolean;
  impressions: number;
  clicks: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
