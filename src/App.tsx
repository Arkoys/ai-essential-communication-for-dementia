import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType } from './firebase';
import { SidebarHistory, Conversation } from './components/SidebarHistory';
import { ChatWindow } from './components/ChatWindow';
import { NavigationMap, PhaseName } from './components/NavigationMap';
import { AdminPanel } from './components/AdminPanel';
import { generateClinicalResponseWithHistory } from './lib/llm';
import { Stethoscope, Settings, Menu } from 'lucide-react';
import { cn } from './lib/utils';

import { DEFAULT_KNOWLEDGE_CHUNKS } from './lib/defaultData';
import { generateEmbedding } from './lib/rag';

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

  // Auto-seed default resources if empty
  useEffect(() => {
    if (!isAuthReady || !user || user.email !== 'victor.negadi@gmail.com') return;

    const checkAndSeed = async () => {
      try {
        const chunksRef = collection(db, 'knowledge_chunks');
        const snapshot = await getDocs(chunksRef);
        if (snapshot.empty) {
          console.log("Knowledge base is empty. Auto-seeding default resources...");
          for (const chunk of DEFAULT_KNOWLEDGE_CHUNKS) {
            const embedding = await generateEmbedding(chunk.content);
            await addDoc(collection(db, 'knowledge_chunks'), {
              content: chunk.content,
              source: chunk.source,
              embedding,
            });
          }
          console.log("Auto-seeding complete!");
        }
      } catch (error) {
        console.error("Error during auto-seeding:", error);
      }
    };

    checkAndSeed();
  }, [user, isAuthReady]);

  // Fetch Conversations
  useEffect(() => {
    if (!isAuthReady || !user) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        convos.push({
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      setConversations(convos);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Fetch Messages for Active Conversation
  useEffect(() => {
    if (!isAuthReady || !user || !activeConversationId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `conversations/${activeConversationId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          role: data.role,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${activeConversationId}/messages`);
    });

    return () => unsubscribe();
  }, [activeConversationId, user, isAuthReady]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentPhase(null);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      // Delete messages first
      const messagesRef = collection(db, `conversations/${id}/messages`);
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete conversation
      await deleteDoc(doc(db, 'conversations', id));
      
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `conversations/${id}`);
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
        const convRef = await addDoc(collection(db, 'conversations'), {
          userId: user.uid,
          title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        convId = convRef.id;
        setActiveConversationId(convId);
      }

      // Add user message to Firestore
      await addDoc(collection(db, `conversations/${convId}/messages`), {
        conversationId: convId,
        role: 'user',
        content,
        createdAt: serverTimestamp(),
      });

      // Prepare history for LLM
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      // Generate response
      const responseText = await generateClinicalResponseWithHistory(content, history, currentPhase);

      // Add assistant message to Firestore
      await addDoc(collection(db, `conversations/${convId}/messages`), {
        conversationId: convId,
        role: 'assistant',
        content: responseText,
        createdAt: serverTimestamp(),
      });

      // Update conversation timestamp
      await setDoc(doc(db, 'conversations', convId), {
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
      // We could add an error message to the UI here
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
