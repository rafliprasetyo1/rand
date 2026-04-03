import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import confetti from 'canvas-confetti';

// === CONFIGURASI FIREBASE ===
// Copy dari Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyD4aaNbOKT6g0Oq9FDbfSA7sEGwHGSNIZU",
  authDomain: "rand-35b45.firebaseapp.com",
  databaseURL: "https://rand-35b45-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rand-35b45",
  storageBucket: "rand-35b45.firebasestorage.app",
  messagingSenderId: "271734570113",
  appId: "1:271734570113:web:322ac13ffdfba7f610a180",
};

// --- FUNGSI RESET HASIL ---
const handleReset = async () => {
  if (window.confirm("Apakah Anda yakin ingin menghapus hasil tim? (Daftar nama tidak akan hilang)")) {
    await set(ref(db, 'session/'), {
      isShuffling: false,
      currentTeams: [] // Mengosongkan hasil di Firebase
    });
    setTeams([]); // Mengosongkan tampilan lokal
  }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function App() {
  const [names, setNames] = useState('');
  const [memberPerTeam, setMemberPerTeam] = useState(2);
  const [duration, setDuration] = useState(5);
  const [teams, setTeams] = useState([]);
  const [isShuffling, setIsShuffling] = useState(false);

  // Cek jika user adalah admin via URL ?access=admin123
  const isAdmin = new URLSearchParams(window.location.search).get('access') === 'admin123';

  // --- EFFECT: Sinkronisasi Real-time untuk Peserta ---
  useEffect(() => {
    const sessionRef = ref(db, 'session/');
    onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeams(data.currentTeams || []);
        setIsShuffling(data.isShuffling || false);
        
        // Trigger selebrasi jika baru saja selesai mengacak
        if (data.isShuffling === false && data.currentTeams?.length > 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    });
  }, []);

  // --- LOGIKA ACAK ---
  const shuffleArray = (array) => {
    let result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const generateTeams = (listNames, size) => {
    const shuffled = shuffleArray(listNames);
    const result = [];
    for (let i = 0; i < shuffled.length; i += size) {
      result.push(shuffled.slice(i, i + size));
    }
    return result;
  };

  const handleStartRandomize = async () => {
    const participants = names.split('\n').filter(n => n.trim() !== '');
    if (participants.length === 0) return alert("Masukkan nama peserta!");

    // 1. Update Firebase: Mulai Shuffling
    await set(ref(db, 'session/'), {
      isShuffling: true,
      currentTeams: generateTeams(participants, memberPerTeam) 
    });

    // 2. Interval Visual (Opsional: Update berkala ke Firebase agar HP peserta "gerak")
    const interval = setInterval(async () => {
      await set(ref(db, 'session/'), {
        isShuffling: true,
        currentTeams: generateTeams(participants, memberPerTeam)
      });
    }, 800); // Jangan terlalu cepat agar hemat kuota Firebase

    // 3. Berhenti setelah durasi
    setTimeout(async () => {
      clearInterval(interval);
      const finalTeams = generateTeams(participants, memberPerTeam);
      
      // Update Firebase: Selesai & Kirim Hasil Final
      await set(ref(db, 'session/'), {
        isShuffling: false,
        currentTeams: finalTeams
      });
    }, duration * 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent italic">
          TEAM SYNC ENGINE
        </h1>
        <p className="text-slate-500 text-xs tracking-[0.3em] uppercase mt-2">Real-time Distribution System</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL ADMIN */}
        {isAdmin && (
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
              <h2 className="text-cyan-400 font-bold mb-4 flex items-center">
                <span className="mr-2">🛠 Admin Panel</span>
              </h2>
              <textarea 
                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-3 mb-4 text-sm outline-none focus:border-cyan-500 transition-all"
                placeholder="List Nama (Enter)..."
                value={names}
                onChange={(e) => setNames(e.target.value)}
              />
              <div className="flex gap-4 mb-6">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Size/Team</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-2" value={memberPerTeam} onChange={e => setMemberPerTeam(Number(e.target.value))}/>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Sec</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-2" value={duration} onChange={e => setDuration(Number(e.target.value))}/>
                </div>
              </div>
              <button 
                onClick={handleStartRandomize}
                disabled={isShuffling}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20"
              >
                {isShuffling ? "SYNCING..." : "DEPLOY TEAMS"}
              </button>
              {/* Di dalam Bagian Admin Control, di bawah button Start Randomize */}
<button 
  onClick={handleReset}
  disabled={isShuffling}
  className="w-full mt-3 py-2 bg-transparent border border-slate-700 hover:border-red-500 hover:text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
>
  Reset Results
</button>
            </div>
          </aside>
        )}

        {/* VIEWPORT PESERTA */}
        <main className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {teams.map((team, index) => (
                <motion.div
                  key={index}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-5 rounded-2xl border transition-colors ${isShuffling ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-cyan-500 tracking-widest">TEAM {index + 1}</span>
                    {!isShuffling && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                  </div>
                  <ul className="space-y-2">
                    {team.map((member, mIdx) => (
                      <motion.li key={mIdx} className="text-slate-200 flex items-center text-sm font-medium">
                        <div className="w-1 h-3 bg-cyan-500 mr-3 rounded-full" />
                        {member}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {teams.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
              <p className="text-slate-600 animate-pulse uppercase tracking-[0.5em] text-sm">Initializing System...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;