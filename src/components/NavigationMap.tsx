import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type PhaseName = 'Recognition' | 'Evaluation' | 'Naming & Diagnosis';

const STEPS = [
  'Understand Concern',
  'Assess Function',
  'Assess Cognition',
  'Name Findings',
  'Assess Safety',
  'Targeted Exam',
  'Labs and Imaging',
  'Medication Review',
  'Name Condition',
  'Assess and Align Understanding',
  'Address Risks and Concerns',
  'Apply Diagnosis',
  'Stage Condition',
  'Plan Follow-up',
];

const PHASES = [
  {
    name: 'Recognition' as PhaseName,
    subtitle: 'Is there a cognitive problem?',
    color: 'teal',
    start: 0,
    end: 4,
  },
  {
    name: 'Evaluation' as PhaseName,
    subtitle: 'What do we know about the problem?',
    color: 'emerald',
    start: 1,
    end: 8,
  },
  {
    name: 'Naming & Diagnosis' as PhaseName,
    subtitle: 'What do we call the problem?',
    color: 'orange',
    start: 9,
    end: 14,
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
  const [isOpen, setIsOpen] = useState(() => !isMobileViewport());

  const activePhase = currentPhase || detectedPhase;
  const visiblePhase = detectedPhase || currentPhase;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsOpen(!e.matches);

    if (media.addEventListener) {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  const COLS = STEPS.length;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">

      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Clinical Workflow Map
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!isOpen && visiblePhase && (
        <div className="mx-4 mb-2 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-950/40 px-3 py-2 text-xs text-orange-800 dark:text-orange-200 shadow-sm backdrop-blur-sm">
          <span className="font-semibold">Current phase:</span> {visiblePhase}
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[650px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="overflow-x-auto px-4 pb-4">

          {/* GRID */}
          <div
            className="grid gap-x-2 gap-y-3"
            style={{ gridTemplateColumns: `200px repeat(${COLS}, minmax(72px, 1fr))` }}
          >

            {/* STEP HEADER ROW (more vertical space for readability) */}
            <div />
            {STEPS.map((step) => (
              <div
                key={step}
                className="flex items-end justify-center h-16 pb-2"
              >
                <div className="text-[9px] text-center text-zinc-400 leading-tight rotate-[-35deg] origin-bottom whitespace-nowrap">
                  {step}
                </div>
              </div>
            ))}

            {/* PHASE ROWS */}
            {PHASES.map((phase) => {
              const isActive = activePhase === phase.name;

              return (
                <React.Fragment key={phase.name}>

                  {/* LABEL */}
                  <div
                    onClick={() => onSelectPhase(phase.name)}
                    className={cn(
                      "flex flex-col justify-center px-2 py-2 rounded-lg cursor-pointer transition",
                      "text-xs leading-tight",
                      phase.color === 'teal' && "bg-blue-50 text-teal-900 dark:bg-teal-900/20 dark:text-teal-200",
                      phase.color === 'emerald' && "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200",
                      phase.color === 'orange' && "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-200",
                      isActive && "ring-2 ring-orange-400"
                    )}
                  >
                    <div className="font-semibold text-[10px] uppercase">
                      {phase.name}
                    </div>
                    <div className="text-[9px] opacity-70">
                      {phase.subtitle}
                    </div>
                  </div>

                  {/* STEPS ROW */}
                  {STEPS.map((step, i) => {
                    const inPhase = i >= phase.start && i <= phase.end;
                    const isStepActive = currentStep === step;

                    return (
                      <div
                        key={step}
                        className="flex items-center justify-center h-10 relative"
                      >
                        {/* vertical guide */}
                        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-zinc-200 dark:border-zinc-700" />

                        {inPhase && (
                          <button
                            onClick={() => onSelectStep(step)}
                            className={cn(
                              "w-4 h-4 rounded-full transition z-10",
                              isStepActive
                                ? "bg-orange-500 scale-125"
                                : "bg-zinc-300 dark:bg-zinc-700 hover:bg-orange-400"
                            )}
                            title={step}
                          />
                        )}
                      </div>
                    );
                  })}

                </React.Fragment>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
