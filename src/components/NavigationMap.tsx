import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type PhaseName = 'Recognition' | 'Evaluation' | 'Diagnosis';
export const PHASES: { name: PhaseName; steps: string[] }[] = [
  {
    name: 'Recognition',
    steps: ['Name Findings', 'Understand Concern', 'Assess Cognition', 'Assess Function'],
  },
  {
    name: 'Evaluation',
    steps: [
      'Assess Cognition',
      'Assess Function',
      'Assess Safety',
      'Targeted Exam',
      'Labs and Imaging',
      'Medication Review',
      'Name Condition',
    ],
  },
  {
    name: 'Diagnosis',
    steps: [
      'Assess and Align Understanding',
      'Address Risks and Concerns',
      'Apply Diagnosis',
      'Plan Follow-up',
      'Stage Condition',
    ],
  },
];

interface NavigationMapProps {
  currentPhase: PhaseName | null;
  currentStep: string | null;
  detectedPhase: PhaseName | null;
  onSelectPhase: (phase: PhaseName) => void;
  onSelectStep: (step: string) => void;
}

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export function NavigationMap({
  currentPhase,
  currentStep,
  detectedPhase,
  onSelectPhase,
  onSelectStep,
}: NavigationMapProps) {
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [isOpen, setIsOpen] = useState(() => !isMobileViewport());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    const applyViewportMode = (matches: boolean) => {
      setIsMobile(matches);
      setIsOpen(!matches);
    };
    const handleChange = (event: MediaQueryListEvent) => {
      applyViewportMode(event.matches);
    };

    applyViewportMode(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="text-xs uppercase tracking-widest">Navigation Map</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          !isOpen && detectedPhase ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="mx-4 mb-2 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-950/40 px-3 py-2 text-xs text-orange-800 dark:text-orange-200 shadow-sm backdrop-blur-sm">
          <span className="font-semibold">Current phase:</span> {detectedPhase}
        </div>
      </div>

      {/* Collapsible content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="overflow-x-auto p-4">
          <div className="flex gap-4 md:gap-6 w-max px-2 md:px-0 md:mx-auto">
            {PHASES.map((phase) => {
              const isActive = currentPhase === phase.name;
              return (
                <div
                  key={phase.name}
                  className={cn(
                    "flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                    isActive
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700"
                  )}
                  onClick={() => onSelectPhase(phase.name)}
                >
                  <h3 className={cn(
                    "font-semibold text-lg text-center",
                    isActive ? "text-orange-600 dark:text-orange-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {phase.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {phase.steps.map((step) => {
                      const isStepActive = currentStep === step;
                      return (
                        <button
                          key={step}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStep(step);
                          }}
                          className={cn(
                            "text-xs px-2 py-1.5 rounded-full text-center transition-all ring-offset-1 dark:ring-offset-zinc-900",
                            isStepActive
                              ? "bg-orange-600 text-white shadow-md ring-2 ring-orange-400 dark:ring-orange-500 font-semibold scale-[1.03]"
                              : isActive
                                ? "bg-white dark:bg-zinc-800 text-orange-700 dark:text-orange-300 shadow-sm hover:bg-orange-100 dark:hover:bg-orange-900/50"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          )}
                        >
                          {step}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}