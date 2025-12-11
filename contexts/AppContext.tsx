import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { User, Relationship, RelationshipRequest, Post, Reel, Comment, Conversation, Message, Advertisement, Notification, CheatingAlert, Follow, Dispute, CoupleCertificate, Anniversary, ReportedContent, ReelComment, NotificationType } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session, RealtimeChannel } from '@supabase/supabase-js';

export const [AppContext, useApp] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipRequests, setRelationshipRequests] = useState<RelationshipRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cheatingAlerts, setCheatingAlerts] = useState<CheatingAlert[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [certificates, setCertificates] = useState<CoupleCertificate[]>([]);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [coupleLevel, setCoupleLevel] = useState<any>(null);
  const [reelComments, setReelComments] = useState<Record<string, ReelComment[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setSubscriptions] = useState<RealtimeChannel[]>([]);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadUserData(session.user.id);
    } else if (session === null) {
      // Session cleared (logout)
      setCurrentUser(null);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const initializeAuth = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading user data for:', userId);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code === 'PGRST116') {
        console.log('User not found in database. Creating user record...');
        await createUserRecord(userId);
        return;
      }

      if (userError) {
        console.error('User data error:', JSON.stringify(userError, null, 2));
        throw userError;
      }
      
      if (userData) {
        const user: User = {
          id: userData.id,
          fullName: userData.full_name,
          username: userData.username,
          email: userData.email,
          phoneNumber: userData.phone_number,
          profilePicture: userData.profile_picture,
          role: userData.role,
          verifications: {
            phone: userData.phone_verified,
            email: userData.email_verified,
            id: userData.id_verified,
          },
          createdAt: userData.created_at,
        };
        setCurrentUser(user);
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey(full_name, profile_picture)
        `)
        .or(`moderation_status.eq.approved,user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Deduplicate posts by ID (in case the OR query returns duplicates)
      const uniquePostsData = postsData ? Array.from(
        new Map(postsData.map((p: any) => [p.id, p])).values()
      ) : [];

      const { data: postLikesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id');

      if (uniquePostsData) {
        const formattedPosts: Post[] = uniquePostsData.map((p: any) => {
          const likes = postLikesData
            ?.filter((like: any) => like.post_id === p.id)
            .map((like: any) => like.user_id) || [];
          return {
            id: p.id,
            userId: p.user_id,
            userName: p.users.full_name,
            userAvatar: p.users.profile_picture,
            content: p.content,
            mediaUrls: p.media_urls || [],
            mediaType: p.media_type,
            likes,
            commentCount: p.comment_count,
            createdAt: p.created_at,
          };
        });
        setPosts(formattedPosts);
      }

      // Load reels: show approved reels or user's own reels (regardless of status)
      // Try 'status' column first (from migration), then try 'moderation_status', then show all
      let { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select(`
          *,
          users!reels_user_id_fkey(full_name, profile_picture)
        `)
        .or(`status.eq.approved,user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // If status column doesn't exist, try moderation_status
      if (reelsError) {
        const { data: reelsDataModStatus } = await supabase
          .from('reels')
          .select(`
            *,
            users!reels_user_id_fkey(full_name, profile_picture)
          `)
          .or(`moderation_status.eq.approved,user_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (reelsDataModStatus) {
          reelsData = reelsDataModStatus;
        } else {
          // If neither column exists, show all reels
          const { data: allReels } = await supabase
            .from('reels')
            .select(`
              *,
              users!reels_user_id_fkey(full_name, profile_picture)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
          reelsData = allReels;
        }
      }

      const { data: reelLikesData } = await supabase
        .from('reel_likes')
        .select('reel_id, user_id');

      if (reelsData) {
        const formattedReels: Reel[] = reelsData.map((r: any) => {
          const likes = reelLikesData
            ?.filter((like: any) => like.reel_id === r.id)
            .map((like: any) => like.user_id) || [];
          return {
            id: r.id,
            userId: r.user_id,
            userName: r.users.full_name,
            userAvatar: r.users.profile_picture,
            videoUrl: r.video_url,
            thumbnailUrl: r.thumbnail_url,
            caption: r.caption,
            likes,
            commentCount: r.comment_count,
            viewCount: r.view_count,
            createdAt: r.created_at,
          };
        });
        setReels(formattedReels);
      }

      const { data: adsData } = await supabase
        .from('advertisements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (adsData) {
        const formattedAds: Advertisement[] = adsData.map((ad: any) => ({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.image_url,
          linkUrl: ad.link_url,
          type: ad.type,
          placement: ad.placement,
          active: ad.active,
          impressions: ad.impressions,
          clicks: ad.clicks,
          createdBy: ad.created_by,
          createdAt: ad.created_at,
          updatedAt: ad.updated_at,
        }));
        setAdvertisements(formattedAds);
      }

      const { data: relationshipsData } = await supabase
        .from('relationships')
        .select('*')
        .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
        .in('status', ['pending', 'verified']);

      if (relationshipsData) {
        const formattedRelationships: Relationship[] = relationshipsData.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          partnerName: r.partner_name,
          partnerPhone: r.partner_phone,
          partnerUserId: r.partner_user_id,
          type: r.type,
          status: r.status,
          startDate: r.start_date,
          verifiedDate: r.verified_date,
          endDate: r.end_date,
          privacyLevel: r.privacy_level,
          partnerFacePhoto: r.partner_face_photo,
          partnerDateOfBirthMonth: r.partner_date_of_birth_month,
          partnerDateOfBirthYear: r.partner_date_of_birth_year,
          partnerCity: r.partner_city,
        }));
        setRelationships(formattedRelationships);
      }

      const { data: requestsData } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsData) {
        const formattedRequests: RelationshipRequest[] = requestsData.map((req: any) => ({
          id: req.id,
          fromUserId: req.from_user_id,
          fromUserName: req.from_user_name,
          toUserId: req.to_user_id,
          relationshipType: req.relationship_type,
          status: req.status,
          createdAt: req.created_at,
        }));
        setRelationshipRequests(formattedRequests);
      }

      const { data: conversationsData } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_users:participant_ids
        `)
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false });

      if (conversationsData && conversationsData.length > 0) {
        const formattedConversations: Conversation[] = await Promise.all(
          conversationsData.map(async (conv: any) => {
            const participantIds = conv.participant_ids;
            const { data: participantsData } = await supabase
              .from('users')
              .select('id, full_name, profile_picture')
              .in('id', participantIds);

            const participantNames = participantsData?.map((p: any) => p.full_name) || [];
            const participantAvatars = participantsData?.map((p: any) => p.profile_picture) || [];

            return {
              id: conv.id,
              participants: participantIds,
              participantNames,
              participantAvatars,
              lastMessage: conv.last_message || '',
              lastMessageAt: conv.last_message_at,
              unreadCount: 0,
            };
          })
        );
        setConversations(formattedConversations);

        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationsData.map((c: any) => c.id))
          .order('created_at', { ascending: true });

        if (messagesData) {
          const messagesByConversation: Record<string, Message[]> = {};
          messagesData.forEach((m: any) => {
            const message: Message = {
              id: m.id,
              conversationId: m.conversation_id,
              senderId: m.sender_id,
              receiverId: m.receiver_id,
              content: m.content,
              mediaUrl: m.media_url,
              read: m.read,
              createdAt: m.created_at,
            };
            if (!messagesByConversation[m.conversation_id]) {
              messagesByConversation[m.conversation_id] = [];
            }
            messagesByConversation[m.conversation_id].push(message);
          });
          setMessages(messagesByConversation);
        }
      }

      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey(full_name, profile_picture)
        `)
        .order('created_at', { ascending: true });

      if (commentsData) {
        const commentsByPost: Record<string, Comment[]> = {};
        commentsData.forEach((c: any) => {
          const comment: Comment = {
            id: c.id,
            postId: c.post_id,
            userId: c.user_id,
            userName: c.users.full_name,
            userAvatar: c.users.profile_picture,
            content: c.content,
            likes: [],
            createdAt: c.created_at,
          };
          if (!commentsByPost[c.post_id]) {
            commentsByPost[c.post_id] = [];
          }
          commentsByPost[c.post_id].push(comment);
        });
        setComments(commentsByPost);
      }

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsData) {
        const formattedNotifications: Notification[] = notificationsData.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          read: n.read,
          createdAt: n.created_at,
        }));
        setNotifications(formattedNotifications);
      }

      const { data: cheatingAlertsData } = await supabase
        .from('cheating_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cheatingAlertsData) {
        const formattedAlerts: CheatingAlert[] = cheatingAlertsData.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          partnerUserId: a.partner_user_id,
          alertType: a.alert_type,
          description: a.description,
          read: a.read,
          createdAt: a.created_at,
        }));
        setCheatingAlerts(formattedAlerts);
      }

      const { data: followsData } = await supabase
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

      if (followsData) {
        const formattedFollows: Follow[] = followsData.map((f: any) => ({
          id: f.id,
          followerId: f.follower_id,
          followingId: f.following_id,
          createdAt: f.created_at,
        }));
        setFollows(formattedFollows);
      }

      const { data: disputesData } = await supabase
        .from('disputes')
        .select('*')
        .eq('initiated_by', userId)
        .order('created_at', { ascending: false });

      if (disputesData) {
        const formattedDisputes: Dispute[] = disputesData.map((d: any) => ({
          id: d.id,
          relationshipId: d.relationship_id,
          initiatedBy: d.initiated_by,
          disputeType: d.dispute_type,
          description: d.description,
          status: d.status,
          resolution: d.resolution,
          autoResolveAt: d.auto_resolve_at,
          resolvedAt: d.resolved_at,
          resolvedBy: d.resolved_by,
          createdAt: d.created_at,
        }));
        setDisputes(formattedDisputes);
      }

      const { data: reelCommentsData } = await supabase
        .from('reel_comments')
        .select(`
          *,
          users!reel_comments_user_id_fkey(full_name, profile_picture)
        `)
        .order('created_at', { ascending: true });

      if (reelCommentsData) {
        const commentsByReel: Record<string, ReelComment[]> = {};
        reelCommentsData.forEach((c: any) => {
          const comment: ReelComment = {
            id: c.id,
            reelId: c.reel_id,
            userId: c.user_id,
            userName: c.users.full_name,
            userAvatar: c.users.profile_picture,
            content: c.content,
            likes: [],
            createdAt: c.created_at,
          };
          if (!commentsByReel[c.reel_id]) {
            commentsByReel[c.reel_id] = [];
          }
          commentsByReel[c.reel_id].push(comment);
        });
        setReelComments(commentsByReel);
      }

      setupRealtimeSubscriptions(userId);


    } catch (error: any) {
      console.error('Failed to load user data:', error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const createUserRecord = async (userId: string) => {
    try {
      if (!session?.user) {
        console.error('No session available to create user record');
        return;
      }

      console.log('Creating user record for:', userId);
      console.log('Session user data:', JSON.stringify(session.user, null, 2));

      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          phone_number: session.user.user_metadata?.phone_number || session.user.phone || '',
          role: session.user.email === 'nashiezw@gmail.com' ? 'super_admin' : 'user',
          phone_verified: false,
          email_verified: !!session.user.email_confirmed_at,
          id_verified: false,
        })
        .select()
        .single();

      if (insertError) {
        // Handle duplicate key error (user already exists)
        if (insertError.code === '23505') {
          console.log('User already exists (duplicate email or ID), loading existing user...');
          await loadUserData(userId);
          return;
        }
        
        // Handle RLS policy error
        if (insertError.code === '42501') {
          console.error('RLS policy error: User cannot insert their own record');
          console.error('Please run the supabase-fix-rls.sql script in your Supabase SQL editor');
          throw insertError;
        }
        
        // Log and throw other errors
        console.error('Failed to create user record:', JSON.stringify(insertError, null, 2));
        throw insertError;
      }

      console.log('User record created successfully:', insertData);
      await loadUserData(userId);
    } catch (error: any) {
      console.error('Create user record error:', error?.message || JSON.stringify(error));
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      return data.user;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (fullName: string, email: string, phoneNumber: string, password: string) => {
    try {
      console.log('Signing up user:', { fullName, email, phoneNumber });
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        console.error('No user returned from signup');
        throw new Error('No user returned');
      }

      console.log('Auth user created:', authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (!existingUser) {
          console.log('Creating user profile record...');
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              full_name: fullName,
              email,
              phone_number: phoneNumber,
              role: email === 'nashiezw@gmail.com' ? 'super_admin' : 'user',
              phone_verified: false,
              email_verified: false,
              id_verified: false,
            });

          if (profileError) {
            // Handle duplicate key error (user already exists)
            if (profileError.code === '23505') {
              console.log('User profile already exists, continuing...');
            } else if (profileError.code === '42501') {
              console.error('RLS policy error. Please run supabase-fix-rls.sql in your Supabase SQL editor');
              throw profileError;
            } else {
              console.error('Profile creation error:', JSON.stringify(profileError, null, 2));
              throw profileError;
            }
          } else {
            console.log('User profile created successfully');
          }
        } else {
          console.log('User profile already exists');
        }
      } catch (profileError: any) {
        console.log('Profile check/creation error (may be handled by trigger):', profileError);
      }

      return authData.user;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'committed://reset-password',
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: updates.fullName,
          phone_number: updates.phoneNumber,
          profile_picture: updates.profilePicture,
          phone_verified: updates.verifications?.phone,
          email_verified: updates.verifications?.email,
          id_verified: updates.verifications?.id,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
    }
  }, [currentUser]);

  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ) => {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
        });
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }, []);

  const refreshRelationships = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const { data: relationshipsData } = await supabase
        .from('relationships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},partner_user_id.eq.${currentUser.id}`)
        .in('status', ['pending', 'verified']);

      if (relationshipsData) {
        const formattedRelationships: Relationship[] = relationshipsData.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          partnerName: r.partner_name,
          partnerPhone: r.partner_phone,
          partnerUserId: r.partner_user_id,
          type: r.type,
          status: r.status,
          startDate: r.start_date,
          verifiedDate: r.verified_date,
          endDate: r.end_date,
          privacyLevel: r.privacy_level,
          partnerFacePhoto: r.partner_face_photo,
          partnerDateOfBirthMonth: r.partner_date_of_birth_month,
          partnerDateOfBirthYear: r.partner_date_of_birth_year,
          partnerCity: r.partner_city,
        }));
        setRelationships(formattedRelationships);
      }

      // Also refresh relationship requests
      const { data: requestsData } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('to_user_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsData) {
        const formattedRequests: RelationshipRequest[] = requestsData.map((req: any) => ({
          id: req.id,
          fromUserId: req.from_user_id,
          fromUserName: req.from_user_name,
          toUserId: req.to_user_id,
          relationshipType: req.relationship_type,
          status: req.status,
          createdAt: req.created_at,
        }));
        setRelationshipRequests(formattedRequests);
      }
    } catch (error) {
      console.error('Failed to refresh relationships:', error);
    }
  }, [currentUser]);

  const createRelationship = useCallback(async (
    partnerName: string,
    partnerPhone: string,
    type: Relationship['type'],
    partnerUserId?: string,
    partnerFacePhoto?: string,
    partnerDateOfBirthMonth?: number,
    partnerDateOfBirthYear?: number,
    partnerCity?: string
  ) => {
    if (!currentUser) return null;
    
    try {
      const { data: existingRelationships } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('status', ['pending', 'verified']);

      if (existingRelationships && existingRelationships.length > 0) {
        const existingRel = existingRelationships[0];
        if (existingRel.partner_user_id) {
          await supabase
            .from('cheating_alerts')
            .insert({
              user_id: existingRel.partner_user_id,
              partner_user_id: currentUser.id,
              alert_type: 'duplicate_registration',
              description: `${currentUser.fullName} attempted to register a new relationship while already in a ${existingRel.status} relationship.`,
            });

          await createNotification(
            existingRel.partner_user_id,
            'cheating_alert',
            'Suspicious Activity Detected',
            `${currentUser.fullName} attempted to register another relationship. Please review.`,
            { relationshipId: existingRel.id }
          );
        }
      }

      let partnerData = null;
      if (partnerUserId) {
        const { data } = await supabase
          .from('users')
          .select('id, phone_number')
          .eq('id', partnerUserId)
          .single();
        partnerData = data;
      } else {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('phone_number', partnerPhone)
          .single();
        partnerData = data;
      }

      if (partnerData) {
        const { data: partnerExistingRels } = await supabase
          .from('relationships')
          .select('*')
          .eq('user_id', partnerData.id)
          .in('status', ['pending', 'verified']);

        if (partnerExistingRels && partnerExistingRels.length > 0) {
          const partnerExistingRel = partnerExistingRels[0];
          if (partnerExistingRel.partner_user_id) {
            await supabase
              .from('cheating_alerts')
              .insert({
                user_id: partnerExistingRel.partner_user_id,
                partner_user_id: partnerData.id,
                alert_type: 'duplicate_registration',
                description: `${partnerName} was registered in a new relationship by ${currentUser.fullName} while already in a ${partnerExistingRel.status} relationship.`,
              });

            await createNotification(
              partnerExistingRel.partner_user_id,
              'cheating_alert',
              'Suspicious Activity Detected',
              `Someone attempted to register ${partnerName} in a new relationship. Please review.`,
              { relationshipId: partnerExistingRel.id }
            );
          }
        }
      }

      const { data: relationshipData, error: relError } = await supabase
        .from('relationships')
        .insert({
          user_id: currentUser.id,
          partner_name: partnerName,
          partner_phone: partnerPhone,
          partner_user_id: partnerData?.id,
          type,
          status: 'pending',
          privacy_level: 'public',
          partner_face_photo: partnerFacePhoto,
          partner_date_of_birth_month: partnerDateOfBirthMonth,
          partner_date_of_birth_year: partnerDateOfBirthYear,
          partner_city: partnerCity,
        })
        .select()
        .single();

      if (relError) throw relError;

      if (partnerData) {
        const { error: requestError } = await supabase
          .from('relationship_requests')
          .insert({
            from_user_id: currentUser.id,
            from_user_name: currentUser.fullName,
            to_user_id: partnerData.id,
            relationship_type: type,
            status: 'pending',
          });

        if (requestError) throw requestError;
      }

      const newRelationship: Relationship = {
        id: relationshipData.id,
        userId: currentUser.id,
        partnerName,
        partnerPhone,
        type,
        status: 'pending',
        startDate: relationshipData.start_date,
        privacyLevel: 'public',
        partnerFacePhoto: relationshipData.partner_face_photo,
        partnerDateOfBirthMonth: relationshipData.partner_date_of_birth_month,
        partnerDateOfBirthYear: relationshipData.partner_date_of_birth_year,
        partnerCity: relationshipData.partner_city,
      };

      // Store face embedding for face matching if face photo is provided
      if (partnerFacePhoto && relationshipData.id) {
        try {
          const { storeFaceEmbedding } = await import('@/lib/faceSearch');
          await storeFaceEmbedding(relationshipData.id, partnerFacePhoto);
        } catch (error) {
          // Don't fail relationship creation if face matching fails
          console.warn('Failed to store face embedding:', error);
        }
      }

      // Refresh relationships from database to get latest data
      await refreshRelationships();
      
      return newRelationship;
    } catch (error) {
      console.error('Create relationship error:', error);
      return null;
    }
  }, [currentUser, refreshRelationships, createNotification]);

  const acceptRelationshipRequest = useCallback(async (requestId: string) => {
    if (!currentUser) return;
    
    try {
      await supabase
        .from('relationship_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      const { data: request } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (request) {
        await supabase
          .from('relationships')
          .update({
            status: 'verified',
            verified_date: new Date().toISOString(),
            partner_user_id: currentUser.id,
          })
          .eq('user_id', request.from_user_id);
      }

      // Refresh relationships to get updated status
      await refreshRelationships();
    } catch (error) {
      console.error('Accept relationship request error:', error);
    }
  }, [currentUser, refreshRelationships]);

  const rejectRelationshipRequest = useCallback(async (requestId: string) => {
    try {
      await supabase
        .from('relationship_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      // Refresh relationships to update request list
      await refreshRelationships();
    } catch (error) {
      console.error('Reject relationship request error:', error);
    }
  }, [refreshRelationships]);

  const getCurrentUserRelationship = useCallback(() => {
    if (!currentUser) return null;
    return relationships.find(r => r.userId === currentUser.id && r.status !== 'ended');
  }, [currentUser, relationships]);

  const getUserRelationship = useCallback((userId: string) => {
    return relationships.find(r => r.userId === userId && r.status !== 'ended');
  }, [relationships]);

  const searchUsers = useCallback(async (query: string) => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    try {
      // Search registered users
      const { data: usersData, error: usersError } = await supabase.rpc('search_users', {
        search_query: lowerQuery,
      });

      if (usersError) throw usersError;

      // Get relationship info for all users
      const usersWithRelationships = await Promise.all(
        (usersData || []).map(async (u: any) => {
          // Get user's relationship
          const { data: userRel } = await supabase
            .from('relationships')
            .select('type, status, partner_name, partner_phone, partner_user_id, partner_face_photo')
            .eq('user_id', u.id)
            .in('status', ['pending', 'verified'])
            .limit(1)
            .single();

          return {
            id: u.id,
            fullName: u.full_name,
            username: u.username,
            email: u.email || '',
            phoneNumber: u.phone_number || '',
            profilePicture: u.profile_picture,
            role: u.role || 'user',
            isRegisteredUser: true,
            relationshipType: userRel?.type,
            relationshipStatus: userRel?.status,
            partnerName: userRel?.partner_name,
            partnerPhone: userRel?.partner_phone,
            partnerUserId: userRel?.partner_user_id,
            verifications: {
              phone: u.phone_verified || false,
              email: u.email_verified || false,
              id: u.id_verified || false,
            },
            createdAt: '',
          };
        })
      );

      // Search non-registered partners (people listed as partners but not registered)
      const { data: partnerData, error: partnerError } = await supabase
        .from('relationships')
        .select(`
          partner_name,
          partner_phone,
          partner_user_id,
          partner_face_photo,
          type,
          status,
          user_id,
          users!relationships_user_id_fkey(full_name, phone_number, profile_picture)
        `)
        .or(`partner_name.ilike.%${lowerQuery}%,partner_phone.ilike.%${lowerQuery}%`)
        .is('partner_user_id', null)
        .in('status', ['pending', 'verified'])
        .limit(20);

      if (!partnerError && partnerData) {
        const nonRegisteredPartners = partnerData.map((rel: any) => ({
          id: null,
          fullName: rel.partner_name,
          phoneNumber: rel.partner_phone,
          profilePicture: rel.partner_face_photo,
          isRegisteredUser: false,
          relationshipType: rel.type,
          relationshipStatus: rel.status,
          partnerName: rel.users?.full_name,
          partnerPhone: rel.users?.phone_number,
          partnerUserId: rel.user_id,
          verifications: {
            phone: false,
            email: false,
            id: false,
          },
          createdAt: '',
        }));

        // First, deduplicate non-registered partners themselves (same person might be in multiple relationships)
        // Prefer entries with relationship info (partnerName) and verified status
        const partnerMap = new Map<string, any>();
        for (const partner of nonRegisteredPartners) {
          const normalizedPhone = partner.phoneNumber?.toLowerCase().trim().replace(/\D/g, '') || '';
          const normalizedName = partner.fullName?.toLowerCase().trim() || '';
          const key = normalizedPhone || normalizedName;
          
          if (!key) continue; // Skip if no identifying info
          
          const existing = partnerMap.get(key);
          if (!existing) {
            partnerMap.set(key, partner);
          } else {
            // Priority: 1) Has partnerName (relationship info), 2) Verified status
            const hasPartnerName = !!partner.partnerName;
            const existingHasPartnerName = !!existing.partnerName;
            const isVerified = partner.relationshipStatus === 'verified';
            const existingIsVerified = existing.relationshipStatus === 'verified';
            
            // Prefer entry with partnerName if the other doesn't have it
            if (hasPartnerName && !existingHasPartnerName) {
              partnerMap.set(key, partner);
            } else if (!hasPartnerName && existingHasPartnerName) {
              // Keep existing
            } else if (isVerified && !existingIsVerified) {
              // Both have or both don't have partnerName, prefer verified
              partnerMap.set(key, partner);
            }
            // Otherwise keep existing
          }
        }
        const uniqueNonRegisteredPartners = Array.from(partnerMap.values());

        // Now deduplicate: if a person appears in both registered users and non-registered partners,
        // prefer the non-registered partner entry (as it shows relationship info)
        const nonRegisteredPhoneNumbers = new Set(
          uniqueNonRegisteredPartners.map((p: any) => p.phoneNumber?.toLowerCase().trim().replace(/\D/g, '')).filter(Boolean)
        );
        const nonRegisteredNames = new Set(
          uniqueNonRegisteredPartners.map((p: any) => p.fullName?.toLowerCase().trim()).filter(Boolean)
        );

        // Filter out registered users that match non-registered partners by phone or name
        // (prefer non-registered partner entries as they show relationship info)
        const uniqueRegisteredUsers = usersWithRelationships.filter((user: any) => {
          const userPhone = user.phoneNumber?.toLowerCase().trim().replace(/\D/g, '');
          const userName = user.fullName?.toLowerCase().trim();
          
          // Keep registered user only if they don't match any non-registered partner
          return !(userPhone && nonRegisteredPhoneNumbers.has(userPhone)) &&
                 !(userName && nonRegisteredNames.has(userName));
        });

        return [...uniqueRegisteredUsers, ...uniqueNonRegisteredPartners];
      }

      return usersWithRelationships;
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }, []);

  const searchByFace = useCallback(async (imageUri: string) => {
    try {
      // Import face search service
      const { searchByFace: faceSearch } = await import('@/lib/faceSearch');
      
      // Convert local URI to a format the service can use
      // For now, we'll pass the URI directly (in production, you might need to upload to storage first)
      const results = await faceSearch(imageUri);
      
      // Format results for display
      return results.map((match) => ({
        relationshipId: match.relationshipId,
        id: match.partnerUserId || null, // Partner's user ID if registered
        fullName: match.partnerName,
        phoneNumber: match.partnerPhone,
        profilePicture: match.facePhotoUrl,
        facePhotoUrl: match.facePhotoUrl, // Also include explicitly for face search results
        isRegisteredUser: !!match.partnerUserId,
        relationshipType: match.relationshipType,
        relationshipStatus: match.relationshipStatus,
        partnerName: match.userName, // The person they're in a relationship with
        partnerPhone: match.userPhone,
        partnerUserId: match.userId,
        similarityScore: match.similarityScore,
        verifications: {
          phone: false,
          email: false,
          id: false,
        },
      }));
    } catch (error) {
      console.error('Face search error:', error);
      return [];
    }
  }, []);

  const getPendingRequests = useCallback(() => {
    if (!currentUser) return [];
    return relationshipRequests.filter(
      r => r.toUserId === currentUser.id && r.status === 'pending'
    );
  }, [currentUser, relationshipRequests]);

  const createPost = useCallback(async (content: string, mediaUrls: string[], mediaType: Post['mediaType']) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          content,
          media_urls: mediaUrls,
          media_type: mediaType,
        })
        .select(`
          *,
          users!posts_user_id_fkey(full_name, profile_picture)
        `)
        .single();

      if (error) throw error;

      const newPost: Post = {
        id: data.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userAvatar: currentUser.profilePicture,
        content,
        mediaUrls,
        mediaType,
        likes: [],
        commentCount: 0,
        createdAt: data.created_at,
      };

      setPosts([newPost, ...posts]);
      return newPost;
    } catch (error) {
      console.error('Create post error:', error);
      return null;
    }
  }, [currentUser, posts]);

  const createReel = useCallback(async (videoUrl: string, caption: string, thumbnailUrl?: string) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('reels')
        .insert({
          user_id: currentUser.id,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          caption,
        })
        .select(`
          *,
          users!reels_user_id_fkey(full_name, profile_picture)
        `)
        .single();

      if (error) throw error;

      const newReel: Reel = {
        id: data.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userAvatar: currentUser.profilePicture,
        videoUrl,
        thumbnailUrl,
        caption,
        likes: [],
        commentCount: 0,
        viewCount: 0,
        createdAt: data.created_at,
      };

      setReels([newReel, ...reels]);
      return newReel;
    } catch (error) {
      console.error('Create reel error:', error);
      return null;
    }
  }, [currentUser, reels]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!currentUser) return;
    
    try {
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .single();

      const post = posts.find(p => p.id === postId);
      
      if (existingLike) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id,
          });
        
        // Send notification to post owner (if not liking own post)
        if (post && post.userId !== currentUser.id) {
          await createNotification(
            post.userId,
            'post_like',
            'New Like',
            `${currentUser.fullName} liked your post`,
            { postId, userId: currentUser.id }
          );
        }
      }

      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          const likes = existingLike
            ? post.likes.filter(id => id !== currentUser.id)
            : [...post.likes, currentUser.id];
          return { ...post, likes };
        }
        return post;
      });
      
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Toggle like error:', error);
    }
  }, [currentUser, posts, createNotification]);

  const toggleReelLike = useCallback(async (reelId: string) => {
    if (!currentUser) return;
    
    try {
      const { data: existingLike } = await supabase
        .from('reel_likes')
        .select('id')
        .eq('reel_id', reelId)
        .eq('user_id', currentUser.id)
        .single();

      const reel = reels.find(r => r.id === reelId);
      
      if (existingLike) {
        await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('reel_likes')
          .insert({
            reel_id: reelId,
            user_id: currentUser.id,
          });
        
        // Send notification to reel owner (if not liking own reel)
        if (reel && reel.userId !== currentUser.id) {
          await createNotification(
            reel.userId,
            'post_like', // Using post_like type for reel likes too
            'New Like',
            `${currentUser.fullName} liked your reel`,
            { reelId, userId: currentUser.id }
          );
        }
      }

      const updatedReels = reels.map(reel => {
        if (reel.id === reelId) {
          const likes = existingLike
            ? reel.likes.filter(id => id !== currentUser.id)
            : [...reel.likes, currentUser.id];
          return { ...reel, likes };
        }
        return reel;
      });
      
      setReels(updatedReels);
    } catch (error) {
      console.error('Toggle reel like error:', error);
    }
  }, [currentUser, reels, createNotification]);

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      const newComment: Comment = {
        id: data.id,
        postId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userAvatar: currentUser.profilePicture,
        content,
        likes: [],
        createdAt: data.created_at,
      };
      
      const updatedComments = {
        ...comments,
        [postId]: [...(comments[postId] || []), newComment],
      };
      setComments(updatedComments);
      
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          // Send notification to post owner (if not commenting on own post)
          if (post.userId !== currentUser.id) {
            createNotification(
              post.userId,
              'post_comment',
              'New Comment',
              `${currentUser.fullName} commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
              { postId, commentId: data.id, userId: currentUser.id }
            );
          }
          return { ...post, commentCount: post.commentCount + 1 };
        }
        return post;
      });
      setPosts(updatedPosts);
      
      return newComment;
    } catch (error) {
      console.error('Add comment error:', error);
      return null;
    }
  }, [currentUser, comments, posts, createNotification]);

  const sendMessage = useCallback(async (conversationId: string, receiverId: string, content: string) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: Message = {
        id: data.id,
        conversationId,
        senderId: currentUser.id,
        receiverId,
        content,
        read: false,
        createdAt: data.created_at,
      };
      
      const updatedMessages = {
        ...messages,
        [conversationId]: [...(messages[conversationId] || []), newMessage],
      };
      setMessages(updatedMessages);
      
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
      
      // Send notification to receiver
      await createNotification(
        receiverId,
        'message',
        'New Message',
        `${currentUser.fullName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        { conversationId, senderId: currentUser.id }
      );
      
      return newMessage;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  }, [currentUser, messages, createNotification]);

  const getConversation = useCallback((conversationId: string) => {
    return conversations.find(c => c.id === conversationId);
  }, [conversations]);

  const getMessages = useCallback((conversationId: string) => {
    return messages[conversationId] || [];
  }, [messages]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!currentUser) return false;
    
    try {
      // Delete all messages in the conversation
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete the conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      // Update local state
      setConversations(conversations.filter(c => c.id !== conversationId));
      const updatedMessages = { ...messages };
      delete updatedMessages[conversationId];
      setMessages(updatedMessages);

      return true;
    } catch (error) {
      console.error('Delete conversation error:', error);
      return false;
    }
  }, [currentUser, conversations, messages]);

  const deleteMessage = useCallback(async (messageId: string, conversationId: string) => {
    if (!currentUser) return false;
    
    try {
      // Check if user owns the message
      const conversationMessages = messages[conversationId] || [];
      const message = conversationMessages.find(m => m.id === messageId);
      
      if (!message || message.senderId !== currentUser.id) {
        return false; // Can only delete own messages
      }

      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      // Update local state
      const updatedMessages = {
        ...messages,
        [conversationId]: conversationMessages.filter(m => m.id !== messageId),
      };
      setMessages(updatedMessages);

      return true;
    } catch (error) {
      console.error('Delete message error:', error);
      return false;
    }
  }, [currentUser, messages]);

  const createOrGetConversation = useCallback(async (otherUserId: string) => {
    if (!currentUser) return null;
    
    try {
      // Check if a conversation already exists between these two users
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUser.id, otherUserId])
        .limit(1);

      // Filter to ensure both participants are in the conversation
      const existingConv = existingConversations?.find((conv: any) => {
        const participants = conv.participant_ids || [];
        return participants.includes(currentUser.id) && participants.includes(otherUserId) && participants.length === 2;
      });

      if (existingConv) {
        // Conversation exists, return it
        const { data: participantsData } = await supabase
          .from('users')
          .select('id, full_name, profile_picture')
          .in('id', existingConv.participant_ids);

        const participantNames = participantsData?.map((p: any) => p.full_name) || [];
        const participantAvatars = participantsData?.map((p: any) => p.profile_picture) || [];

        const conversation: Conversation = {
          id: existingConv.id,
          participants: existingConv.participant_ids,
          participantNames,
          participantAvatars,
          lastMessage: existingConv.last_message || '',
          lastMessageAt: existingConv.last_message_at,
          unreadCount: 0,
        };

        // Add to conversations if not already there
        const isAlreadyInList = conversations.some(c => c.id === conversation.id);
        if (!isAlreadyInList) {
          setConversations([conversation, ...conversations]);
        }

        return conversation;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [currentUser.id, otherUserId],
        })
        .select()
        .single();

      if (error) throw error;

      // Get participant data
      const { data: participantsData } = await supabase
        .from('users')
        .select('id, full_name, profile_picture')
        .in('id', [currentUser.id, otherUserId]);

      const participantNames = participantsData?.map((p: any) => p.full_name) || [];
      const participantAvatars = participantsData?.map((p: any) => p.profile_picture) || [];

      const conversation: Conversation = {
        id: newConversation.id,
        participants: newConversation.participant_ids,
        participantNames,
        participantAvatars,
        lastMessage: '',
        lastMessageAt: newConversation.created_at,
        unreadCount: 0,
      };

      // Add to conversations list
      setConversations([conversation, ...conversations]);

      return conversation;
    } catch (error) {
      console.error('Create or get conversation error:', error);
      return null;
    }
  }, [currentUser, conversations]);

  const getComments = useCallback((postId: string) => {
    return comments[postId] || [];
  }, [comments]);

  const createAdvertisement = useCallback(async (adData: Omit<Advertisement, 'id' | 'impressions' | 'clicks' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) return null;
    
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .insert({
          title: adData.title,
          description: adData.description,
          image_url: adData.imageUrl,
          link_url: adData.linkUrl,
          type: adData.type,
          placement: adData.placement,
          active: adData.active,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newAd: Advertisement = {
        id: data.id,
        title: data.title,
        description: data.description,
        imageUrl: data.image_url,
        linkUrl: data.link_url,
        type: data.type,
        placement: data.placement,
        active: data.active,
        impressions: data.impressions,
        clicks: data.clicks,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setAdvertisements([newAd, ...advertisements]);
      return newAd;
    } catch (error) {
      console.error('Create advertisement error:', error);
      return null;
    }
  }, [currentUser, advertisements]);

  const updateAdvertisement = useCallback(async (adId: string, updates: Partial<Advertisement>) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) return;
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({
          title: updates.title,
          description: updates.description,
          image_url: updates.imageUrl,
          link_url: updates.linkUrl,
          active: updates.active,
        })
        .eq('id', adId);

      if (error) throw error;

      const updatedAds = advertisements.map(ad => 
        ad.id === adId ? { ...ad, ...updates, updatedAt: new Date().toISOString() } : ad
      );
      setAdvertisements(updatedAds);
    } catch (error) {
      console.error('Update advertisement error:', error);
    }
  }, [currentUser, advertisements]);

  const deleteAdvertisement = useCallback(async (adId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) return;
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      const updatedAds = advertisements.filter(ad => ad.id !== adId);
      setAdvertisements(updatedAds);
    } catch (error) {
      console.error('Delete advertisement error:', error);
    }
  }, [currentUser, advertisements]);

  const recordAdImpression = useCallback(async (adId: string) => {
    try {
      if (currentUser) {
        await supabase
          .from('advertisement_impressions')
          .insert({
            advertisement_id: adId,
            user_id: currentUser.id,
          });
      }
    } catch (error) {
      console.error('Record ad impression error:', error);
    }
  }, [currentUser]);

  const recordAdClick = useCallback(async (adId: string) => {
    try {
      if (currentUser) {
        await supabase
          .from('advertisement_clicks')
          .insert({
            advertisement_id: adId,
            user_id: currentUser.id,
          });
      }
    } catch (error) {
      console.error('Record ad click error:', error);
    }
  }, [currentUser]);

  const getActiveAds = useCallback((placement: Advertisement['placement']) => {
    return advertisements.filter(ad => 
      ad.active && (ad.placement === placement || ad.placement === 'all')
    );
  }, [advertisements]);

  /**
   * Feed Algorithm: Prioritizes posts from followed users
   * Algorithm:
   * 1. Posts from followed users get highest priority
   * 2. Within each group, sort by engagement score (likes + comments * 2)
   * 3. Then by recency (newer posts first)
   * 4. Falls back to other posts if not enough followed posts
   */
  const getPersonalizedFeed = useCallback((allPosts: Post[], limit: number = 50): Post[] => {
    if (!currentUser || !follows.length) {
      // If no follows, return posts sorted by engagement and recency
      return allPosts
        .sort((a, b) => {
          const engagementA = a.likes.length + (a.commentCount * 2);
          const engagementB = b.likes.length + (b.commentCount * 2);
          if (engagementB !== engagementA) {
            return engagementB - engagementA;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, limit);
    }

    // Get list of user IDs the current user follows
    const followingIds = new Set(
      follows
        .filter(f => f.followerId === currentUser.id)
        .map(f => f.followingId)
    );

    // Separate posts into followed and non-followed
    const followedPosts: Post[] = [];
    const otherPosts: Post[] = [];

    allPosts.forEach(post => {
      if (followingIds.has(post.userId)) {
        followedPosts.push(post);
      } else {
        otherPosts.push(post);
      }
    });

    // Calculate engagement score for sorting
    const getEngagementScore = (post: Post) => {
      return post.likes.length + (post.commentCount * 2);
    };

    // Sort both groups by engagement, then recency
    const sortByEngagement = (a: Post, b: Post) => {
      const engagementA = getEngagementScore(a);
      const engagementB = getEngagementScore(b);
      if (engagementB !== engagementA) {
        return engagementB - engagementA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    followedPosts.sort(sortByEngagement);
    otherPosts.sort(sortByEngagement);

    // Combine: followed posts first, then other posts
    // Mix in some other posts to keep feed diverse (every 3rd post from others)
    const personalizedFeed: Post[] = [];
    let followedIndex = 0;
    let otherIndex = 0;
    let postCount = 0;

    while (postCount < limit && (followedIndex < followedPosts.length || otherIndex < otherPosts.length)) {
      // Prioritize followed posts, but mix in others every 3rd position
      if (followedIndex < followedPosts.length && (postCount % 3 !== 2 || otherIndex >= otherPosts.length)) {
        personalizedFeed.push(followedPosts[followedIndex]);
        followedIndex++;
      } else if (otherIndex < otherPosts.length) {
        personalizedFeed.push(otherPosts[otherIndex]);
        otherIndex++;
      } else {
        break;
      }
      postCount++;
    }

    return personalizedFeed;
  }, [currentUser, follows]);

  /**
   * Smart Advertisement Algorithm
   * Features:
   * 1. Admin ads: Rotate for everyone, track views to avoid repetition
   * 2. Regular ads: Personalize based on user engagement/interests
   * 3. Avoids showing same ad too frequently to same user
   */
  const getSmartAds = useCallback(async (
    placement: Advertisement['placement'],
    excludeAdIds: string[] = [],
    limit: number = 10
  ): Promise<Advertisement[]> => {
    if (!currentUser) {
      return getActiveAds(placement).slice(0, limit);
    }

    try {
      const allAds = getActiveAds(placement);
      
      // Separate admin ads from regular ads
      const adminAds: Advertisement[] = [];
      const regularAds: Advertisement[] = [];

      // Check which users are admins
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin', 'moderator']);

      const adminUserIds = new Set(adminUsers?.map(u => u.id) || []);

      allAds.forEach(ad => {
        if (adminUserIds.has(ad.createdBy)) {
          adminAds.push(ad);
        } else {
          regularAds.push(ad);
        }
      });

      // Get user's ad impression history (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: recentImpressions } = await supabase
        .from('advertisement_impressions')
        .select('advertisement_id, created_at')
        .eq('user_id', currentUser.id)
        .gte('created_at', oneDayAgo.toISOString());

      const impressionCounts = new Map<string, number>();
      recentImpressions?.forEach(imp => {
        const count = impressionCounts.get(imp.advertisement_id) || 0;
        impressionCounts.set(imp.advertisement_id, count + 1);
      });

      // Get user's engagement data for personalization
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id)
        .limit(100);

      const { data: userComments } = await supabase
        .from('comments')
        .select('post_id')
        .eq('user_id', currentUser.id)
        .limit(100);

      // Get posts user engaged with to understand interests
      const engagedPostIds = new Set([
        ...(userLikes?.map(l => l.post_id) || []),
        ...(userComments?.map(c => c.post_id) || [])
      ]);

      // Score regular ads based on personalization factors
      // Rotation: Ads shown recently get lower scores but are NOT excluded
      // This ensures natural rotation like Facebook - different ads each time, but ads can reappear
      const scoredRegularAds = regularAds
        .filter(ad => !excludeAdIds.includes(ad.id))
        .map(ad => {
          let score = 50; // Base score for regular ads
          
          // Base score from ad performance (CTR)
          const ctr = ad.impressions > 0 ? ad.clicks / ad.impressions : 0;
          score += ctr * 50;

          // Penalize ads shown recently to this user (for rotation)
          // But don't exclude them - just make them less likely to be selected
          const viewCount = impressionCounts.get(ad.id) || 0;
          score -= viewCount * 15; // Reduce score for each view in last 24h

          // Add randomness for diversity and rotation
          score += Math.random() * 20;

          return { ad, score };
        })
        .sort((a, b) => b.score - a.score);

      // Select admin ads with rotation (avoid recently shown ones, but don't exclude)
      const scoredAdminAds = adminAds
        .filter(ad => !excludeAdIds.includes(ad.id))
        .map(ad => {
          let score = 100; // Base score for admin ads (higher priority)
          
          // Penalize recently shown admin ads (for rotation)
          // But they can still appear again - just less frequently
          const viewCount = impressionCounts.get(ad.id) || 0;
          score -= viewCount * 25; // Reduce score for each view in last 24h

          // Add randomness for rotation and diversity
          score += Math.random() * 20;

          return { ad, score };
        })
        .sort((a, b) => b.score - a.score);

      // Combine ads: Mix admin and regular ads
      // Admin ads get priority but we want diversity
      const selectedAds: Advertisement[] = [];
      const usedAdIds = new Set<string>();

      // Add admin ads first (up to 40% of limit)
      const adminLimit = Math.ceil(limit * 0.4);
      scoredAdminAds.slice(0, adminLimit).forEach(({ ad }) => {
        if (!usedAdIds.has(ad.id)) {
          selectedAds.push(ad);
          usedAdIds.add(ad.id);
        }
      });

      // Fill remaining with regular ads
      scoredRegularAds.forEach(({ ad }) => {
        if (selectedAds.length < limit && !usedAdIds.has(ad.id)) {
          selectedAds.push(ad);
          usedAdIds.add(ad.id);
        }
      });

      // If we still need more ads, add more admin ads
      if (selectedAds.length < limit) {
        scoredAdminAds.forEach(({ ad }) => {
          if (selectedAds.length < limit && !usedAdIds.has(ad.id)) {
            selectedAds.push(ad);
            usedAdIds.add(ad.id);
          }
        });
      }

      return selectedAds;
    } catch (error) {
      console.error('Error getting smart ads:', error);
      // Fallback to simple rotation
      return getActiveAds(placement)
        .filter(ad => !excludeAdIds.includes(ad.id))
        .slice(0, limit);
    }
  }, [currentUser, getActiveAds]);

  const setupRealtimeSubscriptions = useCallback((userId: string) => {
    const subs: RealtimeChannel[] = [];

    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: any) => {
          const newMessage: Message = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            receiverId: payload.new.receiver_id,
            content: payload.new.content,
            mediaUrl: payload.new.media_url,
            read: payload.new.read,
            createdAt: payload.new.created_at,
          };
          setMessages(prev => ({
            ...prev,
            [newMessage.conversationId]: [...(prev[newMessage.conversationId] || []), newMessage],
          }));
        }
      )
      .subscribe();
    subs.push(messagesChannel);

    const notificationsChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotification: Notification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            data: payload.new.data,
            read: payload.new.read,
            createdAt: payload.new.created_at,
          };
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();
    subs.push(notificationsChannel);

    const requestsChannel = supabase
      .channel('relationship_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationship_requests',
          filter: `to_user_id=eq.${userId}`,
        },
        async () => {
          const { data: requestsData } = await supabase
            .from('relationship_requests')
            .select('*')
            .eq('to_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (requestsData) {
            const formattedRequests: RelationshipRequest[] = requestsData.map((req: any) => ({
              id: req.id,
              fromUserId: req.from_user_id,
              fromUserName: req.from_user_name,
              toUserId: req.to_user_id,
              relationshipType: req.relationship_type,
              status: req.status,
              createdAt: req.created_at,
            }));
            setRelationshipRequests(formattedRequests);
          }
        }
      )
      .subscribe();
    subs.push(requestsChannel);

    // Real-time subscription for posts
    const postsChannel = supabase
      .channel('posts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new.moderation_status === 'approved') {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name, profile_picture')
              .eq('id', payload.new.user_id)
              .single();
            
            if (userData) {
              const newPost: Post = {
                id: payload.new.id,
                userId: payload.new.user_id,
                userName: userData.full_name,
                userAvatar: userData.profile_picture,
                content: payload.new.content,
                mediaUrls: payload.new.media_urls || [],
                mediaType: payload.new.media_type,
                likes: [],
                commentCount: payload.new.comment_count || 0,
                createdAt: payload.new.created_at,
              };
              setPosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.moderation_status === 'approved') {
              // Reload posts to get updated one
              const { data: postsData } = await supabase
                .from('posts')
                .select(`
                  *,
                  users!posts_user_id_fkey(full_name, profile_picture)
                `)
                .eq('id', payload.new.id)
                .single();
              
              if (postsData) {
                const { data: postLikesData } = await supabase
                  .from('post_likes')
                  .select('user_id')
                  .eq('post_id', postsData.id);
                
                const likes = postLikesData?.map((l: any) => l.user_id) || [];
                const updatedPost: Post = {
                  id: postsData.id,
                  userId: postsData.user_id,
                  userName: postsData.users.full_name,
                  userAvatar: postsData.users.profile_picture,
                  content: postsData.content,
                  mediaUrls: postsData.media_urls || [],
                  mediaType: postsData.media_type,
                  likes,
                  commentCount: postsData.comment_count,
                  createdAt: postsData.created_at,
                };
                setPosts(prev => [updatedPost, ...prev.filter(p => p.id !== updatedPost.id)]);
              }
            } else {
              // Remove if rejected
              setPosts(prev => prev.filter(p => p.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    subs.push(postsChannel);

    // Real-time subscription for reels
    const reelsChannel = supabase
      .channel('reels_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reels',
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT' && payload.new.moderation_status === 'approved') {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name, profile_picture')
              .eq('id', payload.new.user_id)
              .single();
            
            if (userData) {
              const newReel: Reel = {
                id: payload.new.id,
                userId: payload.new.user_id,
                userName: userData.full_name,
                userAvatar: userData.profile_picture,
                videoUrl: payload.new.video_url,
                thumbnailUrl: payload.new.thumbnail_url,
                caption: payload.new.caption,
                likes: [],
                commentCount: payload.new.comment_count || 0,
                viewCount: payload.new.view_count || 0,
                createdAt: payload.new.created_at,
              };
              setReels(prev => [newReel, ...prev.filter(r => r.id !== newReel.id)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.moderation_status === 'approved') {
              const { data: reelsData } = await supabase
                .from('reels')
                .select(`
                  *,
                  users!reels_user_id_fkey(full_name, profile_picture)
                `)
                .eq('id', payload.new.id)
                .single();
              
              if (reelsData) {
                const { data: reelLikesData } = await supabase
                  .from('reel_likes')
                  .select('user_id')
                  .eq('reel_id', reelsData.id);
                
                const likes = reelLikesData?.map((l: any) => l.user_id) || [];
                const updatedReel: Reel = {
                  id: reelsData.id,
                  userId: reelsData.user_id,
                  userName: reelsData.users.full_name,
                  userAvatar: reelsData.users.profile_picture,
                  videoUrl: reelsData.video_url,
                  thumbnailUrl: reelsData.thumbnail_url,
                  caption: reelsData.caption,
                  likes,
                  commentCount: reelsData.comment_count,
                  viewCount: reelsData.view_count,
                  createdAt: reelsData.created_at,
                };
                setReels(prev => [updatedReel, ...prev.filter(r => r.id !== updatedReel.id)]);
              }
            } else {
              setReels(prev => prev.filter(r => r.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setReels(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    subs.push(reelsChannel);

    setSubscriptions(subs);

    return () => {
      subs.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, []);

  const followUser = useCallback(async (followingId: string) => {
    if (!currentUser) return null;
    
    // Check if already following
    const alreadyFollowing = follows.some(f => f.followerId === currentUser.id && f.followingId === followingId);
    if (alreadyFollowing) {
      return null; // Already following, no need to do anything
    }
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: followingId,
        })
        .select()
        .single();

      if (error) {
        // Handle table not found error
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
          console.error('❌ Follows table does not exist in database!');
          console.error('📝 Please run migrations/create-follows-table.sql in your Supabase SQL Editor to create the table.');
          throw new Error('Follows table missing. Run migrations/create-follows-table.sql in Supabase SQL Editor.');
        }
        // Handle duplicate follow error gracefully
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // Already following, just return
          return null;
        }
        throw error;
      }

      if (data) {
        const newFollow: Follow = {
          id: data.id,
          followerId: data.follower_id,
          followingId: data.following_id,
          createdAt: data.created_at,
        };

        setFollows([...follows, newFollow]);
        
        // Send notification to the user being followed
        await createNotification(
          followingId,
          'follow',
          'New Follower',
          `${currentUser.fullName} started following you`,
          { followerId: currentUser.id }
        );
        
        return newFollow;
      }
      return null;
    } catch (error: any) {
      console.error('Follow user error:', error?.message || error?.code || JSON.stringify(error));
      // If it's a duplicate error, that's okay - we're already following
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        return null;
      }
      return null;
    }
  }, [currentUser, follows]);

  const unfollowUser = useCallback(async (followingId: string) => {
    if (!currentUser) return;
    
    // Check if actually following
    const isFollowing = follows.some(f => f.followerId === currentUser.id && f.followingId === followingId);
    if (!isFollowing) {
      return; // Not following, no need to do anything
    }
    
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', followingId);

      if (error) {
        // Handle table not found error
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.message?.includes('Could not find the table')) {
          console.error('❌ Follows table does not exist in database!');
          console.error('📝 Please run migrations/create-follows-table.sql in your Supabase SQL Editor to create the table.');
          throw new Error('Follows table missing. Run migrations/create-follows-table.sql in Supabase SQL Editor.');
        }
        console.error('Unfollow user error:', error?.message || error?.code || JSON.stringify(error));
        throw error;
      }

      // Update local state
      setFollows(follows.filter(f => !(f.followerId === currentUser.id && f.followingId === followingId)));
    } catch (error: any) {
      console.error('Unfollow user error:', error?.message || error?.code || JSON.stringify(error));
      // Even if there's an error, update local state to reflect user's intent
      setFollows(follows.filter(f => !(f.followerId === currentUser.id && f.followingId === followingId)));
    }
  }, [currentUser, follows]);

  const isFollowing = useCallback((userId: string) => {
    if (!currentUser) return false;
    return follows.some(f => f.followerId === currentUser.id && f.followingId === userId);
  }, [currentUser, follows]);

  const addReelComment = useCallback(async (reelId: string, content: string) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('reel_comments')
        .insert({
          reel_id: reelId,
          user_id: currentUser.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      const newComment: ReelComment = {
        id: data.id,
        reelId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userAvatar: currentUser.profilePicture,
        content,
        likes: [],
        createdAt: data.created_at,
      };
      
      const reel = reels.find(r => r.id === reelId);
      
      const updatedComments = {
        ...reelComments,
        [reelId]: [...(reelComments[reelId] || []), newComment],
      };
      setReelComments(updatedComments);
      
      const updatedReels = reels.map(reel => {
        if (reel.id === reelId) {
          // Send notification to reel owner (if not commenting on own reel)
          if (reel.userId !== currentUser.id) {
            createNotification(
              reel.userId,
              'post_comment', // Using post_comment type for reel comments too
              'New Comment',
              `${currentUser.fullName} commented on your reel: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
              { reelId, commentId: data.id, userId: currentUser.id }
            );
          }
          return { ...reel, commentCount: reel.commentCount + 1 };
        }
        return reel;
      });
      setReels(updatedReels);
      
      return newComment;
    } catch (error) {
      console.error('Add reel comment error:', error);
      return null;
    }
  }, [currentUser, reelComments, reels, createNotification]);

  const getReelComments = useCallback((reelId: string) => {
    return reelComments[reelId] || [];
  }, [reelComments]);

  const reportContent = useCallback(async (
    contentType: ReportedContent['contentType'],
    contentId: string | undefined,
    reportedUserId: string | undefined,
    reason: string,
    description?: string
  ) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('reported_content')
        .insert({
          reporter_id: currentUser.id,
          reported_user_id: reportedUserId,
          content_type: contentType,
          content_id: contentId,
          reason,
          description,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Report content error:', error);
      return null;
    }
  }, [currentUser]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Mark notification as read error:', error);
    }
  }, [notifications]);

  const getUnreadNotificationsCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(notifications.filter(n => n.id !== notificationId));
      return true;
    } catch (error) {
      console.error('Delete notification error:', error);
      return false;
    }
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    if (!currentUser) return false;
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);

      setNotifications([]);
      return true;
    } catch (error) {
      console.error('Clear all notifications error:', error);
      return false;
    }
  }, [currentUser]);

  const logActivity = useCallback(async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    if (!currentUser) return;
    
    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: currentUser.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
        });
    } catch (error) {
      console.error('Log activity error:', error);
    }
  }, [currentUser]);

  const endRelationship = useCallback(async (relationshipId: string, reason?: string) => {
    if (!currentUser) return null;
    
    try {
      const relationship = relationships.find(r => r.id === relationshipId);
      if (!relationship) return null;

      const { data: dispute, error } = await supabase
        .from('disputes')
        .insert({
          relationship_id: relationshipId,
          initiated_by: currentUser.id,
          dispute_type: 'end_relationship',
          description: reason || 'Request to end relationship',
          status: 'pending',
          auto_resolve_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const partnerId = relationship.userId === currentUser.id ? relationship.partnerUserId : relationship.userId;
      
      if (partnerId) {
        await createNotification(
          partnerId,
          'relationship_end_request',
          'End Relationship Request',
          `${currentUser.fullName} has requested to end your relationship. Please confirm or it will auto-resolve in 7 days.`,
          { relationshipId, disputeId: dispute.id }
        );
      }

      await logActivity('end_relationship_request', 'relationship', relationshipId);

      return dispute;
    } catch (error) {
      console.error('End relationship error:', error);
      return null;
    }
  }, [currentUser, relationships, createNotification, logActivity]);

  const confirmEndRelationship = useCallback(async (disputeId: string) => {
    if (!currentUser) return;
    
    try {
      const { data: dispute } = await supabase
        .from('disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (!dispute) return;

      await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution: 'confirmed',
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser.id,
        })
        .eq('id', disputeId);

      await supabase
        .from('relationships')
        .update({
          status: 'ended',
          end_date: new Date().toISOString(),
        })
        .eq('id', dispute.relationship_id);

      await logActivity('end_relationship_confirmed', 'relationship', dispute.relationship_id);

      const updatedRelationships = relationships.filter(r => r.id !== dispute.relationship_id);
      setRelationships(updatedRelationships);
    } catch (error) {
      console.error('Confirm end relationship error:', error);
    }
  }, [currentUser, relationships, logActivity]);

  const editPost = useCallback(async (postId: string, content: string, mediaUrls: string[], mediaType: Post['mediaType']) => {
    if (!currentUser) return null;
    
    try {
      const post = posts.find(p => p.id === postId);
      if (!post || post.userId !== currentUser.id) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('posts')
        .update({
          content,
          media_urls: mediaUrls,
          media_type: mediaType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      const updatedPosts = posts.map(p => 
        p.id === postId 
          ? { ...p, content, mediaUrls, mediaType }
          : p
      );
      setPosts(updatedPosts);
      
      await logActivity('edit_post', 'post', postId);
      return data;
    } catch (error) {
      console.error('Edit post error:', error);
      return null;
    }
  }, [currentUser, posts, logActivity]);

  const deletePost = useCallback(async (postId: string) => {
    if (!currentUser) return false;
    
    try {
      const post = posts.find(p => p.id === postId);
      if (!post || post.userId !== currentUser.id) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      const updatedPosts = posts.filter(p => p.id !== postId);
      setPosts(updatedPosts);
      
      await logActivity('delete_post', 'post', postId);
      return true;
    } catch (error) {
      console.error('Delete post error:', error);
      return false;
    }
  }, [currentUser, posts, logActivity]);

  const editComment = useCallback(async (commentId: string, content: string) => {
    if (!currentUser) return null;
    
    try {
      let foundComment: Comment | null = null;
      let postId: string | null = null;

      for (const [pid, commentList] of Object.entries(comments)) {
        const comment = commentList.find(c => c.id === commentId);
        if (comment) {
          foundComment = comment;
          postId = pid;
          break;
        }
      }

      if (!foundComment || foundComment.userId !== currentUser.id || !postId) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('comments')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      const updatedComments = {
        ...comments,
        [postId]: comments[postId].map(c => 
          c.id === commentId ? { ...c, content } : c
        ),
      };
      setComments(updatedComments);
      
      await logActivity('edit_comment', 'comment', commentId);
      return data;
    } catch (error) {
      console.error('Edit comment error:', error);
      return null;
    }
  }, [currentUser, comments, logActivity]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!currentUser) return false;
    
    try {
      let foundComment: Comment | null = null;
      let postId: string | null = null;

      for (const [pid, commentList] of Object.entries(comments)) {
        const comment = commentList.find(c => c.id === commentId);
        if (comment) {
          foundComment = comment;
          postId = pid;
          break;
        }
      }

      if (!foundComment || foundComment.userId !== currentUser.id || !postId) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      const updatedComments = {
        ...comments,
        [postId]: comments[postId].filter(c => c.id !== commentId),
      };
      setComments(updatedComments);

      const updatedPosts = posts.map(p => 
        p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
      );
      setPosts(updatedPosts);
      
      await logActivity('delete_comment', 'comment', commentId);
      return true;
    } catch (error) {
      console.error('Delete comment error:', error);
      return false;
    }
  }, [currentUser, comments, posts, logActivity]);

  const editReel = useCallback(async (reelId: string, caption: string) => {
    if (!currentUser) return null;
    
    try {
      const reel = reels.find(r => r.id === reelId);
      if (!reel || reel.userId !== currentUser.id) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('reels')
        .update({
          caption,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reelId)
        .select()
        .single();

      if (error) throw error;

      const updatedReels = reels.map(r => 
        r.id === reelId ? { ...r, caption } : r
      );
      setReels(updatedReels);
      
      await logActivity('edit_reel', 'reel', reelId);
      return data;
    } catch (error) {
      console.error('Edit reel error:', error);
      return null;
    }
  }, [currentUser, reels, logActivity]);

  const deleteReel = useCallback(async (reelId: string) => {
    if (!currentUser) return false;
    
    try {
      const reel = reels.find(r => r.id === reelId);
      if (!reel || reel.userId !== currentUser.id) {
        throw new Error('Unauthorized');
      }

      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', reelId);

      if (error) throw error;

      const updatedReels = reels.filter(r => r.id !== reelId);
      setReels(updatedReels);
      
      await logActivity('delete_reel', 'reel', reelId);
      return true;
    } catch (error) {
      console.error('Delete reel error:', error);
      return false;
    }
  }, [currentUser, reels, logActivity]);

  const sharePost = useCallback(async (postId: string) => {
    if (!currentUser) return;
    
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const shareUrl = `https://yourapp.com/post/${postId}`;
      const shareText = post.content ? `${post.content.substring(0, 100)}... ${shareUrl}` : shareUrl;
      
      // Use React Native Share API
      const Share = require('react-native').Share;
      await Share.share({
        message: shareText,
        url: shareUrl,
        title: `Post by ${post.userName}`,
      });
      
      await logActivity('share_post', 'post', postId);
    } catch (error) {
      console.error('Share post error:', error);
    }
  }, [currentUser, posts, logActivity]);

  const shareReel = useCallback(async (reelId: string) => {
    if (!currentUser) return;
    
    try {
      const reel = reels.find(r => r.id === reelId);
      if (!reel) return;

      const shareUrl = `https://yourapp.com/reel/${reelId}`;
      const shareText = reel.caption ? `${reel.caption.substring(0, 100)}... ${shareUrl}` : shareUrl;
      
      // Use React Native Share API
      const Share = require('react-native').Share;
      await Share.share({
        message: shareText,
        url: shareUrl,
        title: `Reel by ${reel.userName}`,
      });
      
      await logActivity('share_reel', 'reel', reelId);
    } catch (error) {
      console.error('Share reel error:', error);
    }
  }, [currentUser, reels, logActivity]);

  const adminDeletePost = useCallback(async (postId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator')) {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      const updatedPosts = posts.filter(p => p.id !== postId);
      setPosts(updatedPosts);
      
      await logActivity('admin_delete_post', 'post', postId, { adminId: currentUser.id });
      return true;
    } catch (error) {
      console.error('Admin delete post error:', error);
      return false;
    }
  }, [currentUser, posts, logActivity]);

  const adminRejectPost = useCallback(async (postId: string, reason?: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator')) {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          moderation_status: 'rejected',
          moderation_reason: reason,
          moderated_at: new Date().toISOString(),
          moderated_by: currentUser.id,
        })
        .eq('id', postId);

      if (error) throw error;

      const updatedPosts = posts.filter(p => p.id !== postId);
      setPosts(updatedPosts);
      
      await logActivity('admin_reject_post', 'post', postId, { adminId: currentUser.id, reason });
      return true;
    } catch (error) {
      console.error('Admin reject post error:', error);
      return false;
    }
  }, [currentUser, posts, logActivity]);

  const adminDeleteReel = useCallback(async (reelId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator')) {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', reelId);

      if (error) throw error;

      const updatedReels = reels.filter(r => r.id !== reelId);
      setReels(updatedReels);
      
      await logActivity('admin_delete_reel', 'reel', reelId, { adminId: currentUser.id });
      return true;
    } catch (error) {
      console.error('Admin delete reel error:', error);
      return false;
    }
  }, [currentUser, reels, logActivity]);

  const adminRejectReel = useCallback(async (reelId: string, reason?: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'moderator')) {
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('reels')
        .update({
          moderation_status: 'rejected',
          moderation_reason: reason,
          moderated_at: new Date().toISOString(),
          moderated_by: currentUser.id,
        })
        .eq('id', reelId);

      if (error) throw error;

      const updatedReels = reels.filter(r => r.id !== reelId);
      setReels(updatedReels);
      
      await logActivity('admin_reject_reel', 'reel', reelId, { adminId: currentUser.id, reason });
      return true;
    } catch (error) {
      console.error('Admin reject reel error:', error);
      return false;
    }
  }, [currentUser, reels, logActivity]);

  return {
    currentUser,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    refreshRelationships,
    createRelationship,
    acceptRelationshipRequest,
    rejectRelationshipRequest,
    getCurrentUserRelationship,
    getUserRelationship,
    searchUsers,
    searchByFace,
    getPendingRequests,
    posts,
    reels,
    conversations,
    createPost,
    createReel,
    toggleLike,
    toggleReelLike,
    addComment,
    sendMessage,
    getConversation,
    getMessages,
    createOrGetConversation,
    getComments,
    advertisements,
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    recordAdImpression,
    recordAdClick,
    getActiveAds,
    getPersonalizedFeed,
    getSmartAds,
    notifications,
    cheatingAlerts,
    follows,
    disputes,
    certificates,
    anniversaries,
    followUser,
    unfollowUser,
    isFollowing,
    addReelComment,
    getReelComments,
    reportContent,
    createNotification,
    markNotificationAsRead,
    getUnreadNotificationsCount,
    deleteNotification,
    clearAllNotifications,
    deleteConversation,
    deleteMessage,
    logActivity,
    endRelationship,
    confirmEndRelationship,
    sendPhoneVerificationCode,
    verifyPhoneCode,
    sendEmailVerificationCode,
    verifyEmailCode,
    uploadIDVerification,
    uploadCoupleSelfie,
    createCertificate,
    getCertificates,
    createAnniversary,
    getAnniversaries,
    createMilestone,
    getMilestones,
    getAchievements,
    getCoupleLevel,
    detectDuplicateRelationships,
    savePushToken,
    editPost,
    deletePost,
    editComment,
    deleteComment,
    editReel,
    deleteReel,
    sharePost,
    shareReel,
    adminDeletePost,
    adminRejectPost,
    adminDeleteReel,
    adminRejectReel,
  };
});

// Helper functions for verification
const sendPhoneVerificationCode = async (phoneNumber: string) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Phone verification code for ${phoneNumber}: ${code}`);
    return { success: true, code };
  } catch (error) {
    console.error('Send phone code error:', error);
    return { success: false, error };
  }
};

const verifyPhoneCode = async (code: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Verify phone code error:', error);
    return { success: false, error };
  }
};

const sendEmailVerificationCode = async (email: string) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Email verification code for ${email}: ${code}`);
    return { success: true, code };
  } catch (error) {
    console.error('Send email code error:', error);
    return { success: false, error };
  }
};

const verifyEmailCode = async (code: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Verify email code error:', error);
    return { success: false, error };
  }
};

const uploadIDVerification = async (documentType: string, documentUrl: string, selfieUrl?: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Upload ID verification error:', error);
    return { success: false, error };
  }
};

const uploadCoupleSelfie = async (relationshipId: string, selfieUrl: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Upload couple selfie error:', error);
    return { success: false, error };
  }
};

const createCertificate = async (relationshipId: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Create certificate error:', error);
    return { success: false, error };
  }
};

const getCertificates = (relationshipId: string) => {
  return [];
};

const createAnniversary = async (relationshipId: string, type: string, date: string, title: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Create anniversary error:', error);
    return { success: false, error };
  }
};

const getAnniversaries = (relationshipId: string) => {
  return [];
};

const createMilestone = async (relationshipId: string, type: string, title: string, description: string, date: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Create milestone error:', error);
    return { success: false, error };
  }
};

const getMilestones = (relationshipId: string) => {
  return [];
};

const getAchievements = (relationshipId: string) => {
  return [];
};

const getCoupleLevel = (relationshipId: string) => {
  return null;
};

const detectDuplicateRelationships = async (userId: string) => {
  try {
    return { success: true, duplicates: [] };
  } catch (error) {
    console.error('Detect duplicates error:', error);
    return { success: false, error };
  }
};

const savePushToken = async (token: string, deviceType: string) => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Save push token error:', error);
    return { success: false, error };
  }
};
