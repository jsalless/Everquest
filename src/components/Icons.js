import React from 'react';
import { SvgXml } from 'react-native-svg';

const BACK_ARROW_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 19L8 12L15 5" stroke="#04083E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const USER_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="6" r="3.6" fill="#04083E"/>
  <path d="M3.2 17.2C3.2 13.9 6.24 11.5 10 11.5C13.76 11.5 16.8 13.9 16.8 17.2C16.8 17.75 16.35 18.2 15.8 18.2H4.2C3.65 18.2 3.2 17.75 3.2 17.2Z" fill="#04083E"/>
</svg>`;

const EMAIL_SVG = `<svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1.2" y="1.2" width="19.6" height="15.6" rx="2.2" stroke="#04083E" stroke-width="1.8"/>
  <path d="M1.8 2.2L11 9.8L20.2 2.2" stroke="#04083E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const LOCK_SVG = `<svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 8V5.8C6 3.59086 7.79086 1.8 10 1.8C12.2091 1.8 14 3.59086 14 5.8V8" stroke="#04083E" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="2.5" y="8" width="15" height="12.5" rx="2.5" fill="#04083E"/>
  <circle cx="10" cy="13.2" r="1.4" fill="#FFFFFF"/>
  <path d="M10 14.2V16.8" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const EYE_OPEN_SVG = `<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1.5 8C3.2 4.1 6.3 2 10 2C13.7 2 16.8 4.1 18.5 8C16.8 11.9 13.7 14 10 14C6.3 14 3.2 11.9 1.5 8Z" stroke="#3B3B3B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="8" r="2.6" stroke="#3B3B3B" stroke-width="1.5"/>
</svg>`;

const EYE_CLOSED_SVG = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1.5 9C3.2 5.1 6.3 3 10 3C13.7 3 16.8 5.1 18.5 9C16.8 12.9 13.7 15 10 15C6.3 15 3.2 12.9 1.5 9Z" stroke="#3B3B3B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="9" r="2.6" stroke="#3B3B3B" stroke-width="1.5"/>
  <path d="M3 16L17 2" stroke="#3B3B3B" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
</svg>`;

export function BackArrowIcon({ width = 22, height = 22 }) {
  return <SvgXml xml={BACK_ARROW_SVG} width={width} height={height} />;
}

export function UserIcon({ width = 19, height = 19 }) {
  return <SvgXml xml={USER_SVG} width={width} height={height} />;
}

export function EmailIcon({ width = 20, height = 16 }) {
  return <SvgXml xml={EMAIL_SVG} width={width} height={height} />;
}

export function LockIcon({ width = 19, height = 21 }) {
  return <SvgXml xml={LOCK_SVG} width={width} height={height} />;
}

export function EyeIcon({ visible = false, width = 19, height = 16 }) {
  return <SvgXml xml={visible ? EYE_CLOSED_SVG : EYE_OPEN_SVG} width={width} height={height} />;
}

export function GoogleIcon({ width = 18, height = 18 }) {
  return <SvgXml xml={GOOGLE_SVG} width={width} height={height} />;
}
