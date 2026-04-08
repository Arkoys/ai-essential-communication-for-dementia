import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from './firebase';
import { SidebarHistory, Conversation } from './components/SidebarHistory';
import { ChatWindow } from './components/ChatWindow';
import { NavigationMap, PhaseName } from './components/NavigationMap';
import { AdminPanel } from './components/AdminPanel';
import { Stethoscope, Settings, Menu } from 'lucide-react';
import { cn } from './lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PhaseName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/conversations?userId=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        })));
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [user]);

  // Fetch Conversations
  useEffect(() => {
    if (isAuthReady && user) {
      fetchConversations();
    } else {
      setConversations([]);
    }
  }, [user, isAuthReady, fetchConversations]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        })));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [activeConversationId]);

  // Fetch Messages for Active Conversation
  useEffect(() => {
    fetchMessages();
  }, [activeConversationId, fetchMessages]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentPhase(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (activeConversationId === id) {
        handleNewConversation();
      }
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      let convId = activeConversationId;
      
      // Create new conversation if none active
      if (!convId) {
        const title = content.length > 40 ? content.substring(0, 40) + '...' : content;
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, title })
        });
        const data = await res.json();
        convId = data.id;
        setActiveConversationId(convId);
        fetchConversations();
      }

      // Optimistically add user message
      const tempUserMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Send to API
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, currentPhase })
      });
      
      if (res.ok) {
        // Re-fetch to get exact IDs and timestamps
        fetchMessages();
        fetchConversations(); // update timestamp
      }

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhase = (phase: PhaseName) => {
    setCurrentPhase(phase);
  };

  const handleSelectStep = (step: string) => {
    if (!user) return;
    const prompt = `I need help with the "${step}" step in the ${currentPhase || 'current'} phase of dementia care.`;
    handleSendMessage(prompt);
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setLoginError('Popups are blocked by your browser. Please allow popups for this site (check the address bar) and try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setLoginError('Sign-in was cancelled. Please try again.');
      } else {
        setLoginError('An error occurred during sign-in. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Dementia Clinical Assistant</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Evidence-based decision support for primary care providers.</p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex justify-center items-center"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
          {loginError && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50 text-left">
              {loginError}
            </div>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            For authorized clinical personnel only. Do not input identifiable patient data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-zinc-950 overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarHistory
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onLogout={logOut}
          userEmail={user.email}
          setShowAdminPanel={setShowAdminPanel}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <Stethoscope size={20} className="text-orange-600 dark:text-orange-400" />
            Dementia Assistant
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400">
            <Menu size={24} />
          </button>
        </div>

        <NavigationMap
          currentPhase={currentPhase}
          onSelectPhase={handleSelectPhase}
          onSelectStep={handleSelectStep}
        />
        
        <div className="flex-1 relative min-h-0">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
      
      {showAdminPanel && user.email === 'victor.negadi@gmail.com' && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}
