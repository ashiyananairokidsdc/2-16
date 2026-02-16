
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, Calendar, Clipboard, Camera, Database, Search, 
  CheckCircle2, Clock, Trash2, FileText, AlertCircle, Settings, X, 
  CloudUpload, Check, LogOut, User as UserIcon, Lock
} from 'lucide-react';
import { PatientRecord, TreatmentStep, PStepStatus, DEFAULT_P_FLOW, PatientFile, User } from './types.ts';
import { analyzeStepData } from './geminiService.ts';
import { syncToGoogleSheet } from './sheetService.ts';

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
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 text-white">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">P-Support</h1>
          <p className="text-slate-400 text-sm">歯科周病治療管理システム</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" placeholder="お名前" required
            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={name} onChange={e => setName(e.target.value)}
          />
          <input 
            type="password" placeholder="パスワード" required
            className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
            {isSignup ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>
        <button onClick={() => setIsSignup(!isSignup)} className="w-full mt-4 text-sm text-slate-400 hover:text-blue-600">
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">患者一覧</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="名前・ID検索"
            className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Link key={p.id} to={`/patient/${p.id}`} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">ID: {p.patientId}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-2">{p.name}</h3>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-sm text-slate-500 space-y-1">
              <p className="flex items-center"><Clock size={14} className="mr-2"/>最終来院: {p.lastVisit}</p>
              <p className="flex items-center"><CheckCircle2 size={14} className="mr-2"/>完了工程: {p.plan.filter(s => s.status === '完了').length} / {p.plan.length}</p>
            </div>
          </Link>
        ))}
      </div>
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

  useEffect(() => {
    if (patient && !activeId) {
      setActiveId(patient.plan.find(s => s.status === '実施中')?.id || patient.plan[0].id);
    }
  }, [patient]);

  if (!patient) return <Navigate to="/" />;

  const activeStep = patient.plan.find(s => s.id === activeId) || patient.plan[0];

  const handleUpdateStep = (updates: Partial<TreatmentStep>) => {
    const newPlan = patient.plan.map(s => s.id === activeId ? { ...s, ...updates } : s);
    onUpdate({ ...patient, plan: newPlan, lastVisit: new Date().toLocaleDateString('ja-JP') });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600; // 超軽量化
        let w = img.width, h = img.height;
        if (w > MAX) { h *= MAX / w; w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const url = canvas.toDataURL('image/jpeg', 0.6);
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => navigate('/')} className="text-xs text-slate-400 hover:text-blue-600 mb-2 flex items-center">
            <ChevronRight className="rotate-180 mr-1" size={14} /> 一覧に戻る
          </button>
          <h2 className="text-3xl font-bold text-slate-800">{patient.name} <span className="text-sm font-normal text-slate-400 ml-2">ID: {patient.patientId}</span></h2>
        </div>
        <div className="flex gap-2">
          <button onClick={sync} disabled={isSyncing} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-blue-100 transition">
            <CloudUpload size={16} className="mr-2" /> 同期
          </button>
          <button onClick={() => {if(confirm('削除しますか？')) { onDelete(patient.id); navigate('/'); }}} className="p-2 text-red-300 hover:text-red-500">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Stepper */}
        <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-slate-100 h-fit">
          <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Treatment Phase</p>
          <div className="space-y-1">
            {patient.plan.map((s, i) => (
              <button 
                key={s.id} onClick={() => setActiveId(s.id)}
                className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 ${activeId === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-2 h-2 rounded-full ${s.status === '完了' ? 'bg-green-400' : s.status === '実施中' ? 'bg-blue-400' : 'bg-slate-200'}`} />
                <span className={`text-xs font-bold truncate ${activeId === s.id ? 'text-white' : 'text-slate-600'}`}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{activeStep.label}</h3>
              <select 
                value={activeStep.status} onChange={e => handleUpdateStep({ status: e.target.value as any })}
                className="text-xs font-bold border rounded-full px-4 py-1.5 outline-none bg-slate-50"
              >
                {Object.values(PStepStatus).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Notes</label>
                  <textarea 
                    className="w-full h-64 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white outline-none transition-all text-sm"
                    placeholder="処置内容を入力してください..."
                    value={activeStep.notes}
                    onChange={e => handleUpdateStep({ notes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Photos</label>
                    <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">追加<input type="file" className="hidden" onChange={handleFile} /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {activeStep.files.map(f => (
                      <div key={f.id} className="relative group rounded-xl overflow-hidden border border-slate-100">
                        <img src={f.url} className="w-full h-24 object-cover" alt="" />
                        <button onClick={() => handleUpdateStep({ files: activeStep.files.filter(x => x.id !== f.id) })} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 size={12}/></button>
                      </div>
                    ))}
                    {activeStep.files.length === 0 && <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl text-slate-300 text-xs">画像なし</div>}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <button onClick={runAi} className="w-full bg-slate-800 text-white py-3 rounded-2xl font-bold flex items-center justify-center hover:bg-slate-900 transition shadow-lg shadow-slate-100">
                  <AlertCircle size={18} className="mr-2" /> AIアシスタントに診断・分析を依頼
                </button>
                {aiResult && (
                  <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-300">
                    <p className="font-bold mb-2 flex items-center"><Database size={14} className="mr-2" /> Gemini AI Analysis</p>
                    {aiResult}
                  </div>
                )}
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

  const addPatient = (name: string, pid: string) => {
    const newP: PatientRecord = {
      id: Date.now().toString(),
      patientId: pid, name, birthDate: '',
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
        <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2 text-blue-600">
              <Database size={24} /> <span className="font-bold text-xl text-slate-800 tracking-tight">P-Support</span>
            </Link>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition flex items-center"><Plus size={16} className="mr-1"/>登録</button>
              <button onClick={() => { setUser(null); sessionStorage.clear(); }} className="p-2 text-slate-300 hover:text-red-500 transition"><LogOut size={20}/></button>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">患者新規登録</h3>
                <button onClick={() => setIsModalOpen(false)}><X/></button>
              </div>
              <div className="space-y-4">
                <input id="new-name" type="text" placeholder="氏名" className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none" />
                <input id="new-id" type="text" placeholder="カルテID" className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none" />
                <button 
                  onClick={() => addPatient((document.getElementById('new-name') as HTMLInputElement).value, (document.getElementById('new-id') as HTMLInputElement).value)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
                >登録する</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HashRouter>
  );
}
