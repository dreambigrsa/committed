import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { supabase } from '@/lib/supabase';

export const createCertificateProcedure = protectedProcedure
  .input(
    z.object({
      relationshipId: z.string(),
      verificationSelfieUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { relationshipId, verificationSelfieUrl } = input;
    const userId = ctx.user.id;

    const { data: relationship } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .eq('status', 'verified')
      .single();

    if (!relationship) {
      throw new Error('Verified relationship not found');
    }

    if (
      relationship.user_id !== userId &&
      relationship.partner_user_id !== userId
    ) {
      throw new Error('Not authorized');
    }

    const certificateUrl = `https://rork.app/certificates/${relationshipId}`;

    const { data: certificate, error } = await supabase
      .from('couple_certificates')
      .insert({
        relationship_id: relationshipId,
        certificate_url: certificateUrl,
        verification_selfie_url: verificationSelfieUrl,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return certificate;
  });
