import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollWheelSelectorProps {
  options: string[];
  selectedOptions: string[];
  onToggle: (option: string) => void;
  className?: string;
}

export function ScrollWheelSelector({ options, selectedOptions, onToggle, className }: ScrollWheelSelectorProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const itemHeight = 48; // h-12 is 48px

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleToggle = (option: string, index: number) => {
    onToggle(option);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={cn("relative h-64 overflow-hidden rounded-xl border bg-card/30 perspective-1000", className)}>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth py-24 custom-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {options.map((option, index) => {
          const isSelected = selectedOptions.includes(option);
          const distance = Math.abs(index - scrollTop / itemHeight);
          const rotateX = Math.max(-45, Math.min(45, (index - scrollTop / itemHeight) * 25));
          const opacity = Math.max(0.1, 1 - distance * 0.4);
          const scale = Math.max(0.8, 1 - distance * 0.1);

          return (
            <div
              key={option}
              onClick={() => handleToggle(option, index)}
              className={cn(
                "flex h-12 snap-center items-center justify-center px-4 transition-all duration-75 cursor-pointer text-center select-none",
                isSelected ? "text-primary font-bold" : "text-muted-foreground"
              )}
              style={{
                transform: `rotateX(${rotateX}deg) scale(${scale})`,
                opacity: opacity,
                transformOrigin: 'center center'
              }}
            >
              <span className="text-sm tracking-tight">{option}</span>
              {isSelected && <div className="ml-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
            </div>
          );
        })}
      </div>
      {/* Selection Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-[90%] border-y border-primary/20 bg-primary/5 rounded-md shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]" />
      </div>
      {/* Fade Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-card/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/80 to-transparent" />
    </div>
  );
}
