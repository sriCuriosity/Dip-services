import React from 'react';

export const SunsetPageBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff8c00] via-[#ffb347] to-[#ffcc33]" />
      
      {/* Sun */}
      <div className="absolute top-[20%] left-[55%] w-32 h-32 bg-[#fffbe6] rounded-full blur-xl opacity-80 shadow-[0_0_60px_#fffbe6]" />
      
      {/* Mountains */}
      <div className="absolute bottom-[40%] left-0 w-full h-[30%]">
        <div 
          className="absolute bottom-0 left-[-10%] w-[50%] h-full bg-[#d2691e] opacity-60"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
        <div 
          className="absolute bottom-0 left-[20%] w-[60%] h-[80%] bg-[#e67e22] opacity-70"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
        <div 
          className="absolute bottom-0 right-[-10%] w-[50%] h-[90%] bg-[#cd853f] opacity-50"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
      </div>

      {/* Tree Silhouette */}
      <div className="absolute bottom-[40%] left-[35%] w-2 h-16 bg-[#5d4037] opacity-80">
        <div className="absolute top-[-15px] left-[-10px] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-[#5d4037]" />
        <div className="absolute top-[-30px] left-[-8px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-[#5d4037]" />
      </div>

      {/* Water / Reflection Area */}
      <div className="absolute bottom-0 left-0 w-full h-[40%] bg-[#ffcc33] opacity-90">
        {/* Subtle ripples */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          {[20, 40, 60, 80].map((top, i) => (
             <div key={i} className="absolute left-1/2 -translate-x-1/2 w-[80%] h-[2px] bg-white rounded-full blur-[1px]" style={{ top: `${top}%`, opacity: 1 - top/100 }} />
          ))}
        </div>
        
        {/* Reflections */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 scale-y-[-1] origin-top blur-sm">
           <div 
            className="absolute top-0 left-[20%] w-[60%] h-[80%] bg-[#e67e22]"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
          />
        </div>
      </div>
      
      {/* Subtle haze */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px]" />
    </div>
  );
};
