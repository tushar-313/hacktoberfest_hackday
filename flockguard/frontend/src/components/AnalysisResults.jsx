import { Shield, AlertTriangle, AlertCircle, CheckCircle, Eye, ArrowRight } from 'lucide-react';

const riskConfig = {
  LOW: { class: 'risk-low', icon: CheckCircle, label: 'Low Risk', color: '#059669' },
  MODERATE: { class: 'risk-moderate', icon: Eye, label: 'Moderate Risk', color: '#d97706' },
  HIGH: { class: 'risk-high', icon: AlertTriangle, label: 'High Anomaly Risk', color: '#dc2626' },
  CRITICAL: { class: 'risk-critical', icon: AlertCircle, label: 'Critical Risk', color: '#dc2626' },
};

const severityColors = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export default function AnalysisResults({ result, onCreateAlert }) {
  if (!result) return null;

  const risk = riskConfig[result.risk_level] || riskConfig.MODERATE;
  const RiskIcon = risk.icon;

  return (
    <div className="animate-slide-up space-y-5">
      {/* Summary & Risk */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {result.mode === 'comparison' ? 'Flock Change Detection' : 'Flock Analysis'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{result.summary}</p>
          </div>
          <span className={`risk-badge ${risk.class}`}>
            <RiskIcon className="w-3.5 h-3.5" />
            {risk.label}
          </span>
        </div>

        {/* Health Index */}
        <div className="flex items-center gap-4 mt-4 p-4 rounded-xl" style={{ background: `${risk.color}08` }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
            style={{ background: risk.color }}
          >
            {result.risk_level === 'LOW' ? '85' : result.risk_level === 'MODERATE' ? '62' : result.risk_level === 'HIGH' ? '35' : '15'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Health Index</p>
            <p className="text-xs text-slate-500">Based on visible observations</p>
          </div>
        </div>
      </div>

      {/* Observations */}
      {result.observations?.length > 0 && (
        <div className="card p-6">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            AI Observations
          </h4>
          <div className="space-y-3">
            {result.observations.map((obs, i) => {
              const sev = severityColors[obs.severity] || severityColors.medium;
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${sev.bg} ${sev.border} animate-fade-in`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h5 className={`font-semibold text-sm ${sev.text}`}>{obs.title}</h5>
                    <span className={`text-xs font-medium uppercase ${sev.text} opacity-70`}>
                      {obs.severity} risk
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{obs.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidence */}
      {result.evidence?.length > 0 && (
        <div className="card p-6">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Visual Evidence
          </h4>
          <div className="space-y-2">
            {result.evidence.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Action */}
      <div className="card p-6 border-l-4 border-l-amber-400">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          Recommended Action
        </h4>
        <p className="text-sm text-slate-700 leading-relaxed">{result.recommended_action}</p>
      </div>

      {/* AI Disclaimer */}
      <div className="card p-4 bg-slate-50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              AI Uncertainty Notice
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">{result.uncertainty}</p>
            <p className="text-xs text-slate-400 mt-1 italic">
              This AI system provides visual anomaly detection and early-warning support. It does not provide veterinary diagnosis.
            </p>
          </div>
        </div>
      </div>

      {/* Create Alert Button */}
      {(result.risk_level === 'HIGH' || result.risk_level === 'CRITICAL' || result.risk_level === 'MODERATE') && (
        <button
          onClick={() => onCreateAlert(result)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-200 hover:shadow-red-300 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" />
          Create Veterinary Alert
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
