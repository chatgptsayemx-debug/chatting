import React, { useState } from 'react';
import { get, child } from "firebase/database";
import { baseRef } from "../firebase";
import { User } from "../types";

interface Props {
  onSuccess: (user: User) => void;
  onSwitch: () => void;
}

const LoginFragment: React.FC<Props> = ({ onSuccess, onSwitch }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) return;
    
    setLoading(true);
    setError('');

    try {
      // Fetch users and find locally to avoid "Index not defined" error
      const usersSnapshot = await get(child(baseRef, 'users'));
      
      if (usersSnapshot.exists()) {
        const usersObj = usersSnapshot.val();
        const userId = Object.keys(usersObj).find(id => 
          usersObj[id].username.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (userId) {
          const userData = usersObj[userId];
          if (userData.password === password) {
            onSuccess({ ...userData, id: userId });
          } else {
            setError('Invalid password');
          }
        } else {
          setError('User not found');
        }
      } else {
        setError('No users registered yet');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-8 pt-12">
      <div className="mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h2>
        <p className="text-gray-500 font-medium">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Username</label>
          <input 
            type="text" 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Password</label>
          <input 
            type="password" 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium px-1">{error}</p>}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-auto pb-12 text-center">
        <p className="text-gray-500 font-medium">
          Don't have an account?{' '}
          <button onClick={onSwitch} className="text-indigo-600 font-bold hover:underline">Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default LoginFragment;