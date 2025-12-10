/**
 * Face Search Service
 * 
 * This service handles face recognition and matching for the search feature.
 * It can be integrated with various face recognition services:
 * - AWS Rekognition
 * - Azure Face API
 * - Google Cloud Vision API
 * - Custom ML models
 * 
 * For now, this is a placeholder that can be extended with actual face recognition APIs.
 */

import { supabase } from './supabase';

export interface FaceSearchResult {
  relationshipId: string;
  partnerName: string;
  partnerPhone: string;
  partnerUserId?: string;
  relationshipType: string;
  relationshipStatus: string;
  userId: string;
  userName: string;
  userPhone: string;
  facePhotoUrl: string;
  similarityScore?: number;
}

export interface FaceMatch {
  relationshipId: string;
  partnerName: string;
  partnerPhone: string;
  partnerUserId?: string;
  relationshipType: string;
  relationshipStatus: string;
  userId: string;
  userName: string;
  userPhone: string;
  facePhotoUrl: string;
  similarityScore: number;
}

/**
 * Extract face features from an image
 * This should call your face recognition service (AWS Rekognition, Azure Face API, etc.)
 * 
 * @param imageUrl - URL or base64 of the image to analyze
 * @returns Face ID or embedding from the recognition service
 */
export async function extractFaceFeatures(imageUrl: string): Promise<string | null> {
  try {
    // TODO: Integrate with actual face recognition service
    // Example with AWS Rekognition:
    // const rekognition = new AWS.Rekognition();
    // const result = await rekognition.detectFaces({ Image: { Bytes: imageBytes } }).promise();
    // return result.FaceDetails[0]?.FaceId;
    
    // Example with Azure Face API:
    // const response = await fetch('https://{endpoint}/face/v1.0/detect', {
    //   method: 'POST',
    //   headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    //   body: JSON.stringify({ url: imageUrl })
    // });
    // const faces = await response.json();
    // return faces[0]?.faceId;
    
    // For now, return a placeholder ID based on image URL
    // This allows the demo to work without actual face recognition
    // In production, replace this with actual face detection
    console.log('Face feature extraction using placeholder. Please integrate a face recognition service for production.');
    
    // Generate a placeholder ID from the image URL
    // This is just for demo purposes - in production, use actual face detection
    const placeholderId = `placeholder_${imageUrl.substring(imageUrl.length - 20).replace(/[^a-zA-Z0-9]/g, '')}`;
    return placeholderId;
  } catch (error) {
    console.error('Error extracting face features:', error);
    return null;
  }
}

/**
 * Search for faces matching the input image
 * 
 * @param imageUrl - URL or base64 of the search image
 * @param threshold - Similarity threshold (0-1)
 * @returns Array of matching relationships
 */
export async function searchByFace(
  imageUrl: string,
  threshold: number = 0.7
): Promise<FaceMatch[]> {
  try {
    // Step 1: Extract face features from input image
    const inputFaceId = await extractFaceFeatures(imageUrl);
    if (!inputFaceId) {
      // Show a helpful error message
      throw new Error('Could not process image. Please ensure the image contains a clear face and try again. Note: Face recognition service integration is required for production use.');
    }

    // Step 2: Get all relationships with face photos
    const { data: relationships, error } = await supabase.rpc(
      'get_relationships_for_face_search'
    );

    if (error) {
      console.error('Error fetching relationships for face search:', error);
      // If the RPC function doesn't exist, try a direct query as fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('relationships')
        .select(`
          id as relationship_id,
          partner_name,
          partner_phone,
          partner_user_id,
          type as relationship_type,
          status as relationship_status,
          user_id,
          partner_face_photo as face_photo_url
        `)
        .not('partner_face_photo', 'is', null);
      
      if (fallbackError) {
        throw new Error('Could not fetch relationships. Please ensure the database is properly configured.');
      }
      
      // Use fallback data if RPC failed
      const relationshipsToUse = fallbackData || [];
      
      // Step 3: Compare with stored faces using face recognition service
      const matches: FaceMatch[] = [];
      
      for (const rel of relationshipsToUse) {
        if (!rel.face_photo_url) continue;
        
        // For placeholder, generate a service ID if it doesn't exist
        const fallbackRelFaceId = `rel_${rel.relationship_id}`;
        
        // For now, we'll do a simple placeholder comparison
        // In production, replace this with actual face matching
        const similarity = await compareFacesPlaceholder(inputFaceId, fallbackRelFaceId);
        
        if (similarity >= threshold) {
          // Get user info for the relationship owner
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, phone_number')
            .eq('id', rel.user_id)
            .single();
          
          matches.push({
            relationshipId: rel.relationship_id,
            partnerName: rel.partner_name,
            partnerPhone: rel.partner_phone,
            partnerUserId: rel.partner_user_id,
            relationshipType: rel.relationship_type,
            relationshipStatus: rel.relationship_status,
            userId: rel.user_id,
            userName: userData?.full_name || 'Unknown',
            userPhone: userData?.phone_number || '',
            facePhotoUrl: rel.face_photo_url,
            similarityScore: similarity,
          });
        }
      }
      
      // Sort by similarity score (highest first)
      matches.sort((a, b) => b.similarityScore - a.similarityScore);
      
      return matches;
    }

    // Step 3: Compare with stored faces using face recognition service
    const matches: FaceMatch[] = [];
    
    for (const rel of relationships || []) {
      if (!rel.face_photo_url) continue;
      
      // For placeholder, use relationship ID as face service ID if not available
      const relFaceId = rel.face_service_id || `rel_${rel.relationship_id}`;

      // TODO: Use face recognition service to compare faces
      // Example with AWS Rekognition:
      // const rekognition = new AWS.Rekognition();
      // const result = await rekognition.compareFaces({
      //   SourceImage: { Bytes: inputImageBytes },
      //   TargetImage: { S3Object: { Bucket: 'bucket', Name: rel.face_photo_url } },
      //   SimilarityThreshold: threshold * 100
      // }).promise();
      // const similarity = result.FaceMatches[0]?.Similarity / 100;
      
      // Example with Azure Face API:
      // const response = await fetch('https://{endpoint}/face/v1.0/findsimilars', {
      //   method: 'POST',
      //   headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      //   body: JSON.stringify({
      //     faceId: inputFaceId,
      //     faceIds: [rel.face_service_id],
      //     maxNumOfCandidatesReturned: 1,
      //     mode: 'matchPerson'
      //   })
      // });
      // const similarFaces = await response.json();
      // const similarity = similarFaces[0]?.confidence || 0;

      // For placeholder, use relationship ID as face service ID if not available
      const relFaceId = rel.face_service_id || `rel_${rel.relationship_id}`;
      
      // For now, we'll do a simple placeholder comparison
      // In production, replace this with actual face matching
      const similarity = await compareFacesPlaceholder(inputFaceId, relFaceId);
      
      if (similarity >= threshold) {
        // Get user info if not already included in the RPC result
        let userName = rel.user_name;
        let userPhone = rel.user_phone;
        
        if (!userName || !userPhone) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, phone_number')
            .eq('id', rel.user_id)
            .single();
          
          userName = userData?.full_name || userName || 'Unknown';
          userPhone = userData?.phone_number || userPhone || '';
        }
        
        matches.push({
          relationshipId: rel.relationship_id,
          partnerName: rel.partner_name,
          partnerPhone: rel.partner_phone,
          partnerUserId: rel.partner_user_id,
          relationshipType: rel.relationship_type,
          relationshipStatus: rel.relationship_status,
          userId: rel.user_id,
          userName: userName,
          userPhone: userPhone,
          facePhotoUrl: rel.face_photo_url,
          similarityScore: similarity,
        });
      }
    }

    // Sort by similarity score (highest first)
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    return matches;
  } catch (error) {
    console.error('Error searching by face:', error);
    return [];
  }
}

/**
 * Placeholder function for face comparison
 * Replace this with actual face recognition service integration
 */
async function compareFacesPlaceholder(
  faceId1: string,
  faceId2: string
): Promise<number> {
  // This is a placeholder - in production, use actual face recognition service
  // For now, return a random similarity to demonstrate the flow
  // In real implementation, this would call AWS Rekognition, Azure Face API, etc.
  return Math.random() * 0.3 + 0.7; // Random between 0.7-1.0 for demo
}

/**
 * Store face embedding/service ID for a relationship
 * This should be called when a partner face photo is uploaded
 */
export async function storeFaceEmbedding(
  relationshipId: string,
  faceServiceId: string,
  faceServiceType: string = 'custom'
): Promise<boolean> {
  try {
    // Get relationship info
    const { data: relationship } = await supabase
      .from('relationships')
      .select('partner_name, partner_phone, partner_face_photo')
      .eq('id', relationshipId)
      .single();

    if (!relationship) return false;

    // Upsert face embedding
    const { error } = await supabase
      .from('face_embeddings')
      .upsert({
        relationship_id: relationshipId,
        partner_name: relationship.partner_name,
        partner_phone: relationship.partner_phone,
        face_photo_url: relationship.partner_face_photo,
        face_service_id: faceServiceId,
        face_service_type: faceServiceType,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'relationship_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing face embedding:', error);
    return false;
  }
}

