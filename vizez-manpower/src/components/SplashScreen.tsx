
import React, { useEffect, useState, useRef } from "react";
import VizezManpowerLogo from "./VizezManpowerLogo";
import { Loader2 } from "lucide-react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Show splash for 2.5 seconds, then fade out
    const timer1 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    const timer2 = setTimeout(() => {
      handleComplete();
    }, 2500);

    // If it takes longer than 3 seconds (e.g. slow hydration/compilation), show the skip button
    const timer3 = setTimeout(() => {
      setShowSkip(true);
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []); // Empty dependency array prevents restarting the timer if parent re-renders

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onCompleteRef.current();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050507] transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-64 max-w-[80vw]">
        <VizezManpowerLogo animate={true} />
      </div>

      <div className="absolute bottom-20 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-[var(--accent)] text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Starting Vizez Brain...</span>
        </div>

        {showSkip && (
          <button 
            onClick={handleComplete}
            className="px-6 py-2 rounded-full border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors animate-fade-in"
          >
            Enter App
          </button>
        )}
      </div>
    </div>
  );
}

