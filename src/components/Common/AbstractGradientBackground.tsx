import React from 'react';

export const AbstractGradientBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-gradient-to-br from-emerald-50 to-green-100">
      {/* Subtle Green Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-200/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-60" />
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-green-200/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-80" />
      <div className="absolute top-[20%] left-[20%] w-[80%] h-[80%] bg-emerald-100/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[70%] h-[70%] bg-green-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-emerald-50/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70" />

      {/* Subtle Geometric Accents */}
      <div className="absolute top-[10%] left-[-5%] w-40 h-40 rounded-full border-[1px] border-emerald-200/20" />
      <div className="absolute top-[20%] right-[15%] w-20 h-20 rounded-full border-[1px] border-green-300/10" />
      <div className="absolute bottom-[25%] right-[-5%] w-40 h-40 rounded-full border-[1px] border-emerald-300/10" />
    </div>
  );
};
