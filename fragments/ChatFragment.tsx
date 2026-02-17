import React, { useState, useEffect, useRef } from 'react';
import { onValue, child, push, set, serverTimestamp, update, remove } from "firebase/database";
import { baseRef } from "../firebase";
import { Message, User } from "../types";
import { audioService } from "../services/audioService";
import { notificationService } from "../services/notificationService";
import { GoogleGenAI } from "@google/genai";

interface Props {
  currentUserId: string;
  targetUserId: string;
  onBack: () => void;
}

const ChatFragment: React.FC<Props> = ({ currentUserId, targetUserId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [suggesting, setSuggesting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<any>(null);

  const chatId = [currentUserId, targetUserId].sort().join('_');

  // Fetch users info
  useEffect(() => {
    const unsubTarget = onValue(child(baseRef, `users/${targetUserId}`), snap => setTargetUser(snap.val()));
    const unsubCurrent = onValue(child(baseRef, `users/${currentUserId}`), snap => setCurrentUserData(snap.val()));
    return () => {
      unsubTarget();
      unsubCurrent();
    };
  }, [targetUserId, currentUserId]);

  // Realtime messages
  useEffect(() => {
    const chatRef = child(baseRef, `chats/${chatId}/messages`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgList: Message[] = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })).sort((a, b) => a.timestamp - b.timestamp);

        // Notify only if it's a new incoming message
        const lastMsg = msgList[msgList.length - 1];
        const prevLastMsg = messages[messages.length - 1];
        
        if (lastMsg && lastMsg.senderId !== currentUserId) {
          if (!prevLastMsg || lastMsg.timestamp > prevLastMsg.timestamp) {
            audioService.playReceive();
            if (document.visibilityState === 'hidden') {
              notificationService.show(lastMsg.senderName, lastMsg.text || 'Sent an image');
            }
          }
        }

        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUserId, messages.length]);

  // Typing indicator listener
  useEffect(() => {
    const typingRef = child(baseRef, `chats/${chatId}/typing/${targetUserId}`);
    const unsubscribe = onValue(typingRef, snap => setIsTyping(!!snap.val()));
    return () => {
      // Clear own typing status when leaving
      set(child(baseRef, `chats/${chatId}/typing/${currentUserId}`), false);
      unsubscribe();
    };
  }, [chatId, targetUserId, currentUserId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleTyping = (text: string) => {
    setInputText(text);
    
    const statusRef = child(baseRef, `chats/${chatId}/typing/${currentUserId}`);
    set(statusRef, true);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      set(statusRef, false);
    }, 1500);
  };

  const sendMessage = async (text?: string, imgUrl?: string) => {
    const cleanText = (text || '').trim();
    if ((!cleanText && !imgUrl) || !currentUserData) return;

    // Rate limiting: 800ms
    const now = Date.now();
    if (now - lastMessageTime < 800) return;
    setLastMessageTime(now);

    const msgRef = push(child(baseRef, `chats/${chatId}/messages`));
    const msgData = {
      senderId: currentUserId,
      senderName: currentUserData.username,
      text: cleanText,
      imageUrl: imgUrl || '',
      timestamp: serverTimestamp(),
      edited: false,
      deleted: false
    };

    try {
      await set(msgRef, msgData);
      audioService.playSend();
      setInputText('');
      set(child(baseRef, `chats/${chatId}/typing/${currentUserId}`), false);
    } catch (e) {
      console.error("Message send failed", e);
    }
  };

  const deleteMessage = async (msgId: string) => {
    await update(child(baseRef, `chats/${chatId}/messages/${msgId}`), {
      deleted: true,
      text: 'This message was deleted',
      imageUrl: ''
    });
  };

  const editMessage = async (msgId: string, oldText: string) => {
    const newText = prompt('Edit message:', oldText);
    if (newText && newText.trim() !== oldText) {
      await update(child(baseRef, `chats/${chatId}/messages/${msgId}`), {
        text: newText.trim(),
        edited: true
      });
    }
  };

  const bulkDelete = async () => {
    if (!confirm('Permanently delete all your messages in this chat?')) return;
    const updates: any = {};
    messages.forEach(m => {
      if (m.senderId === currentUserId) {
        updates[m.id] = null;
      }
    });
    await update(child(baseRef, `chats/${chatId}/messages`), updates);
  };

  const handleAISuggestion = async () => {
    if (messages.length === 0 || suggesting) return;
    setSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = messages.slice(-5).map(m => `${m.senderName}: ${m.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Recent messages:\n${context}\n\nSuggest a single concise reply for ${currentUserData?.username}. Return ONLY the reply text.`,
      });

      if (response.text) {
        setInputText(response.text.trim());
      }
    } catch (error) {
      console.error('Gemini Error:', error);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#e5ddd5] relative overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-3 py-3 flex items-center shadow-lg z-20">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="ml-2 flex items-center flex-1">
          <img 
            src={targetUser?.profileImage || `https://ui-avatars.com/api/?name=${targetUser?.username}`} 
            className="w-10 h-10 rounded-full object-cover border border-white/20"
            alt=""
          />
          <div className="ml-3 flex-1">
            <h3 className="font-bold text-sm leading-tight truncate">{targetUser?.username || 'User'}</h3>
            <p className="text-[10px] text-indigo-100 opacity-90">
              {isTyping ? <span className="animate-pulse font-bold">Typing...</span> : (targetUser?.online ? 'Online' : 'Last seen recently')}
            </p>
          </div>
        </div>
        <button onClick={bulkDelete} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
          <i className="fa-solid fa-broom"></i>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-6 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl shadow-sm relative group ${
                  isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'
                }`}
              >
                {!isMe && <p className="text-[10px] font-bold text-indigo-500 mb-0.5">{msg.senderName}</p>}
                
                {msg.imageUrl && !msg.deleted && (
                  <div className="mb-2 -mx-1 -mt-1 overflow-hidden rounded-xl">
                    <img 
                      src={msg.imageUrl} 
                      className="w-full max-h-64 object-cover cursor-pointer" 
                      onClick={() => setFullscreenImage(msg.imageUrl!)}
                      alt="Shared Image" 
                    />
                  </div>
                )}
                
                <p className={`text-[14px] leading-relaxed ${msg.deleted ? 'italic opacity-60 text-xs' : ''}`}>
                  {msg.text}
                </p>
                
                <div className={`flex items-center justify-end space-x-1 mt-1 opacity-60 text-[9px]`}>
                  {msg.edited && !msg.deleted && <span>edited •</span>}
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && !msg.deleted && <i className="fa-solid fa-check-double text-[8px] text-white"></i>}
                </div>

                {isMe && !msg.deleted && (
                  <div className="absolute top-0 right-full mr-2 hidden group-hover:flex flex-col space-y-1">
                    <button onClick={() => deleteMessage(msg.id)} className="p-2 rounded-full bg-white/90 text-red-500 shadow-sm"><i className="fa-solid fa-trash text-[10px]"></i></button>
                    <button onClick={() => editMessage(msg.id, msg.text)} className="p-2 rounded-full bg-white/90 text-indigo-600 shadow-sm"><i className="fa-solid fa-pen text-[10px]"></i></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-none flex space-x-1 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             </div>
           </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white/80 backdrop-blur-md p-3 border-t border-gray-100 z-20">
        <button 
          onClick={handleAISuggestion}
          disabled={suggesting || messages.length === 0}
          className={`w-full mb-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border transition-all ${
            suggesting ? 'bg-indigo-50 text-indigo-300 border-indigo-100' : 'bg-indigo-600 text-white border-transparent shadow-md active:scale-95'
          }`}
        >
          <i className={`fa-solid ${suggesting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
          <span>{suggesting ? 'Gemini is thinking...' : 'Gemini Smart Suggest'}</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowImageDialog(true)}
            className="w-11 h-11 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors"
          >
            <i className="fa-solid fa-camera"></i>
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Write something..."
              className="w-full bg-gray-50 rounded-2xl px-5 py-3.5 pr-12 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium border border-gray-100"
              value={inputText}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
            />
            <button 
              disabled={!inputText.trim()}
              onClick={() => sendMessage(inputText)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-indigo-600 disabled:opacity-20"
            >
              <i className="fa-solid fa-paper-plane text-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showImageDialog && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowImageDialog(false)}>
            <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <h4 className="text-xl font-bold text-gray-900 mb-6">Attach Image</h4>
                <div className="space-y-4">
                    <input 
                        type="url" 
                        placeholder="Paste image URL..." 
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                    />
                    <div className="flex space-x-3">
                      <button onClick={() => setShowImageDialog(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl">Cancel</button>
                      <button 
                          onClick={() => {
                              sendMessage('', imageUrlInput);
                              setImageUrlInput('');
                              setShowImageDialog(false);
                          }}
                          className="flex-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200"
                      >
                          Send Now
                      </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col" onClick={() => setFullscreenImage(null)}>
            <div className="p-4 flex justify-between items-center text-white">
                <span className="font-bold text-sm">Image Preview</span>
                <button className="text-2xl p-2"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
                <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatFragment;