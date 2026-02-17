
import React, { useState, useEffect } from 'react';
import { onValue, child } from "firebase/database";
import { baseRef } from "../firebase";
import { User } from "../types";

interface Props {
  currentUser: User;
  onSelectUser: (id: string) => void;
}

const HomeFragment: React.FC<Props> = ({ currentUser, onSelectUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = child(baseRef, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userList: User[] = Object.keys(data)
          .map(key => ({ ...data[key], id: key }))
          .filter(u => u.id !== currentUser.id);
        setUsers(userList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = users.filter(u => u.online).length;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-6 bg-indigo-600 text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Chats</h1>
            <p className="text-indigo-100 text-sm opacity-80">{onlineCount} users online now</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
             <i className="fa-solid fa-search"></i>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search people..." 
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-12 py-3.5 focus:bg-white focus:text-gray-900 focus:outline-none transition-all placeholder:text-indigo-100/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 opacity-60"></i>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-2 py-4">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-medium">Loading connections...</p>
            </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <i className="fa-solid fa-user-group text-6xl mb-6 opacity-10"></i>
            <p className="text-lg font-medium">No users found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map(user => (
              <button 
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className="w-full flex items-center p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors clickable text-left group"
              >
                <div className="relative">
                  <img 
                    src={user.profileImage || `https://ui-avatars.com/api/?name=${user.username}`} 
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                    alt={user.username}
                  />
                  {user.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-gray-900 text-lg">{user.username}</h3>
                    <span className="text-xs text-gray-400 font-medium">
                      {user.online ? 'Online' : new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium truncate mt-0.5">
                    {user.online ? 'Tap to start chatting' : `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeFragment;
