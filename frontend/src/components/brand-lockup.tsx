'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { env } from '../lib/env';

type BrandLockupProps = {
  href?: Route;
  subtitle?: string;
  size?: 'sm' | 'lg';
};

export function BrandLockup({
  href = '/',
  subtitle = 'Firebase chat',
  size = 'sm',
}: BrandLockupProps) {
  const imageSize = size === 'lg' ? 72 : 48;

  return (
    <Link className='brand-lockup' href={href}>
      <Image
        alt={`${env.appName} logo`}
        className='brand-lockup-image'
        height={imageSize}
        src='/branding/logo-primary.jpg'
        width={imageSize}
      />
      <span>
        <strong className='brand-lockup-title'>{env.appName}</strong>
        <span className='brand-lockup-subtitle'>{subtitle}</span>
      </span>
    </Link>
  );
}
