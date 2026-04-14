import React, { useState } from 'react';
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
  onSelectPhase: (phase: PhaseName) => void;
  onSelectStep: (step: string) => void;
}

export function NavigationMap({ currentPhase, onSelectPhase, onSelectStep }: NavigationMapProps) {
  const [isOpen, setIsOpen] = useState(true);

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
                    {phase.steps.map((step) => (
                      <button
                        key={step}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStep(step);
                        }}
                        className={cn(
                          "text-xs px-2 py-1.5 rounded-full text-center transition-colors",
                          isActive
                            ? "bg-white dark:bg-zinc-800 text-orange-700 dark:text-orange-300 shadow-sm hover:bg-orange-100 dark:hover:bg-orange-900/50"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        {step}
                      </button>
                    ))}
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