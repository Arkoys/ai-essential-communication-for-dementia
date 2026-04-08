import React from 'react';
import { cn } from '../lib/utils';

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
  return (
    <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 overflow-x-auto">
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
  );
}
