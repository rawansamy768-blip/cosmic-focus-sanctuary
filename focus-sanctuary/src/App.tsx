    import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, 
  CheckCircle2, Circle, Plus, Trash2, Wind, Flame, Bell
} from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: 'Work' | 'Study' | 'Personal' | 'Creative';
}

interface Quote {
  content: string;
  author: string;
}

export default function App() {
  const [theme, setTheme] = useState<'cosmic' | 'sunset' | 'cyber' | 'zen'>('cosmic');
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    const saved = localStorage.getItem('sanctuary_sessions');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [whiteNoiseVol, setWhiteNoiseVol] = useState(0.2);
  const [binauralVol, setBinauralVol] = useState(0.1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const binauralNodesRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode } | null>(null);

  const [quote, setQuote] = useState<Quote>({
    content: "The secret of getting ahead is getting started.",
    author: "Mark Twain"
  });
  const [loadingQuote, setLoadingQuote] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('sanctuary_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Complete React component structure', completed: true, category: 'Work' },
      { id: '2', text: 'Practice 20 mins of deep focus session', completed: false, category: 'Study' }
    ];
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory] = useState<'Work' | 'Study' | 'Personal' | 'Creative'>('Work');

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sanctuary_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('sanctuary_sessions', completedSessions.toString());
  }, [completedSessions]);

  useEffect(() => {
    let timer: number;
    if (isRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      
      if (mode === 'focus') {
        setCompletedSessions((prev) => prev + 1);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus Sanctuary', {
            body: 'Great job! Focus session completed. Take a well-deserved break.',
          });
        }
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus Sanctuary', {
            body: 'Break ended! Ready to dive back into focus?',
          });
        }
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const switchTimerMode = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setIsRunning(false);
    if (newMode === 'focus') setTimeLeft(25 * 60);
    if (newMode === 'shortBreak') setTimeLeft(5 * 60);
    if (newMode === 'longBreak') setTimeLeft(15 * 60);
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => switchTimerMode(mode);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchQuote = async () => {
    setLoadingQuote(true);
    try {
      const res = await fetch('https://api.quotable.io/random');
      if (res.ok) {
        const data = await res.json();
        setQuote({ content: data.content, author: data.author });
      } else {
        setQuote({ content: "Focus on being productive instead of busy.", author: "Tim Ferriss" });
      }
    } catch {
      setQuote({ content: "Action is the foundational key to all success.", author: "Pablo Picasso" });
    } finally {
      setLoadingQuote(false);
    }
  };

  const toggleAudio = () => {
    if (!isPlayingAudio) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(whiteNoiseVol, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start();

      noiseNodeRef.current = noiseGain;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const binauralGain = ctx.createGain();

      osc1.frequency.setValueAtTime(200, ctx.currentTime);
      osc2.frequency.setValueAtTime(210, ctx.currentTime);
      binauralGain.gain.setValueAtTime(binauralVol, ctx.currentTime);

      osc1.connect(binauralGain);
      osc2.connect(binauralGain);
      binauralGain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      binauralNodesRef.current = { osc1, osc2 };
      setIsPlayingAudio(true);
    } else {
      audioCtxRef.current?.close();
      setIsPlayingAudio(false);
    }
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const item: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      category: newTaskCategory
    };
    setTasks([item, ...tasks]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const themeBg = {
    cosmic: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100',
    sunset: 'bg-gradient-to-br from-rose-950 via-purple-950 to-slate-950 text-rose-100',
    cyber: 'bg-gradient-to-br from-black via-zinc-900 to-cyan-950 text-cyan-100',
    zen: 'bg-gradient-to-br from-stone-900 via-neutral-900 to-emerald-950 text-emerald-100'
  }[theme];

  const cardStyle = "backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl";

  return (
    <div className={`min-h-screen ${themeBg} font-sans p-4 md:p-8 transition-colors duration-500`}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
              Cosmic Focus Sanctuary
            </h1>
            <p className="text-sm opacity-70 mt-1">Your ambient productivity space</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-md text-xs font-medium">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{completedSessions} Sessions Completed</span>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md">
              {(['cosmic', 'sunset', 'cyber', 'zen'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                    theme === t ? 'bg-white/20 shadow-md font-bold' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            
            <div className={`${cardStyle} flex flex-col items-center text-center py-10 relative overflow-hidden`}>
              <div className="flex gap-2 mb-8 bg-black/20 p-1 rounded-full">
                <button
                  onClick={() => switchTimerMode('focus')}
                  className={`px-4 py-1.5 rounded-full text-xs transition cursor-pointer ${mode === 'focus' ? 'bg-indigo-600 text-white font-bold' : 'opacity-70'}`}
                >
                  Focus (25m)
                </button>
                <button
                  onClick={() => switchTimerMode('shortBreak')}
                  className={`px-4 py-1.5 rounded-full text-xs transition cursor-pointer ${mode === 'shortBreak' ? 'bg-indigo-600 text-white font-bold' : 'opacity-70'}`}
                >
                  Short Break (5m)
                </button>
                <button
                  onClick={() => switchTimerMode('longBreak')}
                  className={`px-4 py-1.5 rounded-full text-xs transition cursor-pointer ${mode === 'longBreak' ? 'bg-indigo-600 text-white font-bold' : 'opacity-70'}`}
                >
                  Long Break (15m)
                </button>
              </div>

              <div className="text-7xl md:text-8xl font-black tracking-wider my-4 font-mono">
                {formatTime(timeLeft)}
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={toggleTimer}
                  className="bg-white text-slate-900 font-bold px-8 py-3 rounded-full flex items-center gap-2 shadow-lg hover:bg-opacity-90 transition transform active:scale-95 cursor-pointer"
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isRunning ? 'Pause' : 'Start Focus'}
                </button>

                <button
                  onClick={resetTimer}
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Wind className="w-5 h-5 text-indigo-400" />
                  Procedural Ambiance Generator
                </h2>
                <button
                  onClick={toggleAudio}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                    isPlayingAudio ? 'bg-emerald-500 text-black' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isPlayingAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {isPlayingAudio ? 'Audio Active' : 'Start Ambiance'}
                </button>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <div className="flex justify-between text-xs opacity-80 mb-1">
                    <span>White Noise Atmosphere</span>
                    <span>{Math.round(whiteNoiseVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={whiteNoiseVol}
                    onChange={(e) => setWhiteNoiseVol(parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 bg-white/10 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs opacity-80 mb-1">
                    <span>Binaural Focus Frequency (10Hz Alpha)</span>
                    <span>{Math.round(binauralVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.3"
                    step="0.01"
                    value={binauralVol}
                    onChange={(e) => setBinauralVol(parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 bg-white/10 rounded-lg cursor-pointer h-2"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            
            <div className={cardStyle}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase tracking-widest opacity-60 font-semibold">Inspiration</span>
                <button
                  onClick={fetchQuote}
                  disabled={loadingQuote}
                  className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {loadingQuote ? 'Refreshing...' : 'New Quote'}
                </button>
              </div>
              <p className="italic text-sm opacity-90 leading-relaxed mb-3">
                "{quote.content}"
              </p>
              <p className="text-xs text-right font-medium opacity-60">— {quote.author}</p>
            </div>

            <div className={cardStyle}>
              <h2 className="font-semibold mb-4 flex items-center justify-between">
                <span>Focus Tasks</span>
                <span className="text-xs opacity-50">{tasks.filter(t => t.completed).length}/{tasks.length} Done</span>
              </h2>

              <form onSubmit={addTask} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add a focus task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5 group hover:border-white/10 transition"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2.5 text-xs text-left flex-1 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 opacity-40 shrink-0" />
                      )}
                      <span className={task.completed ? 'line-through opacity-40' : ''}>
                        {task.text}
                      </span>
                    </button>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <p className="text-xs opacity-40 text-center py-4">No tasks yet. Add one above!</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}