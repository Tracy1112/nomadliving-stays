import Link from 'next/link';
import { LuTent } from 'react-icons/lu';

function Logo() {
  return (
    <Link href='/' className='flex items-center gap-2 group'>
      <LuTent className='w-6 h-6 text-primary group-hover:scale-110 transition-transform' />
      <span className='text-xl font-bold tracking-tight'>
        <span className='text-primary'>NOMAD</span>
        <span className='text-muted-foreground'> | STAYS</span>
      </span>
    </Link>
  );
}
export default Logo;
