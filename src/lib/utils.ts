import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isInAppBrowser(userAgent = navigator.userAgent) {
  const normalizedUserAgent = userAgent.toLowerCase();
  const inAppBrowserPatterns = [
    'line/',
    'fbav',
    'fb_iab',
    'fban',
    'fbios',
    'instagram',
    'micromessenger',
    'wechat',
    'messenger',
    'kakaotalk',
    'twitter',
    'linkedinapp',
    'pinterest',
    'snapchat',
    'tiktok',
  ];

  return inAppBrowserPatterns.some((pattern) => normalizedUserAgent.includes(pattern));
}

export function getExternalBrowserUrl(currentUrl = window.location.href) {
  const parsedUrl = new URL(currentUrl);
  const chromePath = `${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

  return {
    chrome: `googlechrome://${chromePath}`,
    chromeSecure: `googlechromes://${chromePath}`,
    currentUrl,
  };
}
