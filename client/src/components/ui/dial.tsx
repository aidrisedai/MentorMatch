import * as React from "react";
import { cn } from "@/lib/utils";

interface DialProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Dial({ value, min = 0, max = 500, onChange, className }: DialProps) {
  const dialRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const percentage = ((value - min) / (max - min)) * 100;
  // Rotation from -135deg to 135deg (270 degree arc)
  const rotation = (percentage / 100) * 270 - 135;

  const handleInteraction = React.useCallback((clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate angle from center to mouse/touch position
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let degrees = (angle * 180) / Math.PI + 90;
    
    // Normalize degrees to our -135 to 135 range
    if (degrees < -135) degrees += 360;
    if (degrees > 135) degrees = degrees > 180 ? -135 : 135;
    
    const newPercentage = ((degrees + 135) / 270) * 100;
    const newValue = Math.round(min + (newPercentage / 100) * (max - min));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    onChange(clampedValue);
  }, [min, max, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    handleInteraction(touch.clientX, touch.clientY);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleInteraction]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        ref={dialRef}
        className="relative w-32 h-32 cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background Track */}
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
            strokeDasharray="197"
            strokeDashoffset="49"
            strokeLinecap="round"
            className="opacity-20"
          />
          {/* Active Track */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#dialGradient)"
            strokeWidth="6"
            strokeDasharray="197"
            strokeDashoffset={197 - (percentage / 100) * 148}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
          <defs>
            <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
        </svg>

        {/* Rotary Knob */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="relative w-24 h-24 rounded-full bg-card border-4 border-border shadow-[0_10px_20px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center transition-transform duration-75">
             {/* Indicator dot */}
            <div className="absolute top-2 w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))] " />
            {/* Grip texture (optional) */}
            <div className="w-16 h-16 rounded-full border border-dashed border-muted-foreground/20" />
          </div>
        </div>

        {/* Value Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-heading text-foreground">${value}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Max</span>
        </div>
      </div>
      
      <div className="flex justify-between w-full text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-4">
        <span>Min</span>
        <span>Max</span>
      </div>
    </div>
  );
}
