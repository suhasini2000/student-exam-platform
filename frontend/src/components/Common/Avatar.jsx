import { useState, useEffect } from 'react';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const [error, setError] = useState(false);
  
  // Reset error if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  const initials = (name?.[0] || '?').toUpperCase();
  
  const sizeClasses = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-3xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (src && !error) {
    return (
      <img
        key={src} // Force re-mount on src change to clear any previous broken state
        src={src}
        alt="" // Empty alt to prevent "broken icon + alt text" cluster
        onError={() => setError(true)}
        className={`${currentSizeClass} rounded-full object-cover border border-gray-100 ${className}`}
      />
    );
  }

  return (
    <div className={`${currentSizeClass} rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 uppercase ${className}`}>
      {initials}
    </div>
  );
}
