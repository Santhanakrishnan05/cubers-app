import React from 'react';
import { User } from 'lucide-react';

const Avatar = ({ src, size = 'md', className = '' }) => {
  const sizes = {
    sm: { container: 'w-7 h-7', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  };

  const s = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        className={`${s.container} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${s.container} rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 ${className}`}>
      <User className={`${s.icon} text-slate-400`} />
    </div>
  );
};

export default Avatar;
