import { useState, useEffect } from 'react';
import { Loader, ScanEye, ArrowRightLeft, Sparkles, CheckCircle } from 'lucide-react';

const STEPS = [
  { text: 'Analyzing flock image...', icon: ScanEye },
  { text: 'Gemma is examining visual patterns...', icon: Sparkles },
  { text: 'Generating health assessment...', icon: CheckCircle },
];

const COMPARE_STEPS = [
  { text: 'Analyzing flock images...', icon: ScanEye },
  { text: 'Gemma is examining visual patterns...', icon: Sparkles },
  { text: 'Comparing with previous observation...', icon: ArrowRightLeft },
  { text: 'Generating health assessment...', icon: CheckCircle },
];

export default function AnalysisLoader({ mode = 'single' }) {
  const [step, setStep] = useState(0);
  const steps = mode === 'comparison' ? COMPARE_STEPS : STEPS;

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const CurrentIcon = steps[step].icon;

  return (
    <div className="card p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-5">
        {/* Animated ring */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <CurrentIcon className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-30" />
        </div>

        {/* Steps */}
        <div className="w-full max-w-xs">
          {steps.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 py-2 transition-all duration-500 ${
                  isActive ? 'opacity-100' : isDone ? 'opacity-40' : 'opacity-20'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : isActive ? (
                  <Loader className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span className={`text-sm ${isActive ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                  {s.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <p className="text-xs text-slate-400">
          Powered by Gemma 4 12B • Running locally
        </p>
      </div>
    </div>
  );
}
