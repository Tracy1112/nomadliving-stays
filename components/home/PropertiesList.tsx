import PropertyCard from '../card/PropertyCard';
import type { PropertyCardProps } from '@/utils/types';

function PropertiesList({ properties }: { properties: PropertyCardProps[] }) {
  return (
    <section className='mt-4 gap-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {properties.map((property, index) => {
        return (
          <PropertyCard
            key={property.id}
            property={property}
            priority={index < 8}
          />
        );
      })}
    </section>
  );
}
export default PropertiesList;
