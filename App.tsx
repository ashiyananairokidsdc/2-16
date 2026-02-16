
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Calendar, Clipboard, Camera, Database, Search, 
  Clock, Trash2, FileText, AlertCircle, X, 
  CloudUpload, Check, LogOut, Edit3, Save, 
  ArrowUp, ArrowDown, Layout, Settings2, Info, UserCheck, ShieldAlert, RefreshCw
} from 'lucide-react';
import { PatientRecord, TreatmentStep, PStepStatus, DEFAULT_P_FLOW, PatientFile, User } from './types.ts';
import { analyzeStepData } from './geminiService.ts';
import { syncToGoogleSheet } from './sheetService.ts';

// --- Utility: Age Calculation ---
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

// --- LoginPage ---
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 text-white shadow-lg shadow-blue-100">
            <Layout size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">P-Support</h1>
          <p className="text-slate-400 text-sm font-medium">Dental Periodontal Care</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="スタッフ名" required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            value={name} onChange={e => setName(e.target.value)}
          />
          <input 
            type="password" placeholder="パスワード" required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
          <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition shadow-lg active:scale-95">
            {isSignup ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>
        <button onClick={() => setIsSignup(!isSignup)} className="w-full mt-6 text-xs text-slate-400 hover:text-blue-600 transition font-medium">
          {isSignup ? '← ログインに戻る' : '新規登録はこちら'}
        </button>
      </div>
    </div>
  );
};

// --- PatientList (Dashboard) ---
const PatientList = ({ patients }: { patients: PatientRecord[] }) => {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p => p.name.includes(search) || p.patientId.includes(search));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">患者様リスト</h1>
          <p className="text-slate-500 text-sm">全 {patients.length} 名の登録</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="名前・カルテ番号で検索"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 border-dashed">
          <Search className="text-slate-200 mx-auto mb-4" size={40} />
          <p className="text-slate-400 text-sm font-medium">該当する患者様は見つかりませんでした</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => {
            const age = calculateAge(p.birthDate);
            const completedCount = p.plan.filter(s => s.status === '完了').length;
            const progressPercent = p.plan.length > 0 ? Math.round((completedCount / p.plan.length) * 100) : 0;
            const currentStep = p.plan.find(s => s.status === '実施中')?.label || '完了';

            return (
              <Link key={p.id} to={`/patient/${p.id}`} className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-slate-200/50 transition-all p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">ID: {p.patientId}</span>
                  <div className={`text-xs font-black px-2.5 py-1 rounded-lg shadow-sm ${progressPercent === 100 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                    {progressPercent}%
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">{p.name} 様</h3>
                <p className="text-xs text-slate-400 mb-6">{p.birthDate ? `${p.birthDate.replace(/-/g, '/')} (${age}歳)` : '生年月日未登録'}</p>
                
                <div className="mt-auto space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>治療段階</span>
                    <span className="truncate ml-2 text-slate-600">{currentStep}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-700 shadow-sm" style={{ width: `${progressPercent}%` }} />
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

// --- PatientDetail ---
const PatientDetail = ({ patients, onUpdate, onDelete, currentUser }: { patients: PatientRecord[], onUpdate: (p: PatientRecord) => void, onDelete: (id: string) => void, currentUser: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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
  }, [patient, activeId]);

  if (!patient) return <Navigate to="/" />;

  const age = calculateAge(patient.birthDate);
  const activeStep = patient.plan.find(s => s.id === activeId) || patient.plan[0];
  const completedCount = patient.plan.filter(s => s.status === '完了').length;
  const progressPercent = patient.plan.length > 0 ? Math.round((completedCount / patient.plan.length) * 100) : 0;

  const handleUpdateStep = (updates: Partial<TreatmentStep>) => {
    const newPlan = patient.plan.map(s => {
      if (s.id === activeId) {
        return { ...s, ...updates, updatedBy: currentUser.name };
      }
      return s;
    });
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
      id: Date.now().toString(), label: '新規工程', status: PStepStatus.PENDING, notes: '', files: [], updatedBy: currentUser.name
    };
    handleUpdatePlan([...patient.plan, newStep]);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...patient.plan];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlan.length) return;
    [newPlan[index], newPlan[targetIndex]] = [newPlan[targetIndex], newPlan[index]];
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
    try {
      const res = await analyzeStepData(patient, activeStep);
      setAiResult(res);
    } catch (e: any) {
      console.error(e);
      setAiResult(`【アプリエラー】解析実行中に予期せぬ不具合が発生しました。\n詳細: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex-1">
            <button onClick={() => navigate('/')} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 mb-3 flex items-center transition-colors uppercase tracking-wider">
              <ChevronRight className="rotate-180 mr-1" size={14} /> 一覧に戻る
            </button>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{patient.name} 様</h2>
              <button onClick={() => setIsProfileModalOpen(true)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                <Edit3 size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center"><Calendar size={14} className="mr-1.5 text-slate-300" /> {patient.birthDate ? `${patient.birthDate.replace(/-/g, '/')} (${age}歳)` : '--'}</span>
              <span className="text-slate-200">|</span>
              <span className="flex items-center"><Clock size={14} className="mr-1.5 text-slate-300" /> 最終来院: {patient.lastVisit}</span>
              <span className="text-slate-200">|</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">ID: {patient.patientId}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
             <div className="bg-blue-50 border border-blue-100 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[120px] shadow-sm">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">現在の進捗</span>
                <div className="text-4xl font-black text-blue-600 tracking-tighter">{progressPercent}%</div>
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={async () => { setIsSyncing(true); await syncToGoogleSheet(patient); setIsSyncing(false); alert('スプレッドシートへの同期が完了しました'); }} disabled={isSyncing} className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center shadow-sm hover:bg-black transition-all">
                  <CloudUpload size={16} className="mr-2" /> 同期
                </button>
             </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
           <div className="flex items-center gap-2 mb-2 text-slate-400">
              <Info size={14} />
              <label className="text-[10px] font-bold uppercase tracking-widest">特記事項 (既往歴・主訴・要望など)</label>
           </div>
           <textarea 
             className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm leading-relaxed min-h-[80px]"
             placeholder="アレルギー、全身疾患、患者様からの特別な要望などを記入してください..."
             value={patient.profileNotes || ''}
             onChange={e => onUpdate({...patient, profileNotes: e.target.value})}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Treatment Map */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <Settings2 size={14} className="mr-2" /> 治療ロードマップ
              </h3>
              <button 
                onClick={() => setIsPlanEditMode(!isPlanEditMode)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${isPlanEditMode ? 'bg-green-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                {isPlanEditMode ? '編集を保存' : '工程の並替'}
              </button>
            </div>

            <div className="relative space-y-1">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-100 -z-0" />
              
              {patient.plan.map((s, i) => (
                <div key={s.id} className="relative group">
                  <div className={`flex items-center gap-3 py-1.5 transition-all ${isPlanEditMode ? '' : 'cursor-pointer'}`} onClick={() => !isPlanEditMode && setActiveId(s.id)}>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                      s.status === '完了' ? 'bg-green-500 border-green-500 text-white' : 
                      s.status === '実施中' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50' : 
                      'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {s.status === '完了' ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                    </div>
                    
                    <div className={`flex-1 min-w-0 p-3 rounded-xl border transition-all ${
                      activeId === s.id && !isPlanEditMode ? 'bg-blue-50 border-blue-100 shadow-sm ring-1 ring-blue-50' : 'bg-white border-transparent'
                    }`}>
                      {isPlanEditMode ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" value={s.label} onChange={(e) => {
                              const newPlan = patient.plan.map(step => step.id === s.id ? { ...step, label: e.target.value } : step);
                              handleUpdatePlan(newPlan);
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                          />
                          <button onClick={(e) => { e.stopPropagation(); moveStep(i, 'up'); }} className="text-slate-300 hover:text-slate-600"><ArrowUp size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); moveStep(i, 'down'); }} className="text-slate-300 hover:text-slate-600"><ArrowDown size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('この工程を削除しますか？')) handleUpdatePlan(patient.plan.filter(p => p.id !== s.id)); }} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <p className={`text-xs font-bold truncate ${activeId === s.id ? 'text-blue-700' : 'text-slate-700'}`}>{s.label}</p>
                          {s.updatedBy && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold" title="最終更新者">{s.updatedBy.charAt(0)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isPlanEditMode && (
                <button onClick={addStep} className="w-full mt-4 py-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold flex items-center justify-center hover:bg-slate-50 transition-all">
                  <Plus size={14} className="mr-1" /> 工程を追加
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Content Area */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                  <Clipboard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{activeStep.label}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ステータス</p>
                     {activeStep.updatedBy && (
                       <span className="text-[9px] font-bold text-blue-500 flex items-center bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                         <UserCheck size={10} className="mr-1" /> 担当: {activeStep.updatedBy}
                       </span>
                     )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={activeStep.status} onChange={e => handleUpdateStep({ status: e.target.value as any })}
                  className="text-xs font-bold border border-slate-200 rounded-xl px-4 py-2 outline-none bg-white shadow-sm cursor-pointer hover:border-slate-300 transition-all"
                >
                  {Object.values(PStepStatus).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 flex-1 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <FileText size={12} className="mr-2" /> 処置内容・経過メモ
                  </label>
                  <textarea 
                    className="w-full h-[300px] p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm leading-relaxed"
                    placeholder="プラークコントロール状態、PPDの変化、処置中に気付いたことなどを詳しく記録..."
                    value={activeStep.notes}
                    onChange={e => handleUpdateStep({ notes: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <Camera size={12} className="mr-2" /> 口腔内写真・検査表
                    </label>
                    <label className="cursor-pointer bg-white text-slate-600 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all border border-slate-200 shadow-sm active:scale-95">
                      + 追加
                      <input type="file" className="hidden" onChange={handleFile} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {activeStep.files.map(f => (
                      <div key={f.id} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-100 shadow-sm bg-slate-50">
                        <img src={f.url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button onClick={() => handleUpdateStep({ files: activeStep.files.filter(x => x.id !== f.id) })} className="bg-red-500 text-white p-2 rounded-lg hover:scale-110 transition-transform shadow-md">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                    {activeStep.files.length === 0 && (
                      <div className="col-span-2 py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300">
                        <Camera size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">写真・資料なし</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button 
                  onClick={runAi} disabled={isAnalyzing}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-black transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <div className="flex items-center"><RefreshCw size={18} className="animate-spin mr-2" /> AIがデータを解析しています...</div>
                  ) : <><Database size={18} className="mr-2 text-blue-400" /> AI臨床アドバイザーに相談</>}
                </button>
                {aiResult && (
                  <div className={`mt-6 p-6 border rounded-2xl text-sm whitespace-pre-wrap leading-relaxed animate-in slide-in-from-top-2 duration-300 relative ${aiResult.includes("【エラー】") || aiResult.includes("【Googleの回答") ? "bg-red-50 border-red-100 text-red-900" : "bg-blue-50/30 border-blue-100 text-slate-700"}`}>
                    <div className="flex items-center gap-2 mb-3">
                       <div className={`${aiResult.includes("【エラー】") || aiResult.includes("【Googleの回答") ? "bg-red-600" : "bg-blue-600"} p-1.5 rounded-lg text-white`}>
                         <Database size={14} />
                       </div>
                       <p className="font-bold text-[11px] uppercase tracking-widest">{aiResult.includes("【エラー】") ? "エラーレポート" : "AI分析レポート"}</p>
                    </div>
                    <div className="text-sm prose prose-slate max-w-none">
                      {aiResult}
                    </div>
                    {aiResult.includes("Secrets") && (
                      <div className="mt-4 p-4 bg-white/50 border border-slate-200 rounded-xl flex items-start gap-3">
                        <ShieldAlert size={18} className="shrink-0 text-red-500 mt-0.5" />
                        <div className="text-xs text-slate-600">
                          <p className="font-bold text-slate-800 mb-1">現在の環境でのAPIキー設定方法</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>サイドバーの <b>Secrets（鍵アイコン🔒）</b> を開く</li>
                            <li><b>Name</b> に <code className="bg-slate-100 px-1 rounded">API_KEY</code> と入力（大文字・アンダースコア）</li>
                            <li><b>Value</b> に取得したキーを貼り付け</li>
                            <li>保存ボタンを押し、<b>一度ブラウザを更新</b>してください</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-800">基本情報の編集</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">患者様名</label>
                <input 
                  type="text" value={editingPatient.name || ''} 
                  onChange={e => setEditingPatient({...editingPatient, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">生年月日</label>
                <input 
                  type="date" value={editingPatient.birthDate || ''} 
                  onChange={e => setEditingPatient({...editingPatient, birthDate: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                />
              </div>
              <div className="pt-4">
                <button onClick={handleSaveProfile} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
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

// --- Main App ---
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
      patientId: pid, name, birthDate: bday, profileNotes: '',
      createdAt: new Date().toLocaleDateString('ja-JP'),
      lastVisit: new Date().toLocaleDateString('ja-JP'),
      plan: DEFAULT_P_FLOW.map((l, i) => ({
        id: `${Date.now()}-${i}`, label: l, notes: '', files: [],
        status: i === 0 ? PStepStatus.IN_PROGRESS : PStepStatus.PENDING,
        updatedBy: user?.name
      }))
    };
    setPatients([newP, ...patients]);
    setIsModalOpen(false);
  };

  if (!user) return <LoginPage onLogin={u => { setUser(u); sessionStorage.setItem('p-auth', JSON.stringify(u)); }} />;

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#fcfdfe] flex flex-col font-sans text-slate-900">
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-blue-600 group">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md transition-transform group-hover:scale-105">
                <Layout size={20} /> 
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">P-Support</span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">
                   {user.name.charAt(0)}
                </div>
                {user.name} 先生
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-black transition-all active:scale-95 flex items-center">
                  <Plus size={16} className="mr-1.5"/> 新規登録
                </button>
                <button onClick={() => { setUser(null); sessionStorage.clear(); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-10">
          <Routes>
            <Route path="/" element={<PatientList patients={patients} />} />
            <Route path="/patient/:id" element={<PatientDetail 
              patients={patients} 
              currentUser={user}
              onUpdate={p => setPatients(patients.map(o => o.id === p.id ? p : o))}
              onDelete={id => setPatients(patients.filter(o => o.id !== id))}
            />} />
          </Routes>
        </main>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-500 border border-slate-200">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-800">患者様を登録する</h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 p-2 rounded-xl text-slate-300 hover:text-slate-500 transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">カルテ番号 *</label>
                  <input id="new-id" type="text" placeholder="例: P25-001" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">患者様お名前 *</label>
                  <input id="new-name" type="text" placeholder="例: 佐藤 結衣" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">生年月日</label>
                  <input id="new-bday" type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                </div>
                <div className="pt-6">
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
