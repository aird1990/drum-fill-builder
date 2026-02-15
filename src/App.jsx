import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Volume2, Trash2, Music, Download, Shuffle, ChevronRight, Volume1 } from 'lucide-react';

/**
 * Web Audio APIを使用したドラムシンセサイザーエンジン
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.5; // 初期音量
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx) {
      // ポップノイズを防ぐために少し時間をかけて変化させる
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.02);
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  trigger(instrument, time) {
    if (!this.ctx) this.init();
    const t = time || this.ctx.currentTime;

    switch (instrument) {
      case 'Kick': this.playKick(t); break;
      case 'Snare': this.playSnare(t); break;
      case 'Closed Hi-hat': this.playHiHat(t, true); break;
      case 'Open Hi-hat': this.playHiHat(t, false); break;
      case 'Low Tom': this.playTom(t, 100); break;
      case 'Mid Tom': this.playTom(t, 150); break;
      case 'Hi Tom': this.playTom(t, 200); break;
      case 'Crash': this.playCrash(t); break;
      default: break;
    }
  }

  playKick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.start(t); osc.stop(t + 0.5);
  }

  playSnare(t) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.frequency.setValueAtTime(250, t);
    osc.connect(oscGain); oscGain.connect(this.masterGain);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t); osc.stop(t + 0.1);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = this.ctx.createGain();
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.masterGain);
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    noise.start(t); noise.stop(t + 0.2);
  }

  playHiHat(t, closed) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 8000;
    const gain = this.ctx.createGain();
    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    const duration = closed ? 0.05 : 0.3;
    const volume = closed ? 0.6 : 0.5;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.start(t); noise.stop(t + duration);
  }

  playTom(t, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.4);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.start(t); osc.stop(t + 0.4);
  }

  playCrash(t) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 2000;
    const gain = this.ctx.createGain();
    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
    noise.start(t); noise.stop(t + 1.5);
  }
}

const audioEngine = new AudioEngine();

const INSTRUMENTS = [
  "Crash", "High Tom", "Mid Tom", "Low Tom", 
  "Open Hi-hat", "Closed Hi-hat", "Snare", "Kick"
];

// 楽器ごとのカラー設定
const INSTRUMENT_COLORS = {
  "Crash": "from-yellow-400 to-amber-500 shadow-yellow-500/50",
  "High Tom": "from-cyan-400 to-blue-500 shadow-cyan-500/50",
  "Mid Tom": "from-blue-500 to-indigo-600 shadow-blue-500/50",
  "Low Tom": "from-violet-500 to-purple-600 shadow-violet-500/50",
  "Open Hi-hat": "from-pink-400 to-rose-500 shadow-pink-500/50",
  "Closed Hi-hat": "from-rose-500 to-red-600 shadow-rose-500/50",
  "Snare": "from-emerald-400 to-teal-500 shadow-emerald-500/50",
  "Kick": "from-fuchsia-500 to-pink-600 shadow-fuchsia-500/50"
};

const INSTRUMENT_MAP = { "High Tom": "Hi Tom" };

const GM_MAP_EXPORT = {
  "Crash": 49, "Hi Tom": 50, "High Tom": 50, "Mid Tom": 47,
  "Low Tom": 41, "Open Hi-hat": 46, "Closed Hi-hat": 42,
  "Snare": 38, "Kick": 36
};

const STEPS = 16;
const PPQ = 480;

const PRESET_CATEGORIES = {
  '1-Beat': {
    'No.1 1-Beat 1': (grid, getIdx) => {
      [0, 8, 10].forEach(s => grid[getIdx("Kick")][s] = true);
      [4, 12, 13].forEach(s => grid[getIdx("Snare")][s] = true);
      [0, 2, 4, 6, 8, 10].forEach(s => grid[getIdx("Closed Hi-hat")][s] = true);
      grid[getIdx("High Tom")][14] = true;
    },
    'Variation 2': (grid, getIdx) => {
      [0, 8, 10].forEach(s => grid[getIdx("Kick")][s] = true);
      [4, 12, 13].forEach(s => grid[getIdx("Snare")][s] = true);
      [0, 2, 4, 6, 8, 10].forEach(s => grid[getIdx("Closed Hi-hat")][s] = true);
      grid[getIdx("High Tom")][14] = true;
      grid[getIdx("Low Tom")][15] = true;
    },
    'Variation 3': (grid, getIdx) => {
      const setCol = (col, instruments) => instruments.forEach(name => {
        const idx = getIdx(name);
        if (idx !== -1) grid[idx][col] = true;
      });
      const allExcSnare = ["Crash", "High Tom", "Mid Tom", "Low Tom", "Open Hi-hat", "Closed Hi-hat", "Kick"];
      const allExcKick = ["Crash", "High Tom", "Mid Tom", "Low Tom", "Open Hi-hat", "Closed Hi-hat", "Snare"];
      setCol(0, allExcSnare); setCol(2, ["Closed Hi-hat"]); setCol(4, allExcKick);
      setCol(6, ["Closed Hi-hat"]); setCol(8, allExcSnare); setCol(10, ["Closed Hi-hat", "Kick"]);
      setCol(12, allExcKick); setCol(14, ["Snare", "High Tom"]);
    }
  },
  '2-Beat': {
    'Simple 2-Beat': (grid, getIdx) => {
      for(let i=0; i<8; i+=2) grid[getIdx("Closed Hi-hat")][i] = true;
      grid[getIdx("Kick")][0] = true; grid[getIdx("Snare")][4] = true;
      [8, 10, 12, 14].forEach(s => grid[getIdx("Snare")][s] = true);
      [9, 11, 13, 15].forEach(s => grid[getIdx("Low Tom")][s] = true);
    }
  },
  '3-Beat': {
    'Triplet Fill': (grid, getIdx) => {
      [0, 2, 4].forEach(s => grid[getIdx("Kick")][s] = true);
      [4, 8, 10, 12, 14].forEach(s => grid[getIdx("High Tom")][s] = true);
      [9, 11, 13, 15].forEach(s => grid[getIdx("Mid Tom")][s] = true);
    }
  },
  '4-Beat': {
    'Intense Fill': (grid, getIdx) => {
      const addSteps = (name, steps) => steps.forEach(s => grid[getIdx(name)][s] = true);
      addSteps("Kick", [0, 2, 8, 10]);
      addSteps("Snare", [4, 12, 13]);
      addSteps("Closed Hi-hat", [0, 2, 4, 6, 8, 10, 12, 14]);
      addSteps("Open Hi-hat", [0, 4, 8, 12]);
      addSteps("Low Tom", [4, 5, 10, 11]);
      addSteps("Mid Tom", [2, 5, 11, 12]);
      addSteps("High Tom", [2, 6, 10, 11]);
      addSteps("Crash", [0, 8, 9]);
    }
  }
};

export default function App() {
  const [grid, setGrid] = useState(() => {
    const initialGrid = INSTRUMENTS.map(() => Array(STEPS).fill(false));
    const getIdx = (name) => INSTRUMENTS.indexOf(name);
    PRESET_CATEGORIES['1-Beat']['No.1 1-Beat 1'](initialGrid, getIdx);
    return initialGrid;
  });
  
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(0.5);
  
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const [currentPreset, setCurrentPreset] = useState('No.1 1-Beat 1');
  const [activeCategory, setActiveCategory] = useState('1-Beat');
  
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef(null);
  
  const currentStepRef = useRef(0);
  const isPlayingRef = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef(null);

  useEffect(() => {
    const handleGesture = () => { audioEngine.init(); document.removeEventListener('click', handleGesture); };
    document.addEventListener('click', handleGesture);
    return () => document.removeEventListener('click', handleGesture);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target)) setIsPresetMenuOpen(false);
    };
    if (isPresetMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPresetMenuOpen]);

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  const playStep = (stepIndex, time) => {
    setCurrentStep(stepIndex);
    INSTRUMENTS.forEach((inst, i) => {
      if (gridRef.current[i][stepIndex]) {
        audioEngine.trigger(INSTRUMENT_MAP[inst] || inst, time);
      }
    });
  };

  const scheduleNextNote = useCallback(() => {
    const secondsPerStep = (60.0 / bpmRef.current) / 4;
    while (nextNoteTimeRef.current < audioEngine.ctx.currentTime + 0.1) {
      playStep(currentStepRef.current, nextNoteTimeRef.current);
      currentStepRef.current = (currentStepRef.current + 1) % STEPS;
      nextNoteTimeRef.current += secondsPerStep;
    }
    if (isPlayingRef.current) timerIDRef.current = requestAnimationFrame(scheduleNextNote);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false); isPlayingRef.current = false;
      if (timerIDRef.current) cancelAnimationFrame(timerIDRef.current);
    } else {
      setIsPlaying(true); isPlayingRef.current = true;
      audioEngine.init();
      currentStepRef.current = 0; setCurrentStep(0);
      nextNoteTimeRef.current = audioEngine.ctx.currentTime;
      scheduleNextNote();
    }
  };

  const toggleCell = (row, col) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid); setCurrentPreset('');
  };

  const clearGrid = () => {
    setGrid(INSTRUMENTS.map(() => Array(STEPS).fill(false)));
    if (isPlaying) togglePlay();
    setCurrentStep(0); setCurrentPreset('');
  };

  const loadPreset = (category, variationName) => {
    const newGrid = INSTRUMENTS.map(() => Array(STEPS).fill(false));
    const getIdx = (name) => INSTRUMENTS.indexOf(name);
    PRESET_CATEGORIES[category][variationName](newGrid, getIdx);
    setGrid(newGrid);
    setCurrentPreset(variationName);
    setIsPresetMenuOpen(false);
  };

  const selectRandomPreset = () => {
    const variations = Object.keys(PRESET_CATEGORIES[activeCategory]);
    const randomVar = variations[Math.floor(Math.random() * variations.length)];
    loadPreset(activeCategory, randomVar);
  };

  const exportMIDI = () => {
    const trackEvents = [];
    const ticksPerStep = PPQ / 4;
    for (let step = 0; step < STEPS; step++) {
      INSTRUMENTS.forEach((inst, rowIdx) => {
        if (grid[rowIdx][step]) {
          const note = GM_MAP_EXPORT[inst];
          trackEvents.push({ time: step * ticksPerStep, data: [0x99, note, 100] });
          trackEvents.push({ time: step * ticksPerStep + 110, data: [0x89, note, 0] });
        }
      });
    }
    trackEvents.sort((a, b) => a.time - b.time);

    const toVLQ = (v) => {
      let b = []; let val = v;
      do { let byte = val & 0x7F; val >>= 7; if (b.length > 0) byte |= 0x80; b.unshift(byte); } while (val > 0);
      return b;
    };
    const strToBytes = (s) => [...s].map(c => c.charCodeAt(0));
    
    const trackData = [];
    const microPerBeat = Math.round(60000000 / bpm);
    trackData.push(0x00, 0xFF, 0x51, 0x03, (microPerBeat >> 16) & 0xFF, (microPerBeat >> 8) & 0xFF, microPerBeat & 0xFF);
    
    let lastTime = 0;
    trackEvents.forEach(e => {
      trackData.push(...toVLQ(e.time - lastTime));
      trackData.push(...e.data);
      lastTime = e.time;
    });
    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    const header = [...strToBytes('MThd'), 0,0,0,6, 0,0, 0,1, (PPQ >> 8) & 0xFF, PPQ & 0xFF];
    const trackHeader = [...strToBytes('MTrk'), (trackData.length >> 24) & 0xFF, (trackData.length >> 16) & 0xFF, (trackData.length >> 8) & 0xFF, trackData.length & 0xFF];
    
    const midiFile = new Uint8Array([...header, ...trackHeader, ...trackData]);
    const url = URL.createObjectURL(new Blob([midiFile], { type: 'audio/midi' }));
    const a = document.createElement('a'); a.href = url; a.download = 'cyber_beats.mid';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-indigo-100 p-2 md:p-4 flex flex-col items-center justify-center font-sans overflow-x-hidden">
      <div className="w-full max-w-6xl bg-[#1e293b] rounded-xl md:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] p-4 md:p-8 border border-slate-700/50 backdrop-blur-sm">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-center mb-6 md:mb-10 gap-6 md:gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner">
              <Music className="w-6 h-6 md:w-8 md:h-8 text-fuchsia-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent tracking-tighter uppercase italic">
              Fill-In Engine
            </h1>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 bg-slate-900/40 p-2 rounded-xl md:rounded-2xl border border-slate-700/30 shadow-2xl w-full xl:w-auto">
            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 px-5 py-2 md:px-7 md:py-3 rounded-xl font-black transition-all duration-300 transform active:scale-95 ${
                isPlaying 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)]' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.6)]'
              }`}
            >
              {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              <span className="tracking-widest text-sm md:text-base">{isPlaying ? 'STOP' : 'PLAY'}</span>
            </button>

            {/* Controls Group */}
            <div className="flex items-center gap-4 md:gap-6 border-l-0 border-r-0 md:border-l md:border-r border-slate-700/50 px-2 md:px-6 mx-0 md:mx-2">
              {/* BPM Control */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1 md:mb-1.5">BPM</span>
                <div className="flex items-center gap-2 md:gap-3">
                  <input
                    type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-20 md:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                  <span className="w-8 text-right font-mono text-fuchsia-400 font-black text-base md:text-lg leading-none">{bpm}</span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1 md:mb-1.5">VOL</span>
                <div className="flex items-center gap-2">
                  <Volume1 size={14} className="text-slate-500 md:hidden" />
                  <Volume1 size={16} className="text-slate-500 hidden md:block" />
                  <input
                    type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange}
                    className="w-16 md:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={presetMenuRef}>
                <button 
                  onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs md:text-sm text-indigo-200 transition-all border border-slate-700 font-bold ${isPresetMenuOpen ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/30' : ''}`}
                >
                  <Music size={16} className="text-fuchsia-400 md:hidden" />
                  <Music size={18} className="text-fuchsia-400 hidden md:block" />
                  <span className="hidden sm:inline">{currentPreset || "Select Beat"}</span>
                </button>
                {isPresetMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-72 md:w-80 bg-slate-800 border border-slate-600 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-30 overflow-hidden backdrop-blur-2xl">
                    <div className="flex bg-slate-900/50 border-b border-slate-700">
                      {Object.keys(PRESET_CATEGORIES).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                      {Object.keys(PRESET_CATEGORIES[activeCategory]).map(name => (
                        <button
                          key={name}
                          onClick={() => loadPreset(activeCategory, name)}
                          className="flex items-center justify-between w-full text-left px-5 py-3.5 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors group"
                        >
                          <span className="font-semibold">{name}</span>
                          <ChevronRight size={14} className="text-slate-600 group-hover:text-fuchsia-400 translate-x-0 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={selectRandomPreset}
                className="p-2 md:p-3 bg-slate-800 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-fuchsia-500/50 group"
                title="Random from category"
              >
                <Shuffle size={18} className="group-active:rotate-180 transition-transform duration-500 md:hidden" />
                <Shuffle size={20} className="group-active:rotate-180 transition-transform duration-500 hidden md:block" />
              </button>

              <button 
                onClick={exportMIDI}
                className="p-2 md:p-3 bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-cyan-500/50"
                title="Export MIDI"
              >
                <Download size={18} className="md:hidden"/>
                <Download size={20} className="hidden md:block"/>
              </button>

              <button 
                onClick={clearGrid}
                className="p-2 md:p-3 bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-rose-500/50 ml-1"
                title="Reset Pattern"
              >
                <Trash2 size={18} className="md:hidden"/>
                <Trash2 size={20} className="hidden md:block"/>
              </button>
            </div>
          </div>
        </div>

        {/* Grid Section */}
        <div className="overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
          <div className="min-w-max px-2 md:px-4">
            <div className="flex mb-3 md:mb-5 ml-28 md:ml-40">
              {Array(STEPS).fill(0).map((_, i) => (
                <div 
                  key={i}
                  className={`w-8 h-1.5 md:w-10 md:h-2 mx-1 rounded-full transition-all duration-300 ${
                    currentStep === i 
                      ? 'bg-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,1)] scale-110' 
                      : i % 4 === 0 
                        ? 'bg-slate-600 shadow-inner' 
                        : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {INSTRUMENTS.map((inst, rowIdx) => {
              const colorClass = INSTRUMENT_COLORS[inst] || "from-slate-500 to-slate-600 shadow-slate-500/50";
              return (
                <div key={inst} className="flex items-center mb-3 md:mb-4 group/row">
                  <div className="w-28 md:w-40 flex items-center justify-end pr-4 md:pr-8">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-500 tracking-[0.2em] text-right group-hover/row:text-fuchsia-400 transition-colors uppercase italic truncate">
                      {inst}
                    </span>
                  </div>

                  <div className="flex">
                    {grid[rowIdx].map((isActive, colIdx) => {
                      const isOnBeat = colIdx % 4 === 0;
                      const isCurrent = currentStep === colIdx;
                      return (
                        <button
                          key={colIdx}
                          onClick={() => toggleCell(rowIdx, colIdx)}
                          className={`
                            w-8 h-10 md:w-10 md:h-12 mx-1 rounded-md md:rounded-lg transition-all duration-150 relative overflow-hidden
                            ${isActive 
                              ? `bg-gradient-to-br ${colorClass} shadow-[0_0_15px] scale-[0.98]` 
                              : isOnBeat 
                                ? 'bg-slate-700/40 hover:bg-slate-600/60 border border-slate-600/20' 
                                : 'bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/20'
                            }
                            ${isCurrent && !isActive ? 'ring-2 ring-white/20 !bg-slate-600/80' : ''}
                            ${isCurrent && isActive ? 'brightness-150 scale-105 z-10' : ''}
                          `}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent)]" />
                          )}
                          {!isActive && isOnBeat && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-500/20" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 md:mt-8 flex flex-col md:flex-row justify-between items-center text-[9px] md:text-[10px] text-slate-500 border-t border-slate-700/40 pt-4 md:pt-8 uppercase tracking-[0.3em] font-black gap-4 md:gap-0">
          <div className="flex gap-4 md:gap-10">
            <span className="flex items-center gap-2 md:gap-3 px-3 py-1 md:px-4 md:py-1.5 bg-slate-900/50 rounded-full border border-slate-700/50">
              <Volume2 size={12} className="text-emerald-400 animate-pulse md:hidden"/> 
              <Volume2 size={14} className="text-emerald-400 animate-pulse hidden md:block"/> 
              Synth Audio
            </span>
            <span className="flex items-center gap-2 md:gap-3 px-3 py-1 md:px-4 md:py-1.5 bg-slate-900/50 rounded-full border border-slate-700/50">
              Grid: {STEPS} Steps
            </span>
          </div>
          <div className="text-fuchsia-500/60 italic">
            Neon Spectrum Fill-In Engine
          </div>
        </div>
      </div>
      
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .custom-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}