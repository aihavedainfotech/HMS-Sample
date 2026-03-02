import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Brain,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Zap,
  Eye,
  X,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Anomaly {
  id: string;
  type: string;
  confidence: number;
  amount: number;
}

interface ForecastDay {
  day: string;
  amount: number;
}

interface AIPredictionData {
  collection_probability: number;
  predicted_revenue: number;
  anomalies_detected: Anomaly[];
  cash_flow_forecast: ForecastDay[];
}

export default function BillingAIPrediction() {
  const [data, setData] = useState<AIPredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  // AI Predictor State
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimatedBill, setEstimatedBill] = useState<number | null>(null);
  const [estimateForm, setEstimateForm] = useState({
    age: '',
    gender: 'Male',
    insurance: 'Yes',
    admission_type: 'Emergency',
    diagnosis: 'Other',
    risk_level: 'High'
  });

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateForm.age) return;

    setEstimateLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/ai-prediction/bill-estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: Number(estimateForm.age),
          gender: estimateForm.gender,
          insurance: estimateForm.insurance,
          admission_type: estimateForm.admission_type,
          diagnosis: estimateForm.diagnosis,
          risk_level: estimateForm.risk_level
        })
      });
      if (!response.ok) throw new Error('Prediction failed');
      const result = await response.json();
      if (result.estimated_bill) {
        setEstimatedBill(result.estimated_bill);
      }
    } catch (err) {
      console.error('Prediction API error:', err);
    } finally {
      setEstimateLoading(false);
    }
  };

  const fetchPredictions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/ai-prediction`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const result = await response.json();
      setData(result);
      setError('');
    } catch (err: any) {
      console.error('AI prediction fetch error:', err);
      setError(err.message || 'Failed to load AI predictions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(() => fetchPredictions(), 60000);
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge className="bg-green-100 text-green-700 border-green-200">High ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium ({confidence}%)</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-200">Low ({confidence}%)</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading AI predictions...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={() => fetchPredictions()} className="rounded-xl">Retry</Button>
      </div>
    );
  }

  const maxForecast = Math.max(...(data?.cash_flow_forecast || []).map(d => d.amount), 1);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .pred-card { animation: fadeUp 0.4s ease-out forwards; transition: all 0.3s ease; }
        .pred-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
        .anomaly-card { transition: all 0.2s ease; }
        .anomaly-card:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .bar-fill { transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-600" />
            AI Billing Insights
          </h1>
          <p className="text-gray-500 text-sm mt-1">Predictive analytics and anomaly detection for billing operations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPredictions(true)}
          disabled={refreshing}
          className="rounded-xl"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Collection Probability */}
        <Card className="pred-card border-0 shadow-sm overflow-hidden" style={{ animationDelay: '0ms' }}>
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-50 rounded-full opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Collection Rate</p>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data?.collection_probability || 0}%</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  Healthy
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${Math.min(data?.collection_probability || 0, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predicted Revenue */}
        <Card className="pred-card border-0 shadow-sm overflow-hidden" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-50 rounded-full opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Predicted Revenue</p>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{(data?.predicted_revenue || 0).toLocaleString()}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  Next 30 days forecast
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies Detected */}
        <Card className="pred-card border-0 shadow-sm overflow-hidden" style={{ animationDelay: '200ms' }}>
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-50 rounded-full opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Anomalies</p>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data?.anomalies_detected?.length || 0}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${(data?.anomalies_detected?.length || 0) > 0
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-green-600 bg-green-50'
                  }`}>
                  <Zap className="h-3 w-3" />
                  {(data?.anomalies_detected?.length || 0) > 0 ? 'Needs review' : 'All clear'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Avg */}
        <Card className="pred-card border-0 shadow-sm overflow-hidden" style={{ animationDelay: '300ms' }}>
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-50 rounded-full opacity-60" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Weekly Average</p>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ₹{Math.round(
                  (data?.cash_flow_forecast || []).reduce((sum, d) => sum + d.amount, 0) /
                  Math.max((data?.cash_flow_forecast || []).length, 1)
                ).toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  <Activity className="h-3 w-3" />
                  Per day average
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Forecast */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Cash Flow Forecast
            </div>
            <p className="text-xs text-gray-500 mt-1">Predicted daily revenue for the upcoming week</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3 h-48 pt-4">
              {(data?.cash_flow_forecast || []).map((day, i) => {
                const pct = (day.amount / maxForecast) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{(day.amount / 1000).toFixed(0)}K
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden relative" style={{ height: '100%' }}>
                      <div
                        className="bar-fill absolute bottom-0 left-0 right-0 rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 group-hover:from-blue-600 group-hover:to-blue-500 transition-colors"
                        style={{ height: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{day.day}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Anomalies */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Anomaly Detection
              </div>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {data?.anomalies_detected?.length || 0} found
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">AI-detected billing irregularities</p>
          </CardHeader>
          <CardContent>
            {(data?.anomalies_detected || []).length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <p className="text-gray-500 font-medium">No anomalies detected</p>
                <p className="text-xs text-gray-400 mt-1">All billing operations look normal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.anomalies_detected || []).map((anomaly, i) => (
                  <div
                    key={i}
                    className="anomaly-card p-4 rounded-xl border border-gray-100 cursor-pointer"
                    onClick={() => setSelectedAnomaly(anomaly)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${anomaly.confidence >= 80 ? 'bg-red-100' : 'bg-amber-100'
                          }`}>
                          <AlertTriangle className={`h-5 w-5 ${anomaly.confidence >= 80 ? 'text-red-500' : 'text-amber-500'
                            }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900">{anomaly.type}</h4>
                          <p className="text-xs text-gray-400">Invoice: {anomaly.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-gray-900">₹{(anomaly.amount || 0).toLocaleString()}</p>
                        {getConfidenceBadge(anomaly.confidence)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Bill Estimator Form */}
      <Card className="border-0 shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-lg font-bold text-indigo-900">
            <Zap className="h-6 w-6 text-indigo-600" />
            AI Bill Estimator (XGBoost Model)
          </div>
          <p className="text-sm text-indigo-700 mt-1">
            Predict total hospital bills instantly using machine learning based on demographic and medical risk factors.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <form onSubmit={handlePredict} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Patient Age</label>
                  <input
                    type="number"
                    required
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    placeholder="e.g. 45"
                    value={estimateForm.age}
                    onChange={(e) => setEstimateForm({ ...estimateForm, age: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Gender</label>
                  <select
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={estimateForm.gender}
                    onChange={(e) => setEstimateForm({ ...estimateForm, gender: e.target.value })}
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Has Insurance?</label>
                  <select
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={estimateForm.insurance}
                    onChange={(e) => setEstimateForm({ ...estimateForm, insurance: e.target.value })}
                  >
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Admission Type</label>
                  <select
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={estimateForm.admission_type}
                    onChange={(e) => setEstimateForm({ ...estimateForm, admission_type: e.target.value })}
                  >
                    <option>Emergency</option>
                    <option>Planned</option>
                    <option>OPD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Primary Diagnosis</label>
                  <select
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={estimateForm.diagnosis}
                    onChange={(e) => setEstimateForm({ ...estimateForm, diagnosis: e.target.value })}
                  >
                    <option>Heart Attack</option>
                    <option>Fracture</option>
                    <option>Fever</option>
                    <option>Surgery</option>
                    <option value="Other">Other (General)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Risk Level</label>
                  <select
                    className="w-full rounded-xl border-gray-200 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={estimateForm.risk_level}
                    onChange={(e) => setEstimateForm({ ...estimateForm, risk_level: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={estimateLoading}
                className="w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6"
              >
                {estimateLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Brain className="h-5 w-5 mr-2" />
                )}
                Generate Prediction
              </Button>
            </form>

            <div className="flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-md rounded-2xl border border-indigo-100 h-full min-h-[250px] relative overflow-hidden">
              {estimatedBill ? (
                <div className="text-center z-10 animate-in zoom-in duration-500">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 shadow-sm">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Estimated Total Bill</p>
                  <h3 className="text-5xl font-black text-indigo-900 drop-shadow-sm">
                    ₹{estimatedBill.toLocaleString()}
                  </h3>
                  <p className="mt-4 text-xs font-medium text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-full inline-block">
                    Based on historical ML models
                  </p>
                </div>
              ) : (
                <div className="text-center z-10 opacity-70">
                  <Activity className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
                  <p className="text-indigo-800 font-medium">Waiting for input...</p>
                  <p className="text-sm text-indigo-500 mt-1 max-w-[200px] mx-auto text-center">Fill out the form and hit Predict to see the estimate.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Insights */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Collection Insights
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700 uppercase">Payment Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-800">{data?.collection_probability || 0}%</p>
              <p className="text-xs text-green-600 mt-1">Probability of collection on pending bills</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase">Growth Projection</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">+15%</p>
              <p className="text-xs text-blue-600 mt-1">Expected revenue growth next 30 days</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase">Risk Score</span>
              </div>
              <p className="text-2xl font-bold text-purple-800">
                {(data?.anomalies_detected?.length || 0) > 2 ? 'High' :
                  (data?.anomalies_detected?.length || 0) > 0 ? 'Low' : 'None'}
              </p>
              <p className="text-xs text-purple-600 mt-1">Overall billing risk assessment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detail Dialog */}
      <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Anomaly Details
            </DialogTitle>
          </DialogHeader>
          {selectedAnomaly && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">₹{(selectedAnomaly.amount || 0).toLocaleString()}</p>
                <p className="text-xs text-amber-600 mt-1">Flagged Amount</p>
                <div className="mt-2">{getConfidenceBadge(selectedAnomaly.confidence)}</div>
              </div>
              <div className="space-y-3">
                {[
                  ['Invoice ID', selectedAnomaly.id],
                  ['Anomaly Type', selectedAnomaly.type],
                  ['Confidence', `${selectedAnomaly.confidence}%`],
                  ['Amount', `₹${(selectedAnomaly.amount || 0).toLocaleString()}`],
                  ['Action Required', selectedAnomaly.confidence >= 80 ? 'Immediate Review' : 'Monitor'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-medium">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSelectedAnomaly(null)}>Close</Button>
                <Button className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Investigate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
