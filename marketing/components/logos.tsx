export function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6a2 2 0 012-2h2v12H4a2 2 0 01-2-2V6z" fill="#EA4335" />
      <path d="M22 6a2 2 0 00-2-2h-2v12h2a2 2 0 002-2V6z" fill="#34A853" />
      <path d="M6 4h12v12H6z" fill="#FBBC04" />
      <path d="M12 10l-6-6h12l-6 6z" fill="#C5221F" />
    </svg>
  );
}

export function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="18" rx="2" fill="#fff" stroke="#4285F4" strokeWidth="2" />
      <path d="M2 9h20" stroke="#4285F4" strokeWidth="2" />
      <rect x="5" y="12" width="3" height="3" fill="#EA4335" />
      <rect x="10" y="12" width="3" height="3" fill="#FBBC04" />
      <rect x="15" y="12" width="3" height="3" fill="#34A853" />
    </svg>
  );
}

export function IcloudPhotosIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 18a4 4 0 000-8 4.5 4.5 0 00-8.7-1.5A5 5 0 002 11.5 5 5 0 007 18h11z"
        fill="#3b82f6"
        fillOpacity="0.2"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoogleMapsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8.7 2 6 4.7 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z"
        fill="#4285F4"
      />
      <circle cx="12" cy="8" r="2.5" fill="#fff" />
    </svg>
  );
}

export function TripitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#f97316" />
      <path d="M8 12l3-3 5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="14" height="14" rx="2" fill="#0078D4" />
      <path d="M16 8l6-3v14l-6-3V8z" fill="#0078D4" />
      <path d="M5 9h4v2H5V9zm0 4h6v2H5v-2z" fill="#fff" />
    </svg>
  );
}
