import { fetchProperties } from '@/utils/actions';
import PropertiesList from './PropertiesList';
import EmptyList from './EmptyList';
import type { PropertyCardProps } from '@/utils/types';

async function PropertiesContainer({
  category,
  search,
}: {
  category?: string;
  search?: string;
}) {
  const properties: PropertyCardProps[] = await fetchProperties({
    category,
    search,
  });
  if (properties.length === 0) {
    return (
      <EmptyList
        heading='Our curators are finding more unique stays for you.'
        message='Check back soon for new handpicked glamping sites and tiny homes.'
        btnText='Explore All Stays'
      />
    );
  }

  return <PropertiesList properties={properties} />;
}
export default PropertiesContainer;
