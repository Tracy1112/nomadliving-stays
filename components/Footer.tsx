import Link from 'next/link';
import { LuTent, LuShoppingBag, LuLock } from 'react-icons/lu';

function Footer() {
  return (
    <footer className='border-t mt-20 py-12 bg-muted/30'>
      <div className='container'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Brand Section */}
          <div className='space-y-4'>
            <Link href='/' className='flex items-center gap-2'>
              <LuTent className='w-6 h-6 text-primary' />
              <span className='text-lg font-bold'>
                <span className='text-primary'>NOMAD</span>
                <span className='text-muted-foreground'>/STAYS</span>
              </span>
            </Link>
            <p className='text-sm text-muted-foreground'>
              Curated glamping & tiny homes for extraordinary experiences.
            </p>
          </div>

          {/* About Section */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-sm uppercase tracking-wider'>About</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link href='/about' className='text-muted-foreground hover:text-primary transition-colors'>
                  Our Story
                </Link>
              </li>
              <li>
                <Link href='/properties' className='text-muted-foreground hover:text-primary transition-colors'>
                  Browse Stays
                </Link>
              </li>
              <li>
                <Link href='/contact' className='text-muted-foreground hover:text-primary transition-colors'>
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-sm uppercase tracking-wider'>Ecosystem</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link 
                  href='https://nomadliving-boutique.vercel.app' 
                  target='_blank' 
                  rel='noopener noreferrer'
                  className='text-muted-foreground hover:text-primary transition-colors flex items-center gap-2'
                >
                  <LuShoppingBag className='w-4 h-4' />
                  NomadLiving Boutique
                </Link>
              </li>
              <li>
                <Link 
                  href='https://nomadliving-ops.vercel.app' 
                  target='_blank' 
                  rel='noopener noreferrer'
                  className='text-muted-foreground hover:text-primary transition-colors flex items-center gap-2'
                >
                  <LuLock className='w-4 h-4' />
                  Partner/Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className='space-y-4'>
            <h3 className='font-semibold text-sm uppercase tracking-wider'>Legal</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link href='/terms' className='text-muted-foreground hover:text-primary transition-colors'>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href='/privacy' className='text-muted-foreground hover:text-primary transition-colors'>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='mt-12 pt-8 border-t text-center text-sm text-muted-foreground'>
          <p>&copy; {new Date().getFullYear()} NomadLiving Stays. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

