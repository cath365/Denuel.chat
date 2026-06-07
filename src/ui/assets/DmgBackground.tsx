import { RocketChatLogo } from '../components/RocketChatLogo';

const DmgBackground = () => {
  return (
    <svg viewBox='0 0 600 422' xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='denuel-dmg' x1='0' y1='0' x2='600' y2='422'>
          <stop offset='0%' stopColor='#ECFDF5' />
          <stop offset='100%' stopColor='#D1FAE5' />
        </linearGradient>
      </defs>
      <rect width='600' height='422' fill='url(#denuel-dmg)' />
      <g transform='translate(92 80) scale(0.7)'>
        <RocketChatLogo />
      </g>
    </svg>
  );
};

export default DmgBackground;
