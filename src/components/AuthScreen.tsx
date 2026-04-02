import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Lock, Fingerprint, LogOut, ShieldCheck } from 'lucide-react';

export default function AuthScreen({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'login' | 'setup_pin' | 'enter_pin' | 'unlocked'>('loading');
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  // Listen for user login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user already has a PIN in the database
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().pin) {
          setAuthStatus('enter_pin');
        } else {
          setAuthStatus('setup_pin');
        }
      } else {
        setUser(null);
        setAuthStatus('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetupPin = async () => {
    if (pinInput.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (!user) return;
    try {
      // Save PIN to database
      await setDoc(doc(db, 'users', user.uid), { pin: pinInput }, { merge: true });
      setAuthStatus('unlocked');
      setPinInput('');
    } catch (err) {
      setError("Error saving PIN");
    }
  };

  const handleVerifyPin = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().pin === pinInput) {
        setAuthStatus('unlocked');
        setPinInput('');
        setError('');
      } else {
        setError("Incorrect PIN");
        setPinInput('');
      }
    } catch (err) {
      setError("Error verifying PIN");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setAuthStatus('login');
  };

  const handleFingerprint = () => {
    // True WebAuthn (Fingerprint) requires complex browser APIs. 
    // This is a placeholder for standard browser biometric prompts.
    alert("Biometric WebAuthn requires HTTPS and passkey setup. Coming soon!");
  };

  // --- RENDERING SCREENS ---
  if (authStatus === 'loading') {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Security...</div>;
  }

  // 1. App is unlocked! Show the actual Safe app
  if (authStatus === 'unlocked') {
    return (
      <div className="relative min-h-screen bg-gray-950 text-white">
        <button onClick={handleLogout} className="absolute top-4 right-4 flex items-center gap-2 text-gray-400 hover:text-white transition">
          <LogOut size={18} /> Logout
        </button>
        {children}
      </div>
    );
  }

  // 2. Auth screens (Login, Setup PIN, Enter PIN)
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md flex flex-col items-center">
        
        <div className="bg-blue-500/10 p-4 rounded-full mb-6">
          <ShieldCheck size={48} className="text-blue-500" />
        </div>

        {authStatus === 'login' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Welcome to Safe</h1>
            <p className="text-gray-400 mb-8 text-center">Securely store your passwords.</p>
            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white text-black py-3 rounded-lg font-semibold flex items-center justify-center gap-3 hover:bg-gray-200 transition"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          </>
        )}

        {(authStatus === 'setup_pin' || authStatus === 'enter_pin') && (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-2">
              {authStatus === 'setup_pin' ? 'Create a 4-Digit PIN' : 'Enter your PIN'}
            </h1>
            <p className="text-gray-400 mb-6 text-center">
              {authStatus === 'setup_pin' ? 'This secures your vault on this device.' : user?.email}
            </p>

            <input 
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))} // Only allow numbers
              className="w-32 text-center text-3xl tracking-widest bg-gray-950 border border-gray-700 rounded-lg py-3 focus:outline-none focus:border-blue-500 mb-6"
              placeholder="••••"
            />

            {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

            <button 
              onClick={authStatus === 'setup_pin' ? handleSetupPin : handleVerifyPin}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition mb-4"
            >
              <Lock size={18} />
              {authStatus === 'setup_pin' ? 'Save PIN' : 'Unlock Safe'}
            </button>

            {authStatus === 'enter_pin' && (
              <button onClick={handleFingerprint} className="text-gray-400 hover:text-white flex items-center gap-2 mt-2">
                <Fingerprint size={20} /> Use Fingerprint
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
