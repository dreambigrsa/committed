import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import LegalAcceptanceModal from './LegalAcceptanceModal';
import { LegalDocument } from '@/types';

export default function LegalAcceptanceEnforcer() {
  const { currentUser, legalAcceptanceStatus, setLegalAcceptanceStatus } = useApp();
  const router = useRouter();

  const handleViewDocument = (document: LegalDocument) => {
    router.push(`/legal/${document.slug}` as any);
  };

  const handleComplete = () => {
    // Refresh acceptance status
    if (currentUser?.id) {
      import('@/lib/legal-enforcement').then(({ checkUserLegalAcceptances }) => {
        checkUserLegalAcceptances(currentUser.id).then((status) => {
          setLegalAcceptanceStatus(status);
        });
      });
    }
  };

  const showModal =
    currentUser &&
    legalAcceptanceStatus &&
    !legalAcceptanceStatus.hasAllRequired &&
    (legalAcceptanceStatus.missingDocuments.length > 0 ||
      legalAcceptanceStatus.needsReAcceptance.length > 0);

  return (
    <LegalAcceptanceModal
      visible={showModal || false}
      missingDocuments={legalAcceptanceStatus?.missingDocuments || []}
      needsReAcceptance={legalAcceptanceStatus?.needsReAcceptance || []}
      onComplete={handleComplete}
      onViewDocument={handleViewDocument}
    />
  );
}

