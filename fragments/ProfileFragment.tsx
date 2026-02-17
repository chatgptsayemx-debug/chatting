
import React, { useState } from 'react';
import { update, child, get } from "firebase/database";
import { baseRef } from "../firebase";
import { User } from "../types";

interface Props {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (updated: User) => void;
}

const ProfileFragment: React.FC<Props> = ({ currentUser, onLogout, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    username: currentUser.username,
    age: currentUser.age,
    number: currentUser.number,
    profileImage: currentUser.profileImage
  });
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async () => {
    setUpdating(true);
    setMessage({ text: '', type: '' });
    
    try {
      const updates: any = {
        [`users/${currentUser.id}/username`]: formData.username.trim(),
        [`users/${currentUser.id}/age`]: formData.age.trim(),
        [`users/${currentUser.id}/number`]: formData.number.trim(),
        [`users/${currentUser.id}/profileImage`]: formData.profileImage.trim(),
      };
      
      // Requirement: If username changes, update all user messages senderName
      if (formData.username.trim() !== currentUser.username) {
        const chatsSnapshot = await get(child(baseRef, 'chats'));
        if (chatsSnapshot.exists()) {
          const chats = chatsSnapshot.val();
          Object.keys(chats).forEach(chatId => {
            const messages = chats[chatId].messages;
            if (messages) {
              Object.keys(messages).forEach(msgId => {
                if (messages[msgId].senderId === currentUser.id) {
                  updates[`chats/${chatId}/messages/${msgId}/senderName`] = formData.username.trim();
                }
              });
            }
          });
        }
      }
      
      await update(baseRef, updates);
      
      onUpdateUser({ ...currentUser, ...formData });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Update Error:', err);
      setMessage({ text: 'Update failed. Try again.', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8faff]">
      {/* Header */}
      <div className="relative pt-12 pb-24 bg-indigo-600 rounded-b-[3rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 p-12 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col items-center">
            <div className="relative mb-4 group">
                <img 
                    src={formData.profileImage || `https://ui-avatars.com/api/?name=${formData.username}`} 
                    className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl transition-transform group-hover:scale-105" 
                    alt="Profile" 
                />
                <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                    <i className="fa-solid fa-pen text-sm"></i>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{currentUser.username}</h2>
            <p className="text-indigo-100/70 font-medium">@{currentUser.username.toLowerCase().replace(/\s/g, '')}</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="px-6 -mt-16 pb-12 overflow-y-auto hide-scrollbar">
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-indigo-100/50 space-y-5 border border-indigo-50">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Username</label>
                    <input 
                        name="username" 
                        value={formData.username} 
                        onChange={handleChange}
                        className="w-full bg-indigo-50/50 border border-transparent rounded-2xl px-4 py-3.5 font-medium focus:bg-white focus:border-indigo-100 focus:outline-none transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Age</label>
                    <input 
                        name="age" 
                        value={formData.age} 
                        onChange={handleChange}
                        className="w-full bg-indigo-50/50 border border-transparent rounded-2xl px-4 py-3.5 font-medium focus:bg-white focus:border-indigo-100 focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Phone Number</label>
                <input 
                    name="number" 
                    value={formData.number} 
                    onChange={handleChange}
                    className="w-full bg-indigo-50/50 border border-transparent rounded-2xl px-4 py-3.5 font-medium focus:bg-white focus:border-indigo-100 focus:outline-none transition-all"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Profile Image URL</label>
                <input 
                    name="profileImage" 
                    value={formData.profileImage} 
                    onChange={handleChange}
                    className="w-full bg-indigo-50/50 border border-transparent rounded-2xl px-4 py-3.5 font-medium focus:bg-white focus:border-indigo-100 focus:outline-none transition-all"
                />
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl text-sm font-bold text-center animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <button 
                onClick={handleUpdate}
                disabled={updating}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
            >
                {updating ? 'Saving Changes...' : 'Save Profile'}
            </button>

            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-50 transition-colors"
            >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Logout Account</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileFragment;
