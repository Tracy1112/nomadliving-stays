import EmptyList from '@/components/home/EmptyList';
import PropertiesList from '@/components/home/PropertiesList';
import { fetchFavorites } from '@/utils/actions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saved Stays',
  description: 'View your saved glamping sites and tiny homes on NomadLiving Stays.',
};

async function FavoritesPage() {
  const favorites = await fetchFavorites();

  if (favorites.length === 0) {
    return <EmptyList />;
  }

  return <PropertiesList properties={favorites} />;
}
export default FavoritesPage;
