'use client';

import Image from 'next/image';

export function LogoSplash() {
  return (
    <div className='logo-splash' aria-label='Loading Denuel Chat' role='status'>
      <div className='logo-splash-mark'>
        <Image
          alt='Denuel Chat'
          className='logo-splash-image'
          height={120}
          priority
          src='/branding/logo-primary.jpg'
          width={120}
        />
      </div>
    </div>
  );
}
