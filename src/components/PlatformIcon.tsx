import React from 'react';

interface PlatformIconProps {
  id: string;
  className?: string;
  size?: number;
}

export function PlatformIcon({ id, className = '', size = 20 }: PlatformIconProps) {
  const s = size;

  switch (id) {
    case 'youtube_1080p':
    case 'youtube_4k':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#FF0000" />
          <path d="M10 15.5V8.5L16 12L10 15.5Z" fill="white" />
        </svg>
      );

    case 'tiktok_vertical':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#000000" />
          <path
            d="M16.5 7.5C15.3 7.5 14.2 6.8 13.7 5.7H11.5V14.8C11.3 16 10.3 16.9 9 16.7C7.8 16.5 7 15.4 7.1 14.2C7.2 13 8.3 12.1 9.5 12.3V10.1C7.1 9.9 5.1 11.8 5 14.2C4.9 16.7 6.8 18.8 9.3 19C11.9 19.2 14.1 17.2 14.1 14.6V10C15.2 10.8 16.6 11.2 18 11.2V9C18 9 16.5 9 16.5 7.5Z"
            fill="white"
          />
          <path
            d="M16 7C15 7 14 6.4 13.5 5.5H12V14.5C11.8 15.6 10.9 16.4 9.8 16.3C8.7 16.1 8 15.1 8.1 14C8.2 12.9 9.2 12.1 10.3 12.3V10.3C8.1 10.1 6.3 11.8 6.2 14C6.1 16.3 7.8 18.2 10.1 18.4C12.4 18.6 14.4 16.8 14.4 14.5V9.8C15.4 10.5 16.7 10.9 18 10.9V8.9C18 8.9 16 8.9 16 7Z"
            fill="#25F4EE"
          />
        </svg>
      );

    case 'instagram_reel':
    case 'instagram_feed':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <defs>
            <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FED373" />
              <stop offset="25%" stopColor="#F15245" />
              <stop offset="50%" stopColor="#D92E7F" />
              <stop offset="75%" stopColor="#9B36B7" />
              <stop offset="100%" stopColor="#515ECF" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
          <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="white" strokeWidth="1.6" fill="none" />
          <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="1.6" fill="none" />
          <circle cx="15.8" cy="8.2" r="0.9" fill="white" />
        </svg>
      );

    case 'twitter_x':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#000000" />
          <path
            d="M14.7 7.5H16.8L12.2 12.8L17.6 19.5H13.4L10.1 15.2L6.3 19.5H4.2L9.1 13.9L3.9 7.5H8.2L11.2 11.5L14.7 7.5ZM13.9 18.2H15.1L7.7 8.7H6.4L13.9 18.2Z"
            fill="white"
          />
        </svg>
      );

    case 'discord_compress':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#5865F2" />
          <path
            d="M17.4 7.6C16.3 7.1 15.1 6.7 13.9 6.5C13.7 6.8 13.6 7.2 13.4 7.5C12.1 7.3 10.9 7.3 9.6 7.5C9.4 7.2 9.3 6.8 9.1 6.5C7.9 6.7 6.7 7.1 5.6 7.6C3.4 10.9 2.8 14.1 3.1 17.3C4.6 18.4 6 19.1 7.4 19.5C7.7 19.1 8 18.6 8.3 18.1C7.8 17.9 7.3 17.6 6.8 17.3C6.9 17.2 7.1 17.1 7.2 17C10.3 18.4 13.7 18.4 16.8 17C16.9 17.1 17.1 17.2 17.2 17.3C16.7 17.6 16.2 17.9 15.7 18.1C16 18.6 16.3 19.1 16.6 19.5C18 19.1 19.4 18.4 20.9 17.3C21.3 13.5 20.2 10.3 17.4 7.6ZM8.5 15.2C7.6 15.2 6.9 14.4 6.9 13.4C6.9 12.4 7.6 11.6 8.5 11.6C9.4 11.6 10.1 12.4 10.1 13.4C10.1 14.4 9.4 15.2 8.5 15.2ZM15.5 15.2C14.6 15.2 13.9 14.4 13.9 13.4C13.9 12.4 14.6 11.6 15.5 11.6C16.4 11.6 17.1 12.4 17.1 13.4C17.1 14.4 16.4 15.2 15.5 15.2Z"
            fill="white"
          />
        </svg>
      );

    case 'whatsapp_compress':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#25D366" />
          <path
            d="M17.5 6.5C16 5 14 4.1 11.9 4.1C7.6 4.1 4.1 7.6 4.1 11.9C4.1 13.3 4.5 14.6 5.1 15.7L4 20L8.4 18.9C9.5 19.5 10.7 19.8 11.9 19.8C16.2 19.8 19.7 16.3 19.7 12C19.7 9.9 18.9 7.9 17.5 6.5ZM11.9 18.5C10.7 18.5 9.6 18.2 8.6 17.6L8.4 17.5L5.7 18.2L6.4 15.6L6.2 15.4C5.6 14.3 5.3 13.2 5.3 12C5.3 8.3 8.3 5.3 12 5.3C13.8 5.3 15.5 6 16.8 7.3C18 8.6 18.7 10.2 18.7 12C18.6 15.6 15.6 18.5 11.9 18.5ZM15.6 13.7C15.4 13.6 14.4 13.1 14.2 13C14 12.9 13.9 12.9 13.8 13.1C13.6 13.3 13.3 13.7 13.2 13.8C13.1 13.9 13 14 12.8 13.9C12.6 13.8 12 13.6 11.2 12.9C10.6 12.4 10.2 11.7 10.1 11.5C10 11.3 10.1 11.2 10.2 11.1C10.3 11 10.4 10.9 10.5 10.8C10.6 10.7 10.6 10.6 10.7 10.5C10.8 10.4 10.7 10.3 10.7 10.2C10.6 10.1 10.2 9.1 10 8.7C9.8 8.3 9.7 8.3 9.5 8.3C9.4 8.3 9.3 8.3 9.1 8.3C9 8.3 8.8 8.4 8.6 8.6C8.4 8.8 7.9 9.3 7.9 10.3C7.9 11.3 8.7 12.3 8.8 12.4C8.9 12.5 10.3 14.7 12.5 15.6C14.3 16.4 14.7 16.2 15.1 16.1C15.6 16 16.6 15.4 16.8 14.8C17 14.2 17 13.8 16.9 13.7C16.8 13.8 15.8 13.8 15.6 13.7Z"
            fill="white"
          />
        </svg>
      );

    case 'podcast_master':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#8735FB" />
          <path
            d="M12 6.5C8.96 6.5 6.5 8.96 6.5 12C6.5 13.2 6.9 14.3 7.6 15.2L8.7 14.1C8.2 13.5 8 12.8 8 12C8 9.8 9.8 8 12 8C14.2 8 16 9.8 16 12C16 12.8 15.7 13.5 15.3 14.1L16.4 15.2C17.1 14.3 17.5 13.2 17.5 12C17.5 8.96 15.04 6.5 12 6.5Z"
            fill="white"
          />
          <circle cx="12" cy="12" r="2.2" fill="white" />
          <path d="M12 14.5V18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 18.5H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'high_res_mp3':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#F59E0B" />
          <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="2.5" fill="white" />
          <path d="M12 5V7M12 17V19M5 12H7M17 12H19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'extract_audio':
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#0EA5E9" />
          <path
            d="M5.5 12H7.5M8.5 9V15M11.5 6V18M14.5 8V16M17.5 10V14M19.5 12H20.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'archive_master':
    default:
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <rect width="24" height="24" rx="6" fill="#1E293B" />
          <rect x="5.5" y="6.5" width="13" height="11" rx="2" stroke="#FBBF24" strokeWidth="1.5" fill="none" />
          <path d="M9 6.5V17.5M15 6.5V17.5M5.5 10H9M15 10H18.5M5.5 14H9M15 14H18.5" stroke="#FBBF24" strokeWidth="1.2" />
        </svg>
      );
  }
}