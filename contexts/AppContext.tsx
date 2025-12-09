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
  const [reelComments, setReelComments] = useState<Record<string, ReelComment[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptions, setSubscriptions] = useState<RealtimeChannel[]>([]);

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
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: postLikesData } = await supabase
        .from('post_likes')
        .select('post_id, user_id');

      if (postsData) {
        const formattedPosts: Post[] = postsData.map((p: any) => {
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

      const { data: reelsData } = await supabase
        .from('reels')
        .select(`
          *,
          users!reels_user_id_fkey(full_name, profile_picture)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

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

  const createRelationship = useCallback(async (
    partnerName: string,
    partnerPhone: string,
    type: Relationship['type']
  ) => {
    if (!currentUser) return null;
    
    try {
      const { data: partnerData } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', partnerPhone)
        .single();

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
      };

      setRelationships([...relationships, newRelationship]);
      return newRelationship;
    } catch (error) {
      console.error('Create relationship error:', error);
      return null;
    }
  }, [currentUser, relationships]);

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
    } catch (error) {
      console.error('Accept relationship request error:', error);
    }
  }, [currentUser]);

  const rejectRelationshipRequest = useCallback(async (requestId: string) => {
    try {
      await supabase
        .from('relationship_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
    } catch (error) {
      console.error('Reject relationship request error:', error);
    }
  }, []);

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
      const { data, error } = await supabase.rpc('search_users', {
        search_query: lowerQuery,
      });

      if (error) throw error;

      return (data || []).map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phoneNumber: u.phone_number,
        profilePicture: u.profile_picture,
        role: u.role,
        verifications: {
          phone: u.phone_verified,
          email: u.email_verified,
          id: u.id_verified,
        },
        createdAt: '',
      }));
    } catch (error) {
      console.error('Search users error:', error);
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
  }, [currentUser, posts]);

  const toggleReelLike = useCallback(async (reelId: string) => {
    if (!currentUser) return;
    
    try {
      const { data: existingLike } = await supabase
        .from('reel_likes')
        .select('id')
        .eq('reel_id', reelId)
        .eq('user_id', currentUser.id)
        .single();

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
  }, [currentUser, reels]);

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
      
      const updatedPosts = posts.map(post => 
        post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post
      );
      setPosts(updatedPosts);
      
      return newComment;
    } catch (error) {
      console.error('Add comment error:', error);
      return null;
    }
  }, [currentUser, comments, posts]);

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
      
      return newMessage;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  }, [currentUser, messages]);

  const getConversation = useCallback((conversationId: string) => {
    return conversations.find(c => c.id === conversationId);
  }, [conversations]);

  const getMessages = useCallback((conversationId: string) => {
    return messages[conversationId] || [];
  }, [messages]);

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

    setSubscriptions(subs);

    return () => {
      subs.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, []);

  const followUser = useCallback(async (followingId: string) => {
    if (!currentUser) return null;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: followingId,
        })
        .select()
        .single();

      if (error) throw error;

      const newFollow: Follow = {
        id: data.id,
        followerId: data.follower_id,
        followingId: data.following_id,
        createdAt: data.created_at,
      };

      setFollows([...follows, newFollow]);
      return newFollow;
    } catch (error) {
      console.error('Follow user error:', error);
      return null;
    }
  }, [currentUser, follows]);

  const unfollowUser = useCallback(async (followingId: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', followingId);

      if (error) throw error;

      setFollows(follows.filter(f => !(f.followerId === currentUser.id && f.followingId === followingId)));
    } catch (error) {
      console.error('Unfollow user error:', error);
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
      
      const updatedComments = {
        ...reelComments,
        [reelId]: [...(reelComments[reelId] || []), newComment],
      };
      setReelComments(updatedComments);
      
      const updatedReels = reels.map(reel => 
        reel.id === reelId ? { ...reel, commentCount: reel.commentCount + 1 } : reel
      );
      setReels(updatedReels);
      
      return newComment;
    } catch (error) {
      console.error('Add reel comment error:', error);
      return null;
    }
  }, [currentUser, reelComments, reels]);

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

  return {
    currentUser,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    createRelationship,
    acceptRelationshipRequest,
    rejectRelationshipRequest,
    getCurrentUserRelationship,
    getUserRelationship,
    searchUsers,
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
    getComments,
    advertisements,
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    recordAdImpression,
    recordAdClick,
    getActiveAds,
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
    logActivity,
  };
});
