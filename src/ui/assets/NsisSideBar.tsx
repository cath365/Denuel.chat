import AppIcon from '../icons/AppIcon';

const NsisSideBar = () => {
  return (
    <svg viewBox='0 0 164 314' xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='denuel-nsis' x1='0' y1='0' x2='164' y2='314'>
          <stop offset='0%' stopColor='#ECFDF5' />
          <stop offset='100%' stopColor='#D1FAE5' />
        </linearGradient>
      </defs>
      <rect width='164' height='314' fill='url(#denuel-nsis)' />
      <svg x='18' y='18' width='128' height='128'>
        <AppIcon />
      </svg>
    </svg>
  );
};

export default NsisSideBar;
