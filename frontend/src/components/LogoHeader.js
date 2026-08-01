import React from 'react';

export const LogoHeader = ({ title, subtitle }) => {
  return (
    <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-200">
      {/* Logo */}
      <div className="shrink-0">
        <img
          src="/logo.jpg"
          alt="PBPA Logo"
          className="h-20 w-auto object-contain rounded-lg shadow-sm"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Title Section */}
      <div className="flex-1">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-slate-600">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
