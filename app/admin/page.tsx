import ChartsContainer from '@/components/admin/ChartsContainer';
import {
  ChartsLoadingContainer,
  StatsLoadingContainer,
} from '@/components/admin/Loading';
import StatsContainer from '@/components/admin/StatsContainer';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Portal',
  description: 'Staff portal for managing NomadLiving Stays platform.',
};

function AdminPage() {
  return (
    <>
      <Suspense fallback={<StatsLoadingContainer />}>
        <StatsContainer />
      </Suspense>
      <Suspense fallback={<ChartsLoadingContainer />}>
        <ChartsContainer />
      </Suspense>
    </>
  );
}
export default AdminPage;
