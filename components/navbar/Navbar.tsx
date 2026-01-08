import NavSearch from './NavSearch';
import LinksDropdown from './LinksDropdown';
import DarkMode from './DarkMode';
import Logo from './Logo';
import Link from 'next/link';
import { Button } from '../ui/button';
import { LuShoppingBag } from 'react-icons/lu';

function Navbar() {
  return (
    <nav className='border-b'>
      <div className='container flex flex-col sm:flex-row sm:justify-between sm:items-center flex-wrap gap-4 py-8'>
        <Logo />
        <NavSearch />
        <div className='flex gap-4 items-center'>
          <Button variant='outline' asChild className='hidden sm:flex'>
            <Link href='https://nomadliving-boutique.vercel.app' target='_blank' rel='noopener noreferrer'>
              <LuShoppingBag className='w-4 h-4 mr-2' />
              Shop the Look
            </Link>
          </Button>
          <DarkMode />
          <LinksDropdown />
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
