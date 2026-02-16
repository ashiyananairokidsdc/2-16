
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronRight, 
  Calendar, 
  Clipboard, 
  Camera, 
  Database, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2,
  FileText,
  AlertCircle,
  Save,
  Settings,
  X,
  Circle,
  CloudUpload,
  Check,
  LogOut,
  User as UserIcon,
  Lock
} from 'lucide-react';
import { PatientRecord, TreatmentStep, PStepStatus, DEFAULT_P_FLOW, PatientFile, User } from './types';
import { analyzeStepData } from './services/geminiService';
import { syncToGoogleSheet } from './services/sheetService';

// --- Authentication Components ---

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
        setError('この名前は既に登録されています');
        return;
      }
      const newUser = { name, passwordHash: password }; // 実運用ではハッシュ化すべきですが簡易化
      localStorage.setItem('p-support-users', JSON.stringify([...users, newUser]));
      onLogin(newUser);
    } else {
      const user = users.find(u => u.name === name && u.passwordHash === password);
      if (user) {
        onLogin(user);
      } else {
        setError('名前またはパスワードが正しくありません');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <Database className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">P-Support Pro</h1>
          <p className="text-gray-500 text-sm">歯科医院向け治療支援システム</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">氏名 / スタッフ名</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="山田 太郎"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">パスワード</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 mt-2"
          >
            {isSignup ? '新規アカウント作成' : 'ログイン'}
          </button>
        </form>

        <button 
          onClick={() => { setIsSignup(!isSignup); setError(''); }}
          className="w-full mt-6 text-sm text-gray-500 hover:text-blue-600 font-medium transition"
        >
          {isSignup ? '既にアカウントをお持ちの方' : '新規登録はこちら'}
        </button>
      </div>
    </div>
  );
};

// --- Main Components ---

const Navbar = ({ user, onLogout, onOpenRegister }: { user: User, onLogout: () => void, onOpenRegister: () => void }) => (
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex">
          <Link to="/" className="flex-shrink-0 flex items-center">
            <Database className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">P-Support</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center text-sm text-gray-500 mr-4">
            <div className="bg-gray-100 p-1.5 rounded-full mr-2"><UserIcon className="h-3 w-3" /></div>
            <span>{user.name} 先生 / 衛生士</span>
          </div>
          <button 
            onClick={onOpenRegister}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center shadow-md"
          >
            <Plus className="mr-1 h-4 w-4" /> 患者登録
          </button>
          <button 
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-500 transition"
            title="ログアウト"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  </nav>
);

const RegisterModal = ({ isOpen, onClose, onRegister }: { isOpen: boolean, onClose: () => void, onRegister: (p: Partial<PatientRecord>) => void }) => {
  const [formData, setFormData] = useState({ name: '', patientId: '', birthDate: '' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">新規患者登録</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カルテID (自由形式)</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例: P2024-001"
              value={formData.patientId}
              onChange={e => setFormData({...formData, patientId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例: 山田 太郎"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.birthDate}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
            />
          </div>
          <button 
            onClick={() => { onRegister(formData); onClose(); }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition mt-4 shadow-lg"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
};

const PatientList = ({ patients }: { patients: PatientRecord[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = patients.filter(p => p.name.includes(searchTerm) || p.patientId.includes(searchTerm));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">患者管理</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="名前・IDで検索" 
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
           <Database className="h-12 w-12 text-gray-200 mx-auto mb-4" />
           <p className="text-gray-400 font-medium">患者データがありません。「患者登録」から追加してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(patient => {
            const completedSteps = patient.plan.filter(s => s.status === PStepStatus.COMPLETED).length;
            const currentStep = patient.plan.find(s => s.status === PStepStatus.IN_PROGRESS) || patient.plan[0];
            
            return (
              <Link 
                key={patient.id} 
                to={`/patient/${patient.id}`}
                className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all group relative overflow-hidden shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">ID: {patient.patientId}</span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{patient.name}</h3>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    <span>進行中: <span className="font-semibold text-gray-900">{currentStep?.label}</span></span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>最終来院: {patient.lastVisit}</span>
                  </div>
                </div>
                <div className="relative pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>進捗状況</span>
                    <span>{Math.round((completedSteps / patient.plan.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(completedSteps / patient.plan.length) * 100}%` }}
                    ></div>
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

const PatientDetail = ({ 
  patients, 
  onUpdatePatient,
  onDeletePatient
}: { 
  patients: PatientRecord[], 
  onUpdatePatient: (p: PatientRecord) => void,
  onDeletePatient: (id: string) => void
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.id === id);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  useEffect(() => {
    if (patient && !activeStepId) {
      const current = patient.plan.find(s => s.status === PStepStatus.IN_PROGRESS) || patient.plan[0];
      setActiveStepId(current.id);
    }
  }, [patient]);

  if (!patient) return <div className="p-12 text-center">患者が見つかりません。</div>;

  const activeStep = patient.plan.find(s => s.id === activeStepId) || patient.plan[0];
  const completedStepsCount = patient.plan.filter(s => s.status === PStepStatus.COMPLETED).length;
  const totalStepsCount = patient.plan.length;

  const handleStepUpdate = (updatedStep: TreatmentStep) => {
    const newPlan = patient.plan.map(s => s.id === updatedStep.id ? updatedStep : s);
    onUpdatePatient({ ...patient, plan: newPlan });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像のリサイズ処理（ブラウザの容量制限対策）
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // 高解像度すぎるとlocalStorageが溢れるため制限
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 圧縮
        const newFile: PatientFile = {
          id: Date.now().toString(),
          url: dataUrl,
          name: file.name,
          type: 'image',
          date: new Date().toLocaleDateString('ja-JP')
        };
        handleStepUpdate({ ...activeStep, files: [...activeStep.files, newFile] });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRunAi = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeStepData(patient, activeStep);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncToGoogleSheet(patient);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } catch (e) {
      alert("同期に失敗しました。URLと通信状況を確認してください。");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* 容量警告 */}
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-medium">
        <AlertCircle className="h-4 w-4" />
        <span>無料運用のための注意: 画像は自動リサイズされますが、数が増えると保存できなくなる可能性があります。重要なデータは「Sheetへ同期」で外部保存してください。</span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center">
              <ChevronRight className="rotate-180 h-4 w-4 mr-1" /> 一覧に戻る
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium">ID: {patient.patientId}</span>
            </div>
            <p className="text-gray-500 mt-1">生年月日: {patient.birthDate} | 作成日: {patient.createdAt}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${syncDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'}`}
            >
              {isSyncing ? (
                <div className="h-4 w-4 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin mr-2" />
              ) : syncDone ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              {syncDone ? '同期完了' : isSyncing ? '同期中...' : 'Sheetへ同期'}
            </button>
            <button 
              onClick={() => setIsEditingPlan(!isEditingPlan)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${isEditingPlan ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Settings className={`h-4 w-4 mr-2 ${isEditingPlan ? 'animate-spin-slow' : ''}`} /> {isEditingPlan ? '計画編集終了' : '計画変更'}
            </button>
            <button 
              onClick={() => { if(confirm('本当にこの患者データを削除しますか？')) { onDeletePatient(patient.id); navigate('/'); } }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左サイドバー: 垂直ステッパー */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">進捗状況</h3>
                <span className="text-blue-600 font-bold text-lg">{Math.round((completedStepsCount / totalStepsCount) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-700" 
                  style={{ width: `${(completedStepsCount / totalStepsCount) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="relative overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
              {patient.plan.map((step, idx) => {
                const isActive = activeStepId === step.id;
                const isCompleted = step.status === PStepStatus.COMPLETED;
                const isInProgress = step.status === PStepStatus.IN_PROGRESS;

                return (
                  <div key={step.id} className="relative flex group">
                    {idx !== patient.plan.length - 1 && (
                      <div className={`absolute left-[11px] top-6 w-[2px] h-full -z-0 ${isCompleted ? 'bg-green-200' : 'bg-gray-100'}`} />
                    )}
                    <div className="relative z-10 flex flex-col items-center mr-4 pt-1">
                      <button 
                        onClick={() => setActiveStepId(step.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCompleted ? 'bg-green-500 text-white' :
                          isInProgress ? 'bg-blue-600 text-white ring-4 ring-blue-50 pulse' :
                          'bg-white border-2 border-gray-200 text-gray-300'
                        } ${isActive ? 'scale-125 shadow-lg' : ''}`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                      </button>
                    </div>
                    <div className="flex-1 pb-8">
                      <button 
                        onClick={() => setActiveStepId(step.id)}
                        className={`text-left w-full transition-all ${isActive ? 'translate-x-1' : ''}`}
                      >
                        <h4 className={`text-sm font-bold ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isCompleted ? 'bg-green-50 text-green-600' : isInProgress ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                          {step.status}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* メインエリア */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-8 py-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{activeStep.label}</h2>
              <button 
                onClick={handleRunAi}
                disabled={isAnalyzing}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center shadow-lg shadow-indigo-100"
              >
                {isAnalyzing ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                AIアシスタント
              </button>
            </div>

            <div className="p-8 space-y-8">
               {aiAnalysis && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative animate-in fade-in slide-in-from-top-4 duration-300">
                  <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-indigo-300 hover:text-indigo-600"><X className="h-4 w-4"/></button>
                  <h4 className="text-indigo-900 font-bold mb-3 flex items-center"><AlertCircle className="h-4 w-4 mr-2"/> AI分析結果</h4>
                  <div className="text-indigo-800 text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysis}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-800">処置・経過メモ</label>
                  <textarea 
                    className="w-full h-72 p-5 bg-slate-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="メモを入力..."
                    value={activeStep.notes}
                    onChange={(e) => handleStepUpdate({ ...activeStep, notes: e.target.value })}
                  />
                  <div className="flex gap-2">
                     <span className="text-[10px] text-gray-400 font-bold uppercase">ステータス変更:</span>
                     <select 
                        className="text-[10px] font-bold border rounded px-1"
                        value={activeStep.status}
                        onChange={(e) => handleStepUpdate({...activeStep, status: e.target.value as PStepStatus})}
                     >
                       {Object.values(PStepStatus).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-800">添付資料・写真</label>
                    <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
                      追加
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeStep.files.map(file => (
                      <div key={file.id} className="group relative rounded-xl border border-gray-100 overflow-hidden bg-slate-50 shadow-sm">
                        <img src={file.url} className="w-full h-32 object-cover" alt="" />
                        <button 
                          onClick={() => handleStepUpdate({ ...activeStep, files: activeStep.files.filter(f => f.id !== file.id) })}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {activeStep.files.length === 0 && (
                      <div className="col-span-2 py-12 text-center border-2 border-dashed border-gray-50 rounded-2xl text-gray-300">
                         <Camera className="h-8 w-8 mx-auto mb-2 opacity-20" />
                         <p className="text-xs">写真がありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('p-support-current-user');
    return saved ? JSON.parse(saved) : null;
  });

  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    const saved = localStorage.getItem('p-support-patients');
    return saved ? JSON.parse(saved) : [];
  });

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('p-support-patients', JSON.stringify(patients));
  }, [patients]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('p-support-current-user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('p-support-current-user');
  };

  const handleRegister = (data: Partial<PatientRecord>) => {
    const newPatient: PatientRecord = {
      id: Date.now().toString(),
      patientId: data.patientId || `P-${Date.now()}`,
      name: data.name || '名称未設定',
      birthDate: data.birthDate || '',
      createdAt: new Date().toLocaleDateString('ja-JP'),
      lastVisit: new Date().toLocaleDateString('ja-JP'),
      plan: DEFAULT_P_FLOW.map((label, i) => ({
        id: `step-${Date.now()}-${i}`,
        label,
        status: i === 0 ? PStepStatus.IN_PROGRESS : PStepStatus.PENDING,
        notes: '',
        files: []
      }))
    };
    setPatients([newPatient, ...patients]);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={currentUser} onLogout={handleLogout} onOpenRegister={() => setIsRegisterModalOpen(true)} />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Routes>
            <Route path="/" element={<PatientList patients={patients} />} />
            <Route path="/patient/:id" element={<PatientDetail 
              patients={patients} 
              onUpdatePatient={p => setPatients(patients.map(old => old.id === p.id ? p : old))} 
              onDeletePatient={id => setPatients(patients.filter(p => p.id !== id))} 
            />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <RegisterModal 
          isOpen={isRegisterModalOpen} 
          onClose={() => setIsRegisterModalOpen(false)} 
          onRegister={handleRegister} 
        />
      </div>
    </HashRouter>
  );
}
