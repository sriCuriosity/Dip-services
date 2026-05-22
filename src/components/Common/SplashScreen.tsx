import { motion } from 'framer-motion';
import { useEffect } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, []); // Only on mount to ensure reliability

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]"
    >
        {/* Soft glowing background focus */}
        <div className="absolute w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex flex-col items-center relative z-10">
            {/* The Main Logo Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.23, 1, 0.32, 1], // Super smooth custom ease
                delay: 0.2
              }}
              className="relative"
            >
                <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
                    <motion.img
                      src="/splash.png"
                      alt="DIP Services"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/icon.png";
                      }}
                    />
                </div>
                {/* Glossy reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-[2.5rem]" />
            </motion.div>

            {/* App Name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-8 flex flex-col items-center gap-2"
            >
                <h1 className="text-white text-3xl font-black tracking-[0.2em] drop-shadow-lg">
                    DIP SERVICE
                </h1>
                <div className="h-1 w-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
            </motion.div>
        </div>
    </motion.div>
  );
}
