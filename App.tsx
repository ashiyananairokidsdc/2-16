
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Calendar, Clipboard, Camera, Database, Search, 
  CheckCircle2, Clock, Trash2, FileText, AlertCircle, Settings, X, 
  CloudUpload, Check, LogOut, User as UserIcon, Lock, TrendingUp,
  Edit2, Save, ArrowUp, ArrowDown, GripVertical
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 text-white shadow-lg shadow-blue-200">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">P-Support</h1>
          <p className="text-slate-400 text-sm">歯科周病治療管理システム</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="お名前" required
            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={name} onChange={e => setName(e.target.value)}
          />
          <input 
            type="password" placeholder="パスワード" required
            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
            {isSignup ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>
        <button onClick={() => setIsSignup(!isSignup)} className="w-full mt-4 text-sm text-slate-400 hover:text-blue-600 transition">
          {isSignup ? 'ログイン画面へ' : '新規登録はこちら'}
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">患者管理</h1>
          <p className="text-slate-500 text-sm mt-1">総登録数: {patients.length}名</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="名前・カルテIDで検索"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-slate-300" size={32} />
          </div>
          <p className="text-slate-400 font-medium">該当する患者が見つかりません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => {
            const age = calculateAge(p.birthDate);
            const completedCount = p.plan.filter(s => s.status === '完了').length;
            const progressPercent = Math.round((completedCount / p.plan.length) * 100);
            const currentStep = p.plan.find(s => s.status === '実施中')?.label || '完了';

            return (
              <Link key={p.id} to={`/patient/${p.id}`} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full tracking-wider">ID: {p.patientId}</span>
                    <div className="flex items-center text-slate-300 group-hover:text-blue-500 transition-colors">
                      <span className="text-xs font-bold mr-1">{progressPercent}%</span>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{p.name}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {p.birthDate ? `${p.birthDate.replace(/-/g, '/')} (${age}歳)` : '生年月日未登録'}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <TrendingUp size={12} className="mr-1.5" /> 現在のフェーズ
                    </div>
                    <p className="text-sm font-bold text-slate-700 truncate">{currentStep}</p>
                    
                    <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-blue-600 transition-all duration-700 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                   <div className="flex items-center text-[10px] font-bold text-slate-400">
                     <Clock size={12} className="mr-1" /> {p.lastVisit}
                   </div>
                   <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${progressPercent === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                     {progressPercent === 100 ? '治療完了' : '継続中'}
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
      label: '新しいステップ',
      status: PStepStatus.PENDING,
      notes: '',
      files: []
    };
    handleUpdatePlan([...patient.plan, newStep]);
  };

  const removeStep = (sid: string) => {
    if (patient.plan.length <= 1) return;
    if (confirm('このステップを削除しますか？記録されているメモや写真も消去されます。')) {
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
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h *= MAX / w; w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const url = canvas.toDataURL('image/jpeg', 0.7);
        const newFile: PatientFile = { id: Date.now().toString(), url, name: file.name, type: 'image', date: new Date().toLocaleDateString() };
        handleUpdateStep({ files: [...activeStep.files, newFile] });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const runAi = async () => {
    setAiResult("分析中...");
    const res = await analyzeStepData(patient, activeStep);
    setAiResult(res);
  };

  const sync = async () => {
    setIsSyncing(true);
    await syncToGoogleSheet(patient);
    setIsSyncing(false);
    alert("スプレッドシートに同期しました");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header Info */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1">
          <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 hover:text-blue-600 mb-4 flex items-center transition-colors">
            <ChevronRight className="rotate-180 mr-1" size={14} /> ダッシュボードへ
          </button>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{patient.name}</h2>
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">ID: {patient.patientId}</span>
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
              <Edit2 size={18} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center font-medium"><Calendar size={16} className="mr-1.5 text-blue-500" /> {patient.birthDate ? `${patient.birthDate.replace(/-/g, '/')} (${age}歳)` : '生年月日未登録'}</span>
            <span className="text-slate-200">|</span>
            <span className="flex items-center font-medium"><Clock size={16} className="mr-1.5 text-slate-400" /> 最終来院: {patient.lastVisit}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={sync} disabled={isSyncing} className="bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center hover:bg-slate-100 transition shadow-sm">
            <CloudUpload size={18} className="mr-2 text-blue-600" /> 同期
          </button>
          <button onClick={() => {if(confirm('患者データを削除しますか？')) { onDelete(patient.id); navigate('/'); }}} className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition">
            <Trash2 size={22} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Progress Stepper / Timeline */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-fit sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">治療ロードマップ</h3>
            <button 
              onClick={() => setIsPlanEditMode(!isPlanEditMode)}
              className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${isPlanEditMode ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {isPlanEditMode ? '編集終了' : '計画を編集'}
            </button>
          </div>

          <div className="relative space-y-0.5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Timeline Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-100 -z-0" />
            
            {patient.plan.map((s, i) => (
              <div key={s.id} className="relative group">
                <div className="flex items-center gap-4 py-2">
                  <button 
                    onClick={() => !isPlanEditMode && setActiveId(s.id)}
                    disabled={isPlanEditMode}
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      s.status === '完了' ? 'bg-green-500 text-white' : 
                      s.status === '実施中' ? 'bg-blue-600 text-white ring-4 ring-blue-50 shadow-lg shadow-blue-100' : 
                      'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {s.status === '完了' ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </button>
                  
                  <div className={`flex-1 p-3 rounded-2xl transition-all border ${
                    activeId === s.id && !isPlanEditMode ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100' : 
                    isPlanEditMode ? 'bg-slate-50 border-transparent' : 'bg-white border-transparent'
                  }`}>
                    {isPlanEditMode ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={s.label}
                          onChange={(e) => renameStep(s.id, e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => moveStep(i, 'up')} disabled={i === 0} className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30"><ArrowUp size={14}/></button>
                          <button onClick={() => moveStep(i, 'down')} disabled={i === patient.plan.length - 1} className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-30"><ArrowDown size={14}/></button>
                          <button onClick={() => removeStep(s.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setActiveId(s.id)} className="cursor-pointer">
                        <p className={`text-xs font-bold truncate ${activeId === s.id ? 'text-blue-700' : 'text-slate-700'}`}>{s.label}</p>
                        <p className={`text-[9px] font-bold mt-0.5 tracking-wider ${
                          s.status === '完了' ? 'text-green-500' : 
                          s.status === '実施中' ? 'text-blue-500' : 'text-slate-400'
                        }`}>{s.status}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isPlanEditMode && (
              <button 
                onClick={addStep}
                className="w-full mt-4 py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-[10px] font-bold flex items-center justify-center hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                <Plus size={14} className="mr-1" /> 工程を追加する
              </button>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">現在の進捗</span>
              <span className="text-blue-600 font-extrabold text-sm">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Right: Step Detail */}
        <div className="lg:col-span-8 space-y-6">
          {!activeStep ? (
            <div className="bg-white rounded-[2rem] p-20 text-center border border-slate-100">
              <p className="text-slate-400 font-bold">治療ステップを選択または追加してください</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                    <Clipboard size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{activeStep.label}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">状況更新:</span>
                  <select 
                    value={activeStep.status} onChange={e => handleUpdateStep({ status: e.target.value as any })}
                    className="text-xs font-bold border-none rounded-xl px-4 py-2 outline-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {Object.values(PStepStatus).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <FileText size={12} className="mr-1.5" /> 処置内容・経過メモ
                    </label>
                    <textarea 
                      className="w-full h-72 p-5 bg-slate-50 border border-transparent rounded-3xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed"
                      placeholder="こちらに処置内容や経過を記録してください..."
                      value={activeStep.notes}
                      onChange={e => handleUpdateStep({ notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Camera size={12} className="mr-1.5" /> 写真・画像資料
                      </label>
                      <label className="cursor-pointer bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-50 active:scale-95">
                        写真を追加
                        <input type="file" className="hidden" onChange={handleFile} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-[18rem] overflow-y-auto pr-2 custom-scrollbar">
                      {activeStep.files.map(f => (
                        <div key={f.id} className="relative group rounded-2xl overflow-hidden border border-slate-100 aspect-video shadow-sm">
                          <img src={f.url} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => handleUpdateStep({ files: activeStep.files.filter(x => x.id !== f.id) })} className="bg-red-500 text-white p-2 rounded-xl transform hover:scale-110 transition-transform">
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        </div>
                      ))}
                      {activeStep.files.length === 0 && (
                        <div className="col-span-2 py-20 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300">
                          <Camera size={32} className="mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-medium">画像が登録されていません</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                  <button onClick={runAi} className="w-full bg-slate-900 text-white py-4 rounded-3xl font-bold flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-slate-100 active:scale-[0.98]">
                    <AlertCircle size={20} className="mr-2 text-blue-400" /> AIアシスタントによる画像・経過分析
                  </button>
                  {aiResult && (
                    <div className="mt-6 p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                           <Database size={16} />
                         </div>
                         <p className="font-bold text-indigo-900">Gemini AI 分析レポート</p>
                      </div>
                      {aiResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800">プロフィールの編集</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">カルテID</label>
                <input 
                  type="text" 
                  value={editingPatient.patientId || ''} 
                  onChange={e => setEditingPatient({...editingPatient, patientId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">患者氏名</label>
                <input 
                  type="text" 
                  value={editingPatient.name || ''} 
                  onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">生年月日</label>
                <input 
                  type="date" 
                  value={editingPatient.birthDate || ''} 
                  onChange={e => setEditingPatient({...editingPatient, birthDate: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" 
                />
              </div>
              <div className="pt-4">
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Save size={18} /> 保存する
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
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2 text-blue-600 group">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                <Database size={20} /> 
              </div>
              <span className="font-extrabold text-xl text-slate-800 tracking-tight">P-Support</span>
            </Link>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-800">{user.name} 先生</span>
                <span className="text-[10px] text-slate-400">オンライン</span>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center active:scale-95"><Plus size={18} className="mr-1.5"/>患者登録</button>
              <button onClick={() => { setUser(null); sessionStorage.clear(); }} className="text-slate-300 hover:text-red-500 transition-colors"><LogOut size={22}/></button>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
          <Routes>
            <Route path="/" element={<PatientList patients={patients} />} />
            <Route path="/patient/:id" element={<PatientDetail 
              patients={patients} 
              onUpdate={p => setPatients(patients.map(o => o.id === p.id ? p : o))}
              onDelete={id => setPatients(patients.filter(o => o.id !== id))}
            />} />
          </Routes>
        </main>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-800">新規患者の登録</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">カルテID *</label>
                  <input id="new-id" type="text" placeholder="例: P2024001" className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">患者氏名 *</label>
                  <input id="new-name" type="text" placeholder="例: 山田 太郎" className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">生年月日</label>
                  <input id="new-bday" type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => addPatient(
                      (document.getElementById('new-name') as HTMLInputElement).value, 
                      (document.getElementById('new-id') as HTMLInputElement).value,
                      (document.getElementById('new-bday') as HTMLInputElement).value
                    )}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                  >
                    登録を完了する
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
