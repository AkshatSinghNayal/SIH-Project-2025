import React from 'react';

type IconProps = { className?: string };

const base = (className = 'w-5 h-5') => ({
  className,
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.8,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const LogoMark: React.FC<IconProps> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" stroke="#8C7FA3" strokeWidth="1.4" opacity="0.45" />
    <circle cx="12" cy="12" r="6.5" fill="#6E8F7C" opacity="0.9" />
    <circle cx="12" cy="12" r="3" fill="#E4A94F" opacity="0.55" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M3.5 10.5 12 3.75l8.5 6.75V19.5a1.5 1.5 0 0 1-1.5 1.5h-4.5V15h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
  </svg>
);

export const ChatIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M8.25 21h-.5a36.6 36.6 0 0 1 3.75-3.25m0 0c.9-.7 1.5-1.6 1.5-2.75 0-3.04 2.46-5.5 5.5-5.5 1.16 0 2.23.36 3.12.97M12.75 3.09c.4-.06.81-.09 1.23-.09 4.14 0 7.5 3.36 7.5 7.5 0 .34-.02.67-.06 1M3 9.75a7.5 7.5 0 0 1 7.5-7.5c1.5 0 2.9.44 4.07 1.2" />
    <circle cx="18" cy="18" r="2.25" />
    <circle cx="16.5" cy="11.25" r="1.125" />
  </svg>
);

export const AnonIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M9 10.5h.01M15 10.5h.01M8.25 9.75c.6-1.5 2.4-2.25 3.75-2.25s3.15.75 3.75 2.25M9.5 15c.8.75 1.6 1.25 2.5 1.25s1.7-.5 2.5-1.25" />
  </svg>
);

export const ClipboardIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15" />
    <path d="M9 3.75h6v2.25H9zM9 11.25h6M9 15.75h4.5" />
  </svg>
);

export const SparkIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M12 3.75l1.9 4.6 4.6 1.9-4.6 1.9L12 16.75l-1.9-4.6-4.6-1.9 4.6-1.9L12 3.75ZM18.5 16l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
  </svg>
);

export const LeafIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M4.5 19.5C4.5 11 10.5 4.5 20.25 4.5c0 9.75-6.5 15.75-15.75 15.75" />
    <path d="M4.5 19.5C8 16 11 13 15 10.5" />
  </svg>
);

export const CommunityIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <circle cx="8.25" cy="8.25" r="3" />
    <circle cx="16.5" cy="9" r="2.25" />
    <path d="M3 19.5c0-2.9 2.35-5.25 5.25-5.25s5.25 2.35 5.25 5.25M14.25 14.5c2.6.3 4.5 2.45 4.5 5" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8.25" r="3.75" />
    <path d="M4.5 20.25c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97Z" />
  </svg>
);

export const LifelineIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M20.25 4.5c-1.5-1.5-4-1-6.5 1.5s-3 5-1.5 6.5m0 0L9 15.75c-.6-.6-1.5-.75-2.25-.3a3.6 3.6 0 0 1-4.2-.3C.9 13.6.8 11.5 2 10.3l1.7-1.7m4-4 1.7-1.7c1.2-1.2 3.3-1.1 4.85.55a3.6 3.6 0 0 1 .3 4.2c-.45.75-.3 1.65.3 2.25" />
    <circle cx="17.25" cy="17.25" r="3" />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M5.25 12h8.25M4.5 11.25 19.5 4.5l-4.5 15.75-3.75-6.75L4.5 11.25Z" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M4.5 7.5h15M9.75 7.5V5.25A1.5 1.5 0 0 1 11.25 3.75h1.5a1.5 1.5 0 0 1 1.5 1.5V7.5M6.5 7.5l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
  </svg>
);

export const MenuIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const HeartIcon: React.FC<IconProps & { filled?: boolean }> = ({ className, filled }) => (
  <svg {...base(className)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.1s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 9 5.7c1.2.15 2.3.85 3 1.9.7-1.05 1.8-1.75 3-1.9a4.4 4.4 0 0 1 4.5 4.4c0 5.4-7.5 10-7.5 10Z" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M4.5 12.75 9.5 17.5l10-11" />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M19.5 12H4.5m0 0 6.75-6.75M4.5 12l6.75 6.75" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75" />
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M5 21V4.5m0 0c2.5-1.5 5-1.5 7 0s4.5 1.5 7 1v9c-2.5.5-5 .5-7-1s-4.5-1.5-7 0" />
  </svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M3 3l18 18M10.6 10.7a2.25 2.25 0 0 0 3.1 3.1M7.4 7.5C5 9 3.5 11.3 3 12c1 1.7 4.5 6.75 9 6.75 1.7 0 3.2-.6 4.5-1.5m2.6-2.3c.9-1.1 1.5-2.2 1.9-2.95C19.4 10.3 15.9 5.25 11.4 5.25c-.8 0-1.6.15-2.3.4" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M6.75 10.5V8.25a5.25 5.25 0 0 1 10.5 0v2.25" />
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M12 15v2.25" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M10.2 9l5 3-5 3V9Z" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M3.75 5.25c0 8.25 6.75 15 15 15h1.5a1.5 1.5 0 0 0 1.5-1.5v-2.25c0-.65-.4-1.22-1-1.45l-3.6-1.35c-.5-.2-1.1-.1-1.5.3l-1.2 1.2a12.3 12.3 0 0 1-5.4-5.4l1.2-1.2c.4-.4.5-1 .3-1.5L8.3 3.6c-.23-.6-.8-1-1.45-1H5.25a1.5 1.5 0 0 0-1.5 1.5v1.15Z" />
  </svg>
);

export const WindIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M3 8.25h10.5a2.75 2.75 0 1 0-2.75-2.75M3 12h15.75a2.75 2.75 0 1 1-2.75 2.75M3 15.75h7.5a2.5 2.5 0 1 1-2.5 2.5" />
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ className }) => (
  <svg {...base(className)}>
    <path d="M12 6.75C10.5 5.25 8.25 4.5 4.5 4.5v13.5c3.75 0 6 .75 7.5 2.25 1.5-1.5 3.75-2.25 7.5-2.25V4.5c-3.75 0-6 .75-7.5 2.25Zm0 0v13.5" />
  </svg>
);
