
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, FileData, ChatMode, EmojiLevel, Conversation } from './types';
import { generateStudyResponse, generateConversationTitle } from './services/geminiService';
import Onboarding from './components/Onboarding';
import ChatInterface from './components/ChatInterface';
import FloatingActionMenu from './components/FloatingActionMenu';
import PomodoroTimer from './components/PomodoroTimer';
import OfflineGame from './components/OfflineGame';
import WelcomeOverlay from './components/WelcomeOverlay';
import CurriculumScreen from './components/CurriculumScreen';
import Sidebar from './components/Sidebar';
// Added ToggleLeft and ToggleRight to imports
import { Sun, Moon, Settings as SettingsIcon, GraduationCap, Menu, Zap, Sparkles, Activity, ToggleLeft, ToggleRight } from 'lucide-react';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const quotes = [
    "من جد وجد، ومن زرع حصد يا بطل! 🌱",
    "الثانوية العامة محطة، وأنت قدها! 🚂",
    "ركز في هدفك، بكرة تفرح بمجموعك! 🎓",
    "ذاكر دلوقتي عشان ترتاح بكرة.. مفيش مستحيل! 💪",
    "كل دقيقة بتذاكرها بتقربك من حلمك خطوة. ✨"
  ];

  useEffect(() => {
    const savedProfile = localStorage.getItem('thaker_profile_v6');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    
    const savedConvs = localStorage.getItem('thaker_conversations');
    if (savedConvs) setConversations(JSON.parse(savedConvs));

    const savedTheme = localStorage.getItem('thaker_theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('thaker_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('thaker_theme', newDark ? 'dark' : 'light');
  };

  const updateSetting = (key: keyof UserProfile, value: any) => {
    if (!profile) return;
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    localStorage.setItem('thaker_profile_v6', JSON.stringify(updated));
  };

  const startNewConversation = async (mode: ChatMode) => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'محادثة جديدة',
      mode,
      messages: [],
      lastActive: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  };

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('thaker_profile_v6', JSON.stringify(newProfile));
    startNewConversation('study');
  };

  const onStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const onSendMessage = async (text: string, files: FileData[] = []) => {
    if (!profile || !activeConvId) return;

    const convIndex = conversations.findIndex(c => c.id === activeConvId);
    if (convIndex === -1) return;

    const activeConv = conversations[convIndex];
    const isFirstMessage = activeConv.messages.length === 0;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      image: files[0]?.mimeType.startsWith('image/') ? `data:${files[0].mimeType};base64,${files[0].data}` : undefined
    };

    const updatedConv = {
      ...activeConv,
      messages: [...activeConv.messages, userMsg],
      lastActive: Date.now()
    };

    setConversations(prev => prev.map(c => c.id === activeConvId ? updatedConv : c));
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const history = activeConv.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await generateStudyResponse(text, profile, history, files, activeConv.mode, isFast);
      
      if (!abortControllerRef.current) return; // Request was aborted

      if (response.newMemory && !profile.memories.includes(response.newMemory)) {
         updateSetting('memories', [...profile.memories, response.newMemory].slice(-10));
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        difficulty: response.difficulty,
        isActionable: activeConv.mode === 'study'
      };

      let finalTitle = activeConv.title;
      if (isFirstMessage) {
        finalTitle = await generateConversationTitle(text);
      }

      const finalConv = {
        ...updatedConv,
        title: finalTitle,
        messages: [...updatedConv.messages, botMsg]
      };

      setConversations(prev => prev.map(c => c.id === activeConvId ? finalConv : c));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
      } else {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  if (!isOnline) return <OfflineGame onRetry={() => setIsOnline(navigator.onLine)} />;
  if (!profile) return <Onboarding onComplete={handleProfileComplete} isDark={isDark} toggleTheme={toggleTheme} />;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {profile && !profile.hasSeenWelcome && (
        <WelcomeOverlay onDismiss={() => updateSetting('hasSeenWelcome', true)} />
      )}

      {showSidebar && activeConversation && (
        <Sidebar 
          activeConvId={activeConvId}
          currentMode={activeConversation.mode}
          conversations={conversations}
          onSelectConversation={(id) => { setActiveConvId(id); setShowSidebar(false); }} 
          onRenameConversation={(id, title) => setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))}
          onDeleteConversation={(id) => {
            const next = conversations.filter(c => c.id !== id);
            setConversations(next);
            if (activeConvId === id) setActiveConvId(next[0]?.id || null);
          }}
          onClose={() => setShowSidebar(false)} 
        />
      )}

      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/70 dark:bg-black/90 border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full dark:text-white">
            <Menu size={20} />
          </button>
          <div className="w-9 h-9 bg-black rounded-lg border border-zinc-700 flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm leading-tight dark:text-white">ذاكر</h1>
            <p className="text-[10px] text-indigo-500 font-bold dark:text-indigo-400">{motivationalQuote}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFast(!isFast)} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isFast 
                ? 'bg-amber-500 border-amber-600 text-white' 
                : 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isFast ? <Zap size={14} fill="currentColor" /> : <Activity size={14} />}
            {isFast ? 'رد سريع' : 'رد دقيق'}
          </button>
          <button onClick={toggleTheme} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full dark:text-white">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full dark:text-white">
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 dark:text-white">الإعدادات</h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                <span className="text-sm font-bold dark:text-white">الإنجليزية خفيفة</span>
                <button onClick={() => updateSetting('lightEnglish', !profile.lightEnglish)}>
                  {profile.lightEnglish ? <ToggleRight className="text-indigo-600" size={32}/> : <ToggleLeft className="text-slate-400 dark:text-zinc-600" size={32}/>}
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mb-1 font-bold">ذاكر يحفظ عنك:</p>
                <div className="mt-1 space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                  {profile.memories.map((m, i) => (
                    <div key={i} className="text-[10px] bg-white dark:bg-black p-2 rounded-lg border dark:border-zinc-700 dark:text-zinc-200">{m}</div>
                  ))}
                </div>
              </div>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-red-50 text-red-600 dark:bg-red-900/20 font-bold rounded-2xl">تسجيل الخروج</button>
              <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-slate-200 dark:bg-zinc-700 dark:text-white font-bold rounded-2xl">رجوع</button>
            </div>
          </div>
        </div>
      )}

      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}

      <main className="max-w-4xl mx-auto px-4 pb-32 pt-4">
        {activeConversation ? (
          activeConversation.mode === 'curriculum' ? (
            <CurriculumScreen profile={profile} onUpdate={(p) => updateSetting('curriculumFiles', p.curriculumFiles)} />
          ) : (
            <ChatInterface 
              conversation={activeConversation}
              onSendMessage={onSendMessage} 
              onStopResponse={onStopResponse}
              isLoading={isLoading} 
              onAction={(type, msg) => onSendMessage(`اشرحلي أكتر عن: ${msg}`, [])} 
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-zinc-600">
            <Sparkles size={64} className="mb-4 opacity-20" />
            <p className="font-bold">ابدأ محادثة جديدة من القائمة اللي تحت</p>
          </div>
        )}
      </main>

      <FloatingActionMenu 
        onSwitchMode={(m) => m === 'timer' ? setShowPomodoro(true) : startNewConversation(m)}
        currentMode={activeConversation?.mode || 'study'}
      />
    </div>
  );
};

export default App;
