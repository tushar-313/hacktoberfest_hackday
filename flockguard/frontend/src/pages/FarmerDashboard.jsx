import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Activity, AlertTriangle, Cpu, Zap,
  ScanEye, ArrowRightLeft, Play, Stethoscope,
  User, Truck, CheckCircle, RefreshCw
} from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import AnalysisResults from '../components/AnalysisResults';
import AnalysisLoader from '../components/AnalysisLoader';
import VetDashboard from '../components/VetDashboard';
import {
  checkHealth, analyzeImage, compareImages,
  createAlert, getAlerts, loadDemoImage
} from '../services/api';

const DEMO_CASES = [
  {
    name: 'Healthy → Concerning',
    description: 'Compare a healthy flock with a flock showing reduced activity',
    previous: 'healthy_flock.jpg',
    current: 'concerning_flock.jpg',
  },
  {
    name: 'Healthy → Moderate',
    description: 'Compare outdoor flock with indoor barn conditions',
    previous: 'healthy_flock.jpg',
    current: 'moderate_flock.jpg',
  },
  {
    name: 'Single Analysis',
    description: 'Analyze a single flock image for observations',
    previous: null,
    current: 'concerning_flock.jpg',
  },
];

export default function FarmerDashboard() {
  // Role
  const [role, setRole] = useState('farmer');

  // AI status
  const [aiStatus, setAiStatus] = useState({ running: false, checking: true });

  // Images
  const [currentImage, setCurrentImage] = useState(null);
  const [previousImage, setPreviousImage] = useState(null);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('single');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertCreated, setAlertCreated] = useState(false);
  const [vetStatus, setVetStatus] = useState(null);

  // Check AI health on mount
  useEffect(() => {
    const check = async () => {
      try {
        const data = await checkHealth();
        setAiStatus({
          running: data.ai?.ollama_running && data.ai?.gemma4_available,
          checking: false,
        });
      } catch {
        setAiStatus({ running: false, checking: false });
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Poll alerts for vet status
  useEffect(() => {
    if (role !== 'farmer' || !alertCreated) return;
    const interval = setInterval(async () => {
      try {
        const data = await getAlerts();
        setAlerts(data);
        const dispatched = data.find((a) => a.status === 'vet_dispatched');
        const resolved = data.find((a) => a.status === 'resolved');
        if (resolved) setVetStatus('resolved');
        else if (dispatched) setVetStatus('dispatched');
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [role, alertCreated]);

  // Handlers
  const handleAnalyze = useCallback(async () => {
    if (!currentImage) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let data;
      if (previousImage) {
        data = await compareImages(previousImage, currentImage);
        setAnalysisMode('comparison');
      } else {
        data = await analyzeImage(currentImage);
        setAnalysisMode('single');
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed. Ensure Ollama is running with gemma4:12b.');
    } finally {
      setAnalyzing(false);
    }
  }, [currentImage, previousImage]);

  const handleCreateAlert = useCallback(async (analysisResult) => {
    try {
      await createAlert({
        farm_id: 'A17',
        risk_level: analysisResult.risk_level,
        summary: analysisResult.summary,
        observations: analysisResult.observations,
        evidence: analysisResult.evidence,
        recommended_action: analysisResult.recommended_action,
      });
      setAlertCreated(true);
    } catch (err) {
      setError('Failed to create alert: ' + err.message);
    }
  }, []);

  const handleLoadDemo = useCallback(async (demo) => {
    try {
      if (demo.previous) {
        const prev = await loadDemoImage(demo.previous);
        setPreviousImage(prev);
      } else {
        setPreviousImage(null);
      }
      const curr = await loadDemoImage(demo.current);
      setCurrentImage(curr);
      setResult(null);
      setError(null);
      setAlertCreated(false);
      setVetStatus(null);
    } catch (err) {
      setError('Failed to load demo: ' + err.message);
    }
  }, []);

  const activeAlertCount = alerts.filter(
    (a) => a.status === 'pending' || a.status === 'vet_dispatched'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 leading-tight">FlockGuard</h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Local AI Health Monitoring
                </p>
              </div>
            </div>

            {/* AI Badge + Role Switcher */}
            <div className="flex items-center gap-4">
              {/* AI Status Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      aiStatus.checking ? 'bg-amber-400' : aiStatus.running ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  {aiStatus.running && (
                    <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>
                <span className="text-xs font-medium text-slate-600">
                  Gemma 4 12B
                </span>
                <span className="text-[10px] text-slate-400">
                  {aiStatus.checking ? 'Checking...' : aiStatus.running ? '• Local' : '• Offline'}
                </span>
              </div>

              {/* Role Switcher */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setRole('farmer')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    role === 'farmer'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Farmer
                </button>
                <button
                  onClick={() => setRole('vet')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer relative ${
                    role === 'vet'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  Veterinarian
                  {alertCreated && role !== 'vet' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                      !
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {role === 'vet' ? (
          <VetDashboard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Dashboard Cards + Upload */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dashboard Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Health Index */}
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {result
                          ? result.risk_level === 'LOW' ? '85' : result.risk_level === 'MODERATE' ? '62' : '35'
                          : '—'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">Health Index</p>
                    </div>
                  </div>
                </div>

                {/* Active Alerts */}
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">
                        {alertCreated ? activeAlertCount || 1 : 0}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">Active Anomalies</p>
                    </div>
                  </div>
                </div>

                {/* AI Status */}
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {aiStatus.running ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            Gemma 4
                          </span>
                        ) : (
                          <span className="text-red-500">Offline</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {aiStatus.running ? 'Running Locally' : 'Start Ollama'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vet Status Banner */}
              {vetStatus && (
                <div
                  className={`card p-4 flex items-center gap-3 border-l-4 animate-slide-up ${
                    vetStatus === 'dispatched' ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-slate-400 bg-slate-50'
                  }`}
                >
                  {vetStatus === 'dispatched' ? (
                    <>
                      <Truck className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Veterinarian Dispatched</p>
                        <p className="text-xs text-emerald-600">A veterinarian has accepted your alert and is on the way.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-700">Visit Completed</p>
                        <p className="text-xs text-slate-500">The veterinary visit has been marked as resolved.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Image Upload Section */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Flock Image Analysis</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Upload one or two images for AI-powered visual assessment
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Zap className="w-3.5 h-3.5" />
                    Powered by Gemma 4
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Previous / Baseline Image
                    </label>
                    <ImageUploader
                      label="Previous Flock Image"
                      image={previousImage}
                      onImageSelect={setPreviousImage}
                      onClear={() => setPreviousImage(null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Current Flock Image
                    </label>
                    <ImageUploader
                      label="Current Flock Image"
                      image={currentImage}
                      onImageSelect={setCurrentImage}
                      onClear={() => { setCurrentImage(null); setResult(null); }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {currentImage && previousImage && (
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Compare With Previous
                    </button>
                  )}
                  {currentImage && (
                    <button
                      onClick={() => { setPreviousImage(null); handleAnalyze(); }}
                      disabled={analyzing || (!currentImage)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        previousImage
                          ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                      }`}
                    >
                      <ScanEye className="w-4 h-4" />
                      Analyze Current Image
                    </button>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                    <p className="text-xs text-red-500 mt-1">
                      Make sure Ollama is running: <code className="bg-red-100 px-1.5 py-0.5 rounded">ollama run gemma4:12b</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {analyzing && <AnalysisLoader mode={previousImage ? 'comparison' : 'single'} />}
              {result && !analyzing && (
                <AnalysisResults result={result} onCreateAlert={handleCreateAlert} />
              )}

              {/* Alert Created Confirmation */}
              {alertCreated && !analyzing && (
                <div className="card p-5 border-l-4 border-l-emerald-500 bg-emerald-50 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Veterinary Alert Created</p>
                      <p className="text-xs text-emerald-600">
                        Your alert has been sent. Switch to the Veterinarian view to simulate the vet workflow.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column — Demo + Info */}
            <div className="space-y-6">
              {/* Demo Cases */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-700">Demo Cases</h3>
                </div>
                <div className="space-y-3">
                  {DEMO_CASES.map((demo, i) => (
                    <button
                      key={i}
                      onClick={() => handleLoadDemo(demo)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group cursor-pointer"
                    >
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">
                        {demo.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{demo.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">How It Works</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', text: 'Upload flock images' },
                    { step: '2', text: 'Gemma 4 analyzes locally' },
                    { step: '3', text: 'View observations & risk' },
                    { step: '4', text: 'Create vet alert if needed' },
                    { step: '5', text: 'Vet accepts & dispatches' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                        {item.step}
                      </div>
                      <p className="text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="card p-5 bg-emerald-50 border-emerald-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 mb-1">100% Local AI</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      All image analysis runs locally on your machine using Gemma 4 12B through Ollama.
                      Your data never leaves your device.
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="card p-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong>Disclaimer:</strong> FlockGuard provides AI-generated visual anomaly
                  detection and early-warning support. It does not provide veterinary diagnosis.
                  Always consult a qualified veterinarian for clinical assessment.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            FlockGuard • Local AI Poultry Health Early-Warning Platform
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            Gemma 4 12B via Ollama • All inference runs locally
          </p>
        </div>
      </footer>
    </div>
  );
}
