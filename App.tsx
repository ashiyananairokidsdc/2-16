
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Calendar, Clipboard, Camera, Database, Search, 
  CheckCircle2, Clock, Trash2, FileText, AlertCircle, Settings, X, 
  CloudUpload, Check, LogOut, User as UserIcon, Lock, TrendingUp,
  Edit2, Save, ArrowUp, ArrowDown, GripVertical, Info
} from 'lucide-react';
import { PatientRecord, TreatmentStep, PStepStatus, DEFAULT_P_FLOW, PatientFile, User } from './types.ts';
import { analyzeStepData } from './geminiService.ts';
import { syncToGoogleSheet } from './sheetService.ts';

// --- Utility Functions ---

const calculateAge = (birthDateStr: string): number | null => {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// --- Auth Component ---

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;
    const users: User[] = JSON.parse(localStorage.getItem('p-support-users') || '[]');
    if (isSignup) {
      if (users.find(u => u.name === name)) {
        setError('この名前は登録済みです');
        return;
      }
      const newUser = { name, password };
      localStorage.setItem('p-support-users', JSON.stringify([...users, newUser]));
      onLogin(newUser);
    } else {
      const user = users.find(u => u.name === name && u.password === password);
      if (user) onLogin(user);
      else setError('認証に失敗しました');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-5 rounded-3xl mb-4 text-white shadow-xl shadow-blue-200">
            <Database size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">P-Support</h1>
          <p className="text-slate-400 text-sm font-medium">Periodontal Care Manager</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
            <input 
              type="text" placeholder="名前" required
              className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" placeholder="パスワード" required
              className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
          <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-100 active:scale-[0.98]">
            {isSignup ? 'アカウントを作成' : 'ログイン'}
          </button>
        </form>
        <button onClick={() => setIsSignup(!isSignup)} className="w-full mt-6 text-xs text-slate-400 hover:text-blue-600 transition font-bold">
          {isSignup ? '← ログイン画面へ戻る' : '新規アカウント登録はこちら'}
        </button>
      </div>
    </div>
  );
};

// --- Dashboard ---

const PatientList = ({ patients }: { patients: PatientRecord[] }) => {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p => p.name.includes(search) || p.patientId.includes(search));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">患者リスト</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 flex items-center">
            <UserIcon size={14} className="mr-1.5" /> 現在 {patients.length} 名のデータが登録されています
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder="名前・カルテIDで検索"
            className="w-full pl-12 pr-6 py-4 border-none rounded-[1.5rem] outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium text-sm transition-all"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-24 text-center border border-dashed border-slate-200">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-300" size={40} />
          </div>
          <p className="text-slate-400 font-bold text-lg tracking-tight">患者データが見つかりません</p>
          <p className="text-slate-300 text-sm mt-1">新しい患者を登録して治療を開始しましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(p => {
            const age = calculateAge(p.birthDate);
            const completedCount = p.plan.filter(s => s.status === '完了').length;
            const progressPercent = p.plan.length > 0 ? Math.round((completedCount / p.plan.length) * 100) : 0;
            const currentStep = p.plan.find(s => s.status === '実施中')?.label || '全工程完了';

            return (
              <Link key={p.id} to={`/patient/${p.id}`} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden flex flex-col">
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl tracking-tighter uppercase shadow-sm">ID: {p.patientId}</span>
                    <div className="flex items-center text-slate-300 group-hover:text-blue-600 transition-colors">
                      <span className="text-xs font-black mr-1">{progressPercent}%</span>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1.5 tracking-tight group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  <p className="text-sm font-semibold text-slate-400 mb-8">
                    {p.birthDate ? `${p.birthDate.replace(/-/g, '/')} (${age}歳)` : '生年月日未登録'}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <TrendingUp size={12} className="mr-2 text-blue-500" /> 現在のフェーズ
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-all">
                      <p className="text-sm font-bold text-slate-700 truncate">{currentStep}</p>
                    </div>
                    
                    <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-6">
                      <div 
                        className="absolute h-full bg-blue-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50/80 backdrop-blur-sm px-8 py-4 border-t border-slate-100 flex justify-between items-center group-hover:bg-white transition-all">
                   <div className="flex items-center text-[10px] font-black text-slate-400">
                     <Clock size={12} className="mr-1.5" /> 最終更新: {p.lastVisit}
                   </div>
                   <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm ${progressPercent === 100 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                     {progressPercent === 100 ? 'Completed' : 'On Track'}
                   </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Detail ---

const PatientDetail = ({ patients, onUpdate, onDelete }: { patients: PatientRecord[], onUpdate: (p: PatientRecord) => void, onDelete: (id: string) => void }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Modals and Edit States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPlanEditMode, setIsPlanEditMode] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<PatientRecord>>({});

  useEffect(() => {
    if (patient) {
      if (!activeId) {
        setActiveId(patient.plan.find(s => s.status === '実施中')?.id || patient.plan[0]?.id || null);
      }
      setEditingPatient(patient);
    }
  }, [patient]);

  if (!patient) return <Navigate to="/" />;

  const age = calculateAge(patient.birthDate);
  const activeStep = patient.plan.find(s => s.id === activeId) || patient.plan[0];
  const completedCount = patient.plan.filter(s => s.status === '完了').length;
  const progressPercent = patient.plan.length > 0 ? Math.round((completedCount / patient.plan.length) * 100) : 0;

  const handleUpdateStep = (updates: Partial<TreatmentStep>) => {
    const newPlan = patient.plan.map(s => s.id === activeId ? { ...s, ...updates } : s);
    onUpdate({ ...patient, plan: newPlan, lastVisit: new Date().toLocaleDateString('ja-JP') });
  };

  const handleSaveProfile = () => {
    onUpdate({ ...patient, ...editingPatient, lastVisit: new Date().toLocaleDateString('ja-JP') });
    setIsProfileModalOpen(false);
  };

  const handleUpdatePlan = (newPlan: TreatmentStep[]) => {
    onUpdate({ ...patient, plan: newPlan, lastVisit: new Date().toLocaleDateString('ja-JP') });
  };

  const addStep = () => {
    const newStep: TreatmentStep = {
      id: Date.now().toString(),
      label: '新しい治療フェーズ',
      status: PStepStatus.PENDING,
      notes: '',
      files: []
    };
    handleUpdatePlan([...patient.plan, newStep]);
  };

  const removeStep = (sid: string) => {
    if (patient.plan.length <= 1) return;
    if (confirm('この工程を削除しますか？これまでの記録（メモ、写真）はすべて消去されます。')) {
      const newPlan = patient.plan.filter(s => s.id !== sid);
      handleUpdatePlan(newPlan);
      if (activeId === sid) setActiveId(newPlan[0].id);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...patient.plan];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlan.length) return;
    [newPlan[index], newPlan[targetIndex]] = [newPlan[targetIndex], newPlan[index]];
    handleUpdatePlan(newPlan);
  };

  const renameStep = (sid: string, newLabel: string) => {
    const newPlan = patient.plan.map(s => s.id === sid ? { ...s, label: newLabel } : s);
    handleUpdatePlan(newPlan);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h *= MAX / w; w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const url = canvas.toDataURL('image/jpeg', 0.8);
        const newFile: PatientFile = { id: Date.now().toString(), url, name: file.name, type: 'image', date: new Date().toLocaleDateString() };
        handleUpdateStep({ files: [...activeStep.files, newFile] });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const runAi = async () => {
    setIsAnalyzing(true);
    setAiResult(null);
    const res = await analyzeStepData(patient, activeStep);
    setAiResult(res);
    setIsAnalyzing(false);
  };

  const sync = async () => {
    setIsSyncing(true);
    try {
      await syncToGoogleSheet(patient);
      alert("クラウド同期が完了しました");
    } catch (e) {
      alert("同期に失敗しました");
    }
    setIsSyncing(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Dynamic Header */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 -z-0" />
        
        <div className="relative z-10 flex-1">
          <button onClick={() => navigate('/')} className="text-[10px] font-black text-slate-400 hover:text-blue-600 mb-6 flex items-center transition-all uppercase tracking-[0.2em]">
            <ChevronRight className="rotate-180 mr-2" size={12} /> Back to Dashboard
          </button>
          
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <h2 className="text-5xl font-black text-slate-800 tracking-tighter">{patient.name}</h2>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-blue-200">ID: {patient.patientId}</span>
              <button onClick={() => setIsProfileModalOpen(true)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-[1.2rem] transition-all bg-slate-50 border border-transparent hover:border-blue-100">
                <Edit2 size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-8 text-sm font-bold text-slate-500 bg-slate-50/50 w-fit p-2 px-5 rounded-2xl border border-slate-100">
            <span className="flex items-center"><Calendar size={18} className="mr-2 text-blue-500" /> {patient.birthDate ? `${patient.birthDate.replace(/-/g, '/')} (${age}歳)` : '生年月日未登録'}</span>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center"><Clock size={18} className="mr-2 text-slate-400" /> Last Visit: {patient.lastVisit}</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <button onClick={sync} disabled={isSyncing} className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-[1.5rem] text-sm font-black flex items-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 disabled:opacity-50">
            <CloudUpload size={20} className="mr-2.5 text-blue-600" /> クラウド同期
          </button>
          <button onClick={() => {if(confirm('患者データを永久に削除しますか？')) { onDelete(patient.id); navigate('/'); }}} className="p-4 text-red-400 hover:text-white hover:bg-red-500 rounded-[1.5rem] transition-all border border-transparent hover:shadow-xl hover:shadow-red-100">
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Enhanced Roadmap Timeline */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl h-fit sticky top-28 overflow-visible">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
              <TrendingUp size={14} className="mr-2 text-blue-600" /> Roadmap
            </h3>
            <button 
              onClick={() => setIsPlanEditMode(!isPlanEditMode)}
              className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm border ${isPlanEditMode ? 'bg-green-600 border-green-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'}`}
            >
              {isPlanEditMode ? '編集を完了' : '計画を編集'}
            </button>
          </div>

          <div className="relative space-y-4 max-h-[65vh] overflow-y-auto pr-4 custom-scrollbar -mr-4">
            {/* Connecting Line - Visual Guide */}
            <div className="absolute left-[23.5px] top-6 bottom-6 w-1 bg-slate-100 -z-0 rounded-full" />
            
            {patient.plan.map((s, i) => (
              <div key={s.id} className="relative group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-6 py-1">
                  {/* Timeline Node */}
                  <div className="relative flex-shrink-0 mt-1">
                    <button 
                      onClick={() => !isPlanEditMode && setActiveId(s.id)}
                      disabled={isPlanEditMode}
                      className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                        s.status === '完了' ? 'bg-green-500 text-white shadow-lg shadow-green-100 border-2 border-white' : 
                        s.status === '実施中' ? 'bg-blue-600 text-white ring-8 ring-blue-50 shadow-xl shadow-blue-200 border-2 border-white scale-110' : 
                        'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {s.status === '完了' ? <Check size={20} strokeWidth={4} /> : 
                       s.status === '実施中' ? <div className="animate-pulse flex items-center justify-center"><CheckCircle2 size={20} strokeWidth={3} /></div> :
                       <span className="text-[10px] font-black">{i + 1}</span>}
                    </button>
                    {/* Active Line Segment */}
                    {i < patient.plan.length - 1 && (
                      <div className={`absolute left-1/2 -translate-x-1/2 top-12 h-8 w-1 -z-0 ${s.status === '完了' && patient.plan[i+1].status !== '未着手' ? 'bg-green-400' : 'bg-slate-100'}`} />
                    )}
                  </div>
                  
                  {/* Phase Card */}
                  <div className={`flex-1 p-5 rounded-[1.8rem] transition-all duration-500 border-2 flex flex-col gap-2 ${
                    activeId === s.id && !isPlanEditMode ? 'bg-white border-blue-600 shadow-2xl shadow-blue-50 -translate-y-1' : 
                    isPlanEditMode ? 'bg-slate-50 border-slate-100' : 'bg-white border-transparent hover:bg-slate-50/50'
                  }`}>
                    {isPlanEditMode ? (
                      <div className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={s.label}
                          onChange={(e) => renameStep(s.id, e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => moveStep(i, 'up')} disabled={i === 0} className="p-2 text-slate-400 hover:text-blue-500 disabled:opacity-20 transition-colors"><ArrowUp size={16}/></button>
                          <button onClick={() => moveStep(i, 'down')} disabled={i === patient.plan.length - 1} className="p-2 text-slate-400 hover:text-blue-500 disabled:opacity-20 transition-colors"><ArrowDown size={16}/></button>
                          <button onClick={() => removeStep(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setActiveId(s.id)} className="cursor-pointer">
                        <h4 className={`text-sm font-black transition-colors ${activeId === s.id ? 'text-blue-700' : 'text-slate-800'}`}>{s.label}</h4>
                        <div className="flex justify-between items-center mt-2">
                           <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            s.status === '完了' ? 'bg-green-100 text-green-700' : 
                            s.status === '実施中' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                          }`}>{s.status}</span>
                          {s.notes && <div className="text-[10px] text-slate-300 flex items-center"><FileText size={10} className="mr-1"/> 記録あり</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isPlanEditMode && (
              <button 
                onClick={addStep}
                className="w-full mt-6 py-5 border-4 border-dashed border-slate-50 rounded-[2rem] text-slate-300 text-[11px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-slate-50 hover:text-slate-400 hover:border-slate-100 transition-all active:scale-95"
              >
                <Plus size={18} className="mr-2" /> Add New Phase
              </button>
            )}
          </div>
          
          <div className="mt-12 pt-8 border-t-2 border-slate-50">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Progress</span>
              <span className="text-blue-600 font-black text-3xl tracking-tighter">{progressPercent}%</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
               <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-[1.5s] ease-out shadow-lg" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Right: Focused Detail Area */}
        <div className="lg:col-span-8 space-y-10 animate-in fade-in slide-in-from-right duration-500">
          {!activeStep ? (
            <div className="bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-slate-100">
              <Clipboard size={48} className="mx-auto mb-4 text-slate-100" />
              <p className="text-slate-400 font-black text-xl tracking-tight">治療フェーズを選択してください</p>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[70vh] flex flex-col">
              {/* Step Header */}
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.8rem] bg-white shadow-xl flex items-center justify-center text-blue-600 border border-slate-100 rotate-3">
                    <Clipboard size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{activeStep.label}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status Management</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-[1.4rem] border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-3">Phase Status</span>
                  <select 
                    value={activeStep.status} onChange={e => handleUpdateStep({ status: e.target.value as any })}
                    className="text-xs font-black border-none rounded-xl px-5 py-2.5 outline-none bg-blue-600 text-white shadow-lg shadow-blue-100 transition-all cursor-pointer appearance-none pr-8 relative"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px' }}
                  >
                    {Object.values(PStepStatus).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              
              {/* Step Content */}
              <div className="p-10 flex-1 space-y-12">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                      <FileText size={16} className="mr-2 text-blue-500" /> Clinical Findings
                    </label>
                    <textarea 
                      className="w-full h-[400px] p-8 bg-slate-50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-base leading-relaxed font-medium placeholder:text-slate-300"
                      placeholder="診察時の所見、TBI内容、歯周ポケットの状態などを詳細に記録してください..."
                      value={activeStep.notes}
                      onChange={e => handleUpdateStep({ notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                        <Camera size={16} className="mr-2 text-blue-500" /> Visual Records
                      </label>
                      <label className="cursor-pointer bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black hover:bg-black transition-all shadow-xl active:scale-95 flex items-center uppercase tracking-widest">
                        <Plus size={14} className="mr-2" /> Upload
                        <input type="file" className="hidden" onChange={handleFile} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeStep.files.map(f => (
                        <div key={f.id} className="relative group rounded-[2rem] overflow-hidden border-4 border-white aspect-video shadow-lg hover:shadow-2xl transition-all duration-500">
                          <img src={f.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                             <span className="text-[10px] text-white font-bold">{f.date}</span>
                             <button onClick={() => handleUpdateStep({ files: activeStep.files.filter(x => x.id !== f.id) })} className="bg-red-500 text-white p-2.5 rounded-2xl transform hover:scale-110 transition-transform shadow-lg">
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        </div>
                      ))}
                      {activeStep.files.length === 0 && (
                        <div className="col-span-2 py-32 text-center bg-slate-50 border-4 border-dashed border-white rounded-[3rem] text-slate-300">
                          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50">
                            <Camera size={32} className="opacity-20" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest">No Photos Recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Assistant Section */}
                <div className="pt-10 border-t-2 border-slate-50">
                  <button 
                    onClick={runAi} 
                    disabled={isAnalyzing}
                    className="w-full bg-slate-900 text-white py-6 rounded-[2.2rem] font-black flex items-center justify-center hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-[0.99] disabled:opacity-50 group"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center"><div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin mr-3" /> 分析中です...</div>
                    ) : (
                      <><AlertCircle size={22} className="mr-3 text-blue-400 group-hover:rotate-12 transition-transform" /> Gemini AI 分析・診断レポート生成</>
                    )}
                  </button>
                  {aiResult && (
                    <div className="mt-8 p-10 bg-blue-50/30 border-2 border-blue-100 rounded-[3rem] text-sm text-slate-700 whitespace-pre-wrap leading-relaxed animate-in fade-in zoom-in-95 duration-500 relative">
                      <div className="absolute -top-5 left-10 bg-white border-2 border-blue-100 px-6 py-2 rounded-2xl shadow-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                           <Database size={16} />
                         </div>
                         <p className="font-black text-blue-900 tracking-tight uppercase text-xs">AI Insight Report</p>
                      </div>
                      <div className="mt-4 font-medium prose prose-slate">
                        {aiResult}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Modals */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Edit Patient Profile</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">プロフィール情報の更新</p>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="bg-slate-50 p-3 rounded-2xl text-slate-300 hover:text-slate-600 transition-all active:scale-90"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Chart ID / カルテID</label>
                <input 
                  type="text" 
                  value={editingPatient.patientId || ''} 
                  onChange={e => setEditingPatient({...editingPatient, patientId: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Full Name / 患者氏名</label>
                <input 
                  type="text" 
                  value={editingPatient.name || ''} 
                  onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Birth Date / 生年月日</label>
                <input 
                  type="date" 
                  value={editingPatient.birthDate || ''} 
                  onChange={e => setEditingPatient({...editingPatient, birthDate: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" 
                />
              </div>
              <div className="pt-8">
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-blue-600 text-white py-5 rounded-[1.8rem] font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const s = sessionStorage.getItem('p-auth');
    return s ? JSON.parse(s) : null;
  });
  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const s = localStorage.getItem('p-patients');
    return s ? JSON.parse(s) : [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('p-patients', JSON.stringify(patients));
  }, [patients]);

  const addPatient = (name: string, pid: string, bday: string) => {
    if (!name || !pid) return;
    const newP: PatientRecord = {
      id: Date.now().toString(),
      patientId: pid, 
      name, 
      birthDate: bday,
      createdAt: new Date().toLocaleDateString('ja-JP'),
      lastVisit: new Date().toLocaleDateString('ja-JP'),
      plan: DEFAULT_P_FLOW.map((l, i) => ({
        id: `${Date.now()}-${i}`, label: l, notes: '', files: [],
        status: i === 0 ? PStepStatus.IN_PROGRESS : PStepStatus.PENDING
      }))
    };
    setPatients([newP, ...patients]);
    setIsModalOpen(false);
  };

  if (!user) return <LoginPage onLogin={u => { setUser(u); sessionStorage.setItem('p-auth', JSON.stringify(u)); }} />;

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#fcfdfe] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700">
        <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 px-8 py-5">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-blue-600 group">
              <div className="bg-blue-600 text-white p-2.5 rounded-[1.2rem] group-hover:rotate-[15deg] transition-transform duration-500 shadow-lg shadow-blue-100">
                <Database size={24} /> 
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl text-slate-800 tracking-tighter leading-none">P-Support</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 ml-0.5">Clinical Pro</span>
              </div>
            </Link>
            <div className="flex items-center gap-10">
              <div className="hidden md:flex items-center gap-4 bg-slate-50 p-1.5 px-4 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-md">
                   {user.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-800 tracking-tight leading-none">{user.name} 先生</span>
                  <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Active Now</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-8 py-3 rounded-[1.2rem] text-xs font-black shadow-2xl hover:bg-black transition-all flex items-center active:scale-95 uppercase tracking-widest"><Plus size={16} className="mr-2"/> New Patient</button>
                <button onClick={() => { setUser(null); sessionStorage.clear(); }} className="p-3 text-slate-200 hover:text-red-500 transition-colors bg-white rounded-2xl border border-slate-50 hover:border-red-50"><LogOut size={22}/></button>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 max-w-7xl mx-auto w-full p-8 md:p-12">
          <Routes>
            <Route path="/" element={<PatientList patients={patients} />} />
            <Route path="/patient/:id" element={<PatientDetail 
              patients={patients} 
              onUpdate={p => setPatients(patients.map(o => o.id === p.id ? p : o))}
              onDelete={id => setPatients(patients.filter(o => o.id !== id))}
            />} />
          </Routes>
        </main>

        <footer className="max-w-7xl mx-auto w-full px-8 py-10 flex flex-col md:flex-row justify-between items-center text-slate-300 gap-6 border-t border-slate-50 mt-10">
          <div className="flex items-center gap-2">
            <Database size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">P-Support Data Center System</span>
          </div>
          <p className="text-[10px] font-bold">© 2025 Periodontal Care Management Solution. All Rights Reserved.</p>
        </footer>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in duration-500">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">New Registration</h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 p-2 rounded-xl text-slate-300 hover:text-slate-500 transition-all active:scale-90"><X size={24}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Chart ID / カルテID *</label>
                  <input id="new-id" type="text" placeholder="例: P-2025-001" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Patient Name / 氏名 *</label>
                  <input id="new-name" type="text" placeholder="例: 芦屋 七海" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Date of Birth / 生年月日</label>
                  <input id="new-bday" type="date" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 shadow-inner" />
                </div>
                <div className="pt-6">
                  <button 
                    onClick={() => addPatient(
                      (document.getElementById('new-name') as HTMLInputElement).value, 
                      (document.getElementById('new-id') as HTMLInputElement).value,
                      (document.getElementById('new-bday') as HTMLInputElement).value
                    )}
                    className="w-full bg-blue-600 text-white py-5 rounded-[1.8rem] font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] uppercase tracking-widest"
                  >
                    Register Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HashRouter>
  );
}
