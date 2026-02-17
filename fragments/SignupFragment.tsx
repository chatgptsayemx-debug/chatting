import React, { useState } from 'react';
import { get, child, push, set, serverTimestamp } from "firebase/database";
import { baseRef } from "../firebase";
import { User } from "../types";

interface Props {
  onSuccess: (user: User) => void;
  onSwitch: () => void;
}

const SignupFragment: React.FC<Props> = ({ onSuccess, onSwitch }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    age: '',
    number: '',
    profileImage: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = formData.username.trim();
    const password = formData.password.trim();
    const age = formData.age.trim();
    const number = formData.number.trim();
    const profileImage = formData.profileImage.trim();
    
    // Field Validation
    if (!username || !password || !age || !number || !profileImage) {
      setError('All fields are required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch all users to check uniqueness locally (bypasses Index not defined error)
      const usersSnapshot = await get(child(baseRef, 'users'));
      let usernameExists = false;
      
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        usernameExists = Object.values(users).some((u: any) => 
          u.username.toLowerCase() === username.toLowerCase()
        );
      }
      
      if (usernameExists) {
        setError('Username already taken. Please choose another.');
        setLoading(false);
        return;
      }

      const newUserRef = push(child(baseRef, 'users'));
      const userData = {
        username,
        password,
        age,
        number,
        profileImage,
        online: true,
        lastSeen: serverTimestamp()
      };

      await set(newUserRef, userData);
      
      // Navigate to main screen
      onSuccess({ 
        ...userData, 
        id: newUserRef.key!, 
        lastSeen: Date.now() 
      });
      
    } catch (err) {
      console.error('Signup Error:', err);
      setError('An error occurred during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-8 pt-10 overflow-y-auto hide-scrollbar">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Create Account</h2>
        <p className="text-gray-500 font-medium">Join the private chat network</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Profile Image Preview */}
        <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
                <img 
                    src={formData.profileImage || `https://ui-avatars.com/api/?name=${formData.username || 'User'}&background=6366f1&color=fff`} 
                    className="w-full h-full rounded-full object-cover border-4 border-indigo-50 shadow-md transition-all"
                    alt="Profile Preview"
                />
                <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                    <i className="fa-solid fa-camera text-xs"></i>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Username</label>
                <input name="username" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="johndoe" value={formData.username} onChange={handleChange} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Age</label>
                <input name="age" type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="25" value={formData.age} onChange={handleChange} />
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Phone Number</label>
            <input name="number" type="tel" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="+1 234 567 890" value={formData.number} onChange={handleChange} />
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Profile Image URL</label>
            <input name="profileImage" type="url" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="https://image.com/avatar.jpg" value={formData.profileImage} onChange={handleChange} />
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Password</label>
            <input name="password" type="password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" value={formData.password} onChange={handleChange} />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-center space-x-3">
            <i className="fa-solid fa-circle-exclamation text-red-500"></i>
            <p className="text-red-700 text-xs font-bold">{error}</p>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              <span>Creating Account...</span>
            </span>
          ) : 'Sign Up Now'}
        </button>
      </form>

      <div className="mt-6 pb-12 text-center">
        <p className="text-gray-500 font-medium">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-indigo-600 font-bold hover:underline transition-all">Log In</button>
        </p>
      </div>
    </div>
  );
};

export default SignupFragment;