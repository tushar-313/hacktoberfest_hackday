import { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, Eye, MapPin,
  UserCheck, Truck, RefreshCw, Stethoscope
} from 'lucide-react';
import { getAlerts, updateAlert } from '../services/api';

const statusConfig = {
  pending: { label: 'Pending Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  acknowledged: { label: 'Acknowledged', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  vet_dispatched: { label: 'Veterinarian Dispatched', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-slate-500', bg: 'bg-slate-50' },
};

const riskBg = {
  LOW: 'border-l-emerald-500',
  MODERATE: 'border-l-amber-500',
  HIGH: 'border-l-red-500',
  CRITICAL: 'border-l-red-600',
};

export default function VetDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState(null);

  const fetchAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch {
      // Silently fail on fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptVisit = async (alertId) => {
    try {
      await updateAlert(alertId, 'vet_dispatched');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await updateAlert(alertId, 'resolved');
      fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="shimmer h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-7 h-7 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">No Active Alerts</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          When farmers create veterinary alerts, they will appear here for review.
        </p>
        <button
          onClick={fetchAlerts}
          className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Incoming Farm Alerts ({alerts.length})
        </h3>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {alerts.map((alert) => {
        const status = statusConfig[alert.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const isExpanded = expandedAlert === alert.id;

        return (
          <div
            key={alert.id}
            className={`card border-l-4 ${riskBg[alert.risk_level] || 'border-l-slate-300'} overflow-hidden animate-fade-in`}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800">Farm #{alert.farm_id}</h4>
                      <span className={`risk-badge risk-${alert.risk_level?.toLowerCase()}`}>
                        {alert.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${status.bg}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-600 mb-3">{alert.summary}</p>

              {/* Observations */}
              {alert.observations?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Observed</p>
                  <ul className="space-y-1">
                    {alert.observations.slice(0, isExpanded ? undefined : 3).map((obs, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                        {obs.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expanded Evidence */}
              {isExpanded && alert.evidence?.length > 0 && (
                <div className="mb-3 animate-fade-in">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evidence</p>
                  <div className="space-y-1.5">
                    {alert.evidence.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  {isExpanded ? 'Hide' : 'View'} Evidence
                </button>

                {alert.status === 'pending' && (
                  <button
                    onClick={() => handleAcceptVisit(alert.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md shadow-emerald-200 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    Accept Visit
                  </button>
                )}

                {alert.status === 'vet_dispatched' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved
                  </button>
                )}

                {alert.status === 'vet_dispatched' && (
                  <div className="flex items-center gap-1.5 ml-auto text-sm text-emerald-600 font-medium">
                    <Truck className="w-4 h-4" />
                    Veterinarian Dispatched
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
