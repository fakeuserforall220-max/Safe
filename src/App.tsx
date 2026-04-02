import { useState, useEffect, useMemo } from 'react';
import { Plus, Shield, Search, WalletCards } from 'lucide-react';
import { PasswordCard } from './components/PasswordCard';
import { AddPasswordModal, PasswordData, getRandomGradient } from './components/AddPasswordModal';
import AuthScreen from './components/AuthScreen';

// --- FIREBASE IMPORTS ADDED ---
import { db, auth } from './firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';

// We rename your original App to VaultApp so it only runs AFTER unlocking
function VaultApp() {
  const [passwords, setPasswords] = useState<PasswordData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- UPGRADED: Load from Firebase instead of Local Storage ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Only fetch passwords that belong to the logged-in user
    const q = query(collection(db, 'passwords'), where('userId', '==', user.uid));
    
    // onSnapshot listens for real-time updates from Firebase
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPasswords: PasswordData[] = [];
      snapshot.forEach((doc) => {
        loadedPasswords.push({ id: doc.id, ...doc.data() } as PasswordData);
      });
      // Sort so newest are at the top
      setPasswords(loadedPasswords.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)));
    });

    return () => unsubscribe();
  }, []);

  // --- UPGRADED: Save to Firebase instead of Local Storage ---
  const handleAddPassword = async (data: Omit<PasswordData, 'id' | 'dateAdded' | 'gradient'>) => {
    const user = auth.currentUser;
    if (!user) return;

    const newPassword = {
      ...data,
      dateAdded: new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }), // MM/YY
      gradient: getRandomGradient(),
      userId: user.uid // Securely attach this password to the logged-in user
    };
    
    try {
      // Add to Firestore database (React state updates automatically via onSnapshot)
      await addDoc(collection(db, 'passwords'), newPassword);
    } catch (error) {
      console.error("Error adding password: ", error);
      alert("Failed to save password to cloud.");
    }
  };

  // --- UPGRADED: Delete from Firebase ---
  const handleDeletePassword = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this password?')) {
      try {
        await deleteDoc(doc(db, 'passwords', id));
      } catch (error) {
        console.error("Error deleting password: ", error);
      }
    }
  };

  const filteredPasswords = useMemo(() => {
    if (!searchQuery) return passwords;
    const lowerQuery = searchQuery.toLowerCase();
    return passwords.filter(
      (p) => 
        p.website.toLowerCase().includes(lowerQuery) || 
        p.username.toLowerCase().includes(lowerQuery)
    );
  }, [passwords, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Vaultify
              </h1>
              <p className="text-xs text-indigo-400 font-medium tracking-wide">SECURE CREDENTIALS</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-white text-slate-900 px-4 py-2 rounded-full font-semibold hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Add New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        {/* Mobile Search (visible only on small screens) */}
        <div className="sm:hidden mb-8 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {passwords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
              <WalletCards size={40} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-200 mb-2">Your vault is empty</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Store your passwords securely like a digital wallet. Add your first credential to get started.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-6 py-3 rounded-xl font-medium transition-colors border border-indigo-500/20"
            >
              <Plus size={20} />
              <span>Add First Password</span>
            </button>
          </div>
        ) : filteredPasswords.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search size={48} className="text-slate-700 mb-4" />
            <h2 className="text-xl font-medium text-slate-300">No matching credentials</h2>
            <p className="text-slate-500 mt-2">Try adjusting your search query.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-slate-200">
                Your Vault <span className="text-slate-500 text-sm ml-2 font-normal">({filteredPasswords.length} items)</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 justify-items-center sm:justify-items-start">
              {filteredPasswords.map((pwd) => (
                <PasswordCard
                  key={pwd.id}
                  {...pwd}
                  onDelete={handleDeletePassword}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <AddPasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddPassword}
      />
    </div>
  );
}

// THIS IS THE MAIN APP COMPONENT THAT WRAPS EVERYTHING IN THE AUTH SCREEN
export default function App() {
  return (
    <AuthScreen>
      <VaultApp />
    </AuthScreen>
  );
}
