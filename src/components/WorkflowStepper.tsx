"use client";

import React from 'react';
import { WorkflowStep } from '@/lib/types';
import { Check } from 'lucide-react';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
}

const STEPS: { id: WorkflowStep; number: string; label: string }[] = [
  { id: 'import', number: '1', label: 'Import' },
  { id: 'destination', number: '2', label: 'Choose destination' },
  { id: 'review', number: '3', label: 'Review changes' },
  { id: 'convert', number: '4', label: 'Convert' },
  { id: 'export', number: '5', label: 'Export & reuse' },
];

export function WorkflowStepper({ currentStep, completedSteps }: WorkflowStepperProps) {
  return (
    <nav aria-label="Conversion workflow" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-2 min-w-max">
        {STEPS.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id) && !isCurrent;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-[#0B6FFB] text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
                </span>
                <span>{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <span className="w-4 h-px bg-slate-200 shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
