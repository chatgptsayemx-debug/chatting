import React, { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp, get, child } from "firebase/database";
import { db, baseRef } from "./firebase";
import { User, AppScreen, MainTab } from "./types";
import LoginFragment from "./fragments/LoginFragment";
import SignupFragment from "./fragments/SignupFragment";
import HomeFragment from "./fragments/HomeFragment";
import ProfileFragment from "./fragments/ProfileFragment";
import ChatFragment from "./fragments/ChatFragment";

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('SPLASH');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('HOME');

  useEffect(() => {
    const savedUser = localStorage.getItem('chat_user_session');
    const timer = setTimeout(async () => {
      if (savedUser) {
        const userId = JSON.parse(savedUser).id;
        try {
          const snapshot = await get(child(baseRef, `users/${userId}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            handleLoginSuccess({ ...userData, id: userId });
          } else {
            setScreen('AUTH');
          }
        } catch (e) {
          setScreen('AUTH');
        }
      } else {
        setScreen('AUTH');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    localStorage.setItem('chat_user_session', JSON.stringify({ id: user.id }));
    
    // Presence System: uses DatabaseReference.onDisconnect() as required
    const userStatusRef = child(baseRef, `users/${user.id}/online`);
    const lastSeenRef = child(baseRef, `users/${user.id}/lastSeen`);
    
    onValue(ref(db, '.info/connected'), (snapshot) => {
      if (snapshot.val() === true) {
        onDisconnect(userStatusRef).set(false);
        onDisconnect(lastSeenRef).set(serverTimestamp());
        set(userStatusRef, true);
        set(lastSeenRef, serverTimestamp());
      }
    });

    setScreen('MAIN');
    setMainTab('HOME');
  }, []);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      await set(child(baseRef, `users/${currentUser.id}/online`), false);
      await set(child(baseRef, `users/${currentUser.id}/lastSeen`), serverTimestamp());
    }
    localStorage.removeItem('chat_user_session');
    setCurrentUser(null);
    setScreen('AUTH');
  }, [currentUser]);

  const navigateToChat = (userId: string) => {
    setActiveChatUserId(userId);
    setMainTab('CHAT');
  };

  if (screen === 'SPLASH') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-indigo-600 text-white overflow-hidden">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
          <i className="fa-solid fa-comments text-5xl"></i>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chats For Private</h1>
        <p className="mt-2 text-indigo-100/60 font-medium">Production-Grade Realtime Messaging</p>
      </div>
    );
  }

  if (screen === 'AUTH') {
    return (
      <div className="h-screen flex flex-col bg-white overflow-hidden max-w-md mx-auto shadow-2xl">
        {authMode === 'LOGIN' ? (
          <LoginFragment 
            onSuccess={handleLoginSuccess} 
            onSwitch={() => setAuthMode('SIGNUP')} 
          />
        ) : (
          <SignupFragment 
            onSuccess={handleLoginSuccess} 
            onSwitch={() => setAuthMode('LOGIN')} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f0f2f5] max-w-md mx-auto relative overflow-hidden shadow-2xl border-x border-gray-100">
      {/* Fragments Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {mainTab === 'HOME' && (
          <HomeFragment 
            currentUser={currentUser!} 
            onSelectUser={navigateToChat} 
          />
        )}
        {mainTab === 'PROFILE' && (
          <ProfileFragment 
            currentUser={currentUser!} 
            onLogout={handleLogout}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}
        {mainTab === 'CHAT' && activeChatUserId && (
          <ChatFragment 
            currentUserId={currentUser!.id} 
            targetUserId={activeChatUserId} 
            onBack={() => setMainTab('HOME')}
          />
        )}
      </div>

      {/* Material 3 Bottom Navigation */}
      {mainTab !== 'CHAT' && (
        <nav className="h-20 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-2 z-20">
          <button 
            onClick={() => setMainTab('HOME')}
            className="flex flex-col items-center justify-center flex-1 h-full group"
          >
            <div className={`px-6 py-1 rounded-full mb-1 transition-all duration-300 ${mainTab === 'HOME' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>
              <i className={`fa-solid fa-message text-xl ${mainTab === 'HOME' ? 'scale-110' : ''}`}></i>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${mainTab === 'HOME' ? 'text-indigo-700' : 'text-gray-400'}`}>Chats</span>
          </button>
          
          <button 
            onClick={() => setMainTab('PROFILE')}
            className="flex flex-col items-center justify-center flex-1 h-full group"
          >
            <div className={`px-6 py-1 rounded-full mb-1 transition-all duration-300 ${mainTab === 'PROFILE' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}>
              <i className={`fa-solid fa-user-gear text-xl ${mainTab === 'PROFILE' ? 'scale-110' : ''}`}></i>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${mainTab === 'PROFILE' ? 'text-indigo-700' : 'text-gray-400'}`}>Account</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;