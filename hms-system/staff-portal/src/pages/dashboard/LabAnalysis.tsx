import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileBarChart, Calendar, User, Activity, Search,
  CheckCircle, AlertTriangle, AlertCircle, Loader2, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface TestResult {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
}

interface TestReport {
  order_id: string;
  db_id: number;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  test_name: string;
  test_type: string;
  test_date: string;
  test_completed_at: string;
  status: string;
  test_results: TestResult[];
}

export default function LabAnalysis() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Lab Analysis Socket Connected'));

    const handleRefresh = () => fetchReports();

    newSocket.on('lab:status_updated', (data) => {
      if (data.status === 'Results_Entered') {
        handleRefresh();
        toast.info('📊 Test results entered and ready for analysis!');
      }
    });

    newSocket.on('lab:stats_updated', handleRefresh);

    fetchReports();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/results-entered`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setReports(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAnalyze = (report: TestReport) => {
    setSelectedReport(report);
    // Auto-generate initial findings based on results
    const criticals = report.test_results.filter(r => r.status === 'critical');
    const abnormals = report.test_results.filter(r => r.status === 'abnormal');
    const normals = report.test_results.filter(r => r.status === 'normal');

    let auto = '';
    if (criticals.length > 0) {
      auto += `CRITICAL: ${criticals.map(c => `${c.parameter} (${c.value} ${c.unit})`).join(', ')} — requires immediate attention.\n\n`;
    }
    if (abnormals.length > 0) {
      auto += `ABNORMAL: ${abnormals.map(a => `${a.parameter} (${a.value} ${a.unit}, ref: ${a.reference_range})`).join(', ')} — outside normal range.\n\n`;
    }
    if (normals.length > 0) {
      auto += `NORMAL: ${normals.map(n => n.parameter).join(', ')} — within normal ranges.`;
    }
    setFindings(auto || 'All parameters within normal limits.');

    let recs = '';
    if (criticals.length > 0) recs = 'Urgent medical consultation recommended. Repeat testing in 24-48 hours.';
    else if (abnormals.length > 0) recs = 'Follow-up appointment recommended. Consider lifestyle modifications.';
    else recs = 'Continue routine monitoring. No immediate intervention required.';
    setRecommendations(recs);

    setShowAnalysis(true);
  };

  const submitAnalysis = async () => {
    if (!selectedReport || !findings.trim()) {
      toast.error('Please enter analysis findings');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('hms_staff_token');

      // Post analysis report with correct order_id format (LAB-{db_id})
      const res = await fetch(`${API_URL}/lab/analysis-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: `LAB-${selectedReport.db_id}`,
          patient_id: selectedReport.patient_id,
          analysis_data: {
            analysis_summary: findings,
            recommendations: recommendations.split('\n').filter(r => r.trim()),
          },
          findings,
          recommendations: recommendations.split('\n').filter(r => r.trim()),
          test_results: selectedReport.test_results
        })
      });

      if (res.ok) {
        toast.success('✅ Analysis complete! Navigating to Reports...');
        setShowAnalysis(false);
        setSelectedReport(null);
        setFindings('');
        setRecommendations('');
        // Navigate to reports page after a short delay
        setTimeout(() => navigate('/lab/results'), 800);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit analysis');
      }
    } catch (e) { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const getStatusIcon = (s: string) => {
    if (s === 'critical') return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (s === 'abnormal') return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-800';
    if (s === 'abnormal') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex mb-12 items-center justify-between flex-wrap gap-8"
      >
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/lab')}
            className="w-14 h-14 rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-100 p-0 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="h-7 w-7" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Lab Analysis</h1>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] ml-5">Result Verification Protocol — Phase 4</p>
          </div>
        </div>
        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors duration-300" />
          <Input
            placeholder="Search patient ID or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-16 bg-white border-slate-200 rounded-[2rem] focus-visible:ring-2 focus-visible:ring-purple-500/20 shadow-xl shadow-slate-200/40 border-0 transition-all duration-300 placeholder:text-slate-400 font-medium"
          />
        </div>
      </motion.div>

      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {reports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100 shadow-sm"
            >
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <FileBarChart className="h-12 w-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Queue is Clear</h3>
              <p className="text-slate-500 max-w-xs mx-auto font-medium">All entered results have been analyzed and verified for today.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Awaiting Final Verification ({reports.length})
                </h2>
              </div>
              {reports.filter(r => !searchQuery || r.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.patient_id?.toLowerCase().includes(searchQuery.toLowerCase())).map((report, idx) => (
                <motion.div
                  key={report.order_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-3xl transition-all duration-500 border-l-[6px] border-l-transparent hover:border-l-purple-600">
                    <CardContent className="p-10">
                      <div className="flex items-start justify-between flex-wrap gap-8">
                        <div className="flex-1 min-w-[300px]">
                          <div className="flex items-center gap-5 mb-6">
                            <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xl shadow-purple-100/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                              <FileBarChart className="h-8 w-8" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{report.order_id}</h3>
                                <Badge className="bg-purple-50 text-purple-600 border-purple-100 rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase shadow-sm">
                                  RESULTS READY
                                </Badge>
                              </div>
                              <p className="text-xl font-black text-slate-800 tracking-tight group-hover:text-purple-600 transition-colors duration-300">{report.test_name}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                <User className="h-5 w-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patient Details</p>
                                <p className="text-sm font-bold text-slate-700">{report.patient_name} ({report.patient_id})</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ordering Physician</p>
                                <p className="text-sm font-bold text-slate-700">Dr. {report.doctor_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Process Stage</p>
                                <p className="text-sm font-bold text-emerald-600">Results Entered</p>
                              </div>
                            </div>
                          </div>

                          {/* Quick Result Preview */}
                          <div className="mt-8 flex gap-3 flex-wrap">
                            {report.test_results.slice(0, 4).map((r, i) => (
                              <Badge key={i} variant="outline" className={`rounded-xl px-4 py-2 border-0 flex items-center gap-2 shadow-sm ${getStatusColor(r.status)}`}>
                                {getStatusIcon(r.status)}
                                <span className="font-bold text-[11px]">{r.parameter}: {r.value}</span>
                                <span className="text-[10px] opacity-70 font-medium">{r.unit}</span>
                              </Badge>
                            ))}
                            {report.test_results.length > 4 && (
                              <Badge variant="outline" className="rounded-xl px-4 py-2 border-2 border-slate-50 bg-white text-slate-400 font-bold text-[10px]">
                                +{report.test_results.length - 4} MORE
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] justify-center h-full sm:pt-4 lg:pt-0">
                          <Button
                            onClick={() => handleAnalyze(report)}
                            className="w-full bg-slate-900 text-white hover:bg-purple-600 h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-sm shadow-xl shadow-slate-200 transition-all duration-300 hover:-translate-y-1 active:scale-95"
                          >
                            <Activity className="h-5 w-5" />
                            ANALYZE DATA
                          </Button>
                          <div className="flex items-center justify-center gap-2 py-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{report.test_date}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Analysis Protocol Modal */}
      <AnimatePresence>
        {showAnalysis && selectedReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 overflow-y-auto py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="w-full max-w-5xl"
            >
              <Card className="border-0 shadow-3xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="p-10 pb-6 border-b-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="bg-purple-600 w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-200 group transition-transform hover:scale-110 duration-500">
                        <FileBarChart className="h-8 w-8 text-white transition-transform group-hover:rotate-12" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Analysis Protocol</h2>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-50 text-purple-600 border-0 rounded-lg px-2.5 py-1 font-black text-[10px] tracking-widest uppercase">
                            {selectedReport.order_id}
                          </Badge>
                          <span className="text-slate-300">|</span>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedReport.test_name}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowAnalysis(false); setSelectedReport(null); }}
                      className="w-12 h-12 rounded-full p-0 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <X className="h-6 w-6 text-slate-400" />
                    </Button>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subject</p>
                        <p className="text-sm font-bold text-slate-900">{selectedReport.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6 hidden md:flex">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Activity className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Physician</p>
                        <p className="text-sm font-bold text-slate-900">Dr. {selectedReport.doctor_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6 hidden lg:flex">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Calendar className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Analysis Date</p>
                        <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-10 pt-4 space-y-10">
                  {/* Results Display */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-1">Verified Laboratory Measurements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedReport.test_results.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-6 rounded-[2rem] border-2 transition-all duration-300 hover:shadow-xl ${r.status === 'critical' ? 'bg-red-50 border-red-100 hover:shadow-red-100/50' :
                              r.status === 'abnormal' ? 'bg-amber-50 border-amber-100 hover:shadow-amber-100/50' :
                                'bg-slate-50 border-slate-100 hover:shadow-slate-100/50'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{r.parameter}</p>
                            {getStatusIcon(r.status)}
                          </div>
                          <p className={`text-2xl font-black tracking-tight mb-1 ${r.status === 'critical' ? 'text-red-600' :
                              r.status === 'abnormal' ? 'text-amber-600' :
                                'text-slate-900'
                            }`}>
                            {r.value} <span className="text-sm font-medium opacity-60 tracking-normal">{r.unit}</span>
                          </p>
                          <div className="flex items-center justify-between opacity-60">
                            <span className="text-[10px] font-black uppercase tracking-widest">Reference</span>
                            <span className="text-[10px] font-bold">{r.reference_range}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis Inputs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Findings</h4>
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                      </div>
                      <textarea
                        value={findings}
                        onChange={e => setFindings(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] p-8 min-h-[180px] text-sm font-bold text-slate-700 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-500/5 transition-all outline-none shadow-inner"
                        placeholder="Detail the significance of the measured parameters..."
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Technician Recommendations</h4>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <textarea
                        value={recommendations}
                        onChange={e => setRecommendations(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] p-8 min-h-[180px] text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-inner"
                        placeholder="Suggest follow-up actions or immediate interventions..."
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      variant="ghost"
                      className="h-16 flex-1 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all"
                      onClick={() => { setShowAnalysis(false); setSelectedReport(null); }}>
                      ABORT ANALYSIS
                    </Button>
                    <Button
                      className="h-16 flex-[2] rounded-2xl bg-slate-900 hover:bg-purple-600 text-white font-black shadow-xl shadow-slate-200 transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                      onClick={submitAnalysis}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-3" /> VERIFYING...</>
                      ) : (
                        <><CheckCircle className="h-5 w-5 mr-3" /> FINALIZE REPORT & VERIFY</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
