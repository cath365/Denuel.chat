import type { ReactNode } from 'react';

type AppIconProps = {
  children?: ReactNode;
  color?: string;
};

const AppIcon = ({ children, color = '#0F766E' }: AppIconProps) => (
  <svg width='100%' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'>
    <defs>
      <linearGradient id='denuel-icon-gradient' x1='64' y1='32' x2='448' y2='480'>
        <stop offset='0%' stopColor={color} />
        <stop offset='100%' stopColor='#22C55E' />
      </linearGradient>
    </defs>
    <g fill='url(#denuel-icon-gradient)' mask={children ? 'url(#cut)' : undefined}>
      <rect x='32' y='32' width='448' height='448' rx='128' />
    </g>
    <path
      d='M136 176C136 136.235 168.235 104 208 104H312C351.765 104 384 136.235 384 176V264C384 303.765 351.765 336 312 336H228L152 404V336C143.163 336 136 328.837 136 320V176Z'
      fill='white'
    />
    <circle cx='212' cy='220' r='22' fill={color} />
    <circle cx='260' cy='220' r='22' fill={color} />
    <circle cx='308' cy='220' r='22' fill={color} />
    {!!children && (
      <>
        <g transform='translate(256 256)'>
          <g transform='translate(128 128)'>
            <g transform='scale(0.4)'>
              <g transform='translate(-256 -256)'>{children}</g>
            </g>
          </g>
        </g>
        <defs>
          <mask id='cut'>
            <rect x='0' y='0' width='512' height='512' fill='white' />
            <g filter='url(#blackout)'>
              <g transform='translate(256 256)'>
                <g transform='translate(128 128)'>
                  <g transform='scale(0.5)'>
                    <g transform='translate(-256 -256)'>{children}</g>
                  </g>
                </g>
              </g>
            </g>
          </mask>
          <filter id='blackout'>
            <feColorMatrix
              type='matrix'
              values='
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 1 0
            '
              in='SourceGraphic'
            />
          </filter>
        </defs>
      </>
    )}
  </svg>
);

export default AppIcon;
