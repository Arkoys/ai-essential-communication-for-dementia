import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType } from './firebase';
import { SidebarHistory } from './components/SidebarHistory';
import { ChatWindow } from './components/ChatWindow';
import { DualChatView } from './components/DualChatView';
import { DualInputForm } from './components/DualInputForm';
import { NavigationMap, PhaseName } from './components/NavigationMap';
import { AdminPanel } from './components/AdminPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { generateClinicalResponseWithHistory, isInsufficientInfoResponse, isInsufficientUserInput, getInsufficientInfoGuidance } from './lib/llm';
import { getPromptSettings, PromptSettings, DEFAULT_SUGGESTED_PROMPTS } from './lib/promptSettings';
import { Stethoscope, Menu } from 'lucide-react';
import { cn } from './lib/utils';

import { DEFAULT_KNOWLEDGE_CHUNKS } from './lib/defaultData';
import { generateEmbedding } from './lib/rag';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  isStuck?: boolean;
  isInsufficientInfo?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  type: 'normal' | 'dual';
  primaryProvider?: string;
  secondaryProvider?: string;
}

const PHASES: { name: PhaseName; steps: string[] }[] = [
  {
    name: 'Recognition',
    steps: ['Name Findings', 'Understand Concern', 'Assess Cognition', 'Assess Function'],
  },
  {
    name: 'Evaluation',
    steps: [
      'Assess Cognition',
      'Assess Function',
      'Assess Safety',
      'Targeted Exam',
      'Labs and Imaging',
      'Medication Review',
      'Name Condition',
    ],
  },
  {
    name: 'Diagnosis',
    steps: [
      'Assess and Align Understanding',
      'Address Risks and Concerns',
      'Apply Diagnosis',
      'Plan Follow-up',
      'Stage Condition',
    ],
  },
];

function parseFrameworkPosition(text: string): { phase: PhaseName | null; step: string | null } {
  const normalized = text.toLowerCase();
  const phase = PHASES.find((candidate) => normalized.includes(candidate.name.toLowerCase()))?.name || null;

  let step: string | null = null;
  for (const candidatePhase of PHASES) {
    for (const candidateStep of candidatePhase.steps) {
      if (normalized.includes(candidateStep.toLowerCase())) {
        step = candidateStep;
        break;
      }
    }
    if (step) break;
  }

  return { phase, step };
}

function findPhaseForStep(step: string): PhaseName | null {
  for (const phase of PHASES) {
    if (phase.steps.includes(step)) {
      return phase.name;
    }
  }
  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PhaseName | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [lastDetectedPhase, setLastDetectedPhase] = useState<PhaseName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [promptSettings, setPromptSettings] = useState<PromptSettings | null>(null);
  
  // Dual mode state - per conversation, not global
  const [dualMessages, setDualMessages] = useState<{
    primary: Message[];
    secondary: Message[];
  }>({ primary: [], secondary: [] });
  const [dualLoading, setDualLoading] = useState<{
    primary: boolean;
    secondary: boolean;
  }>({ primary: false, secondary: false });
  
  // Load prompt settings on mount
  useEffect(() => {
    const loadPromptSettings = async () => {
      try {
        const settings = await getPromptSettings();
        setPromptSettings(settings);
      } catch (error) {
        console.error("Error loading prompt settings:", error);
        setPromptSettings({
          provider: 'harvard',
          dualMode: false,
          dualModeProvider: 'minimax',
          systemPrompt: '',
          stuckModePrompt: '',
          suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
          knowledgeContent: '',
        });
      }
    };
    loadPromptSettings();
  }, []);

  const saveFrameworkState = async (
    conversationId: string,
    state: { currentPhase: PhaseName | null; currentStep: string | null; lastDetectedPhase: PhaseName | null }
  ) => {
    try {
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          currentPhase: state.currentPhase,
          currentStep: state.currentStep,
          lastDetectedPhase: state.lastDetectedPhase,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving framework state:', error);
    }
  };

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
          type: data.type || 'normal',
          primaryProvider: data.primaryProvider,
          secondaryProvider: data.secondaryProvider,
        });
      });
      setConversations(convos);
      
      // Update active conversation if it changed
      if (activeConversationId) {
        const updated = convos.find(c => c.id === activeConversationId);
        if (updated && updated.id !== activeConversation?.id) {
          setActiveConversation(updated);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    // Clear dual messages when switching conversations
    setDualMessages({ primary: [], secondary: [] });
    setDualLoading({ primary: false, secondary: false });
    setActiveConversationId(id);
    const conv = conversations.find(c => c.id === id);
    setActiveConversation(conv || null);
  };

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
          isStuck: data.isStuck || false,
          isInsufficientInfo: data.isInsufficientInfo || false,
        });
      });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${activeConversationId}/messages`);
    });

    return () => unsubscribe();
  }, [activeConversationId, user, isAuthReady]);

  // Fetch framework state for Active Conversation
  useEffect(() => {
    if (!isAuthReady || !user || !activeConversationId) {
      setCurrentPhase(null);
      setCurrentStep(null);
      setLastDetectedPhase(null);
      return;
    }

    const conversationRef = doc(db, 'conversations', activeConversationId);
    const unsubscribe = onSnapshot(conversationRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const phase =
        data.currentPhase === 'Recognition' || data.currentPhase === 'Evaluation' || data.currentPhase === 'Diagnosis'
          ? (data.currentPhase as PhaseName)
          : null;
      const detectedPhase =
        data.lastDetectedPhase === 'Recognition' ||
        data.lastDetectedPhase === 'Evaluation' ||
        data.lastDetectedPhase === 'Diagnosis'
          ? (data.lastDetectedPhase as PhaseName)
          : phase;

      setCurrentPhase(phase || detectedPhase);
      setCurrentStep(typeof data.currentStep === 'string' ? data.currentStep : null);
      setLastDetectedPhase(detectedPhase);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${activeConversationId}`);
    });

    return () => unsubscribe();
  }, [activeConversationId, user, isAuthReady]);

  // Determine if current conversation is dual mode
  const isDualMode = activeConversation?.type === 'dual';
  const primaryProvider = activeConversation?.primaryProvider || promptSettings?.provider || 'harvard';
  const secondaryProvider = activeConversation?.secondaryProvider || promptSettings?.dualModeProvider || 'minimax';

  // Fallback source: infer framework position from latest assistant output.
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant') || null;
  const inferredFromOutput = latestAssistantMessage
    ? parseFrameworkPosition(latestAssistantMessage.content)
    : { phase: null, step: null };
  const effectivePhase: PhaseName | null =
    currentPhase || lastDetectedPhase || inferredFromOutput.phase || null;
  const effectiveStep: string | null = currentStep || inferredFromOutput.step || null;
  const effectiveDetectedPhase: PhaseName | null =
    lastDetectedPhase || currentPhase || inferredFromOutput.phase || null;

  const handleNewConversation = (type: 'normal' | 'dual' = 'normal') => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentPhase(null);
    setCurrentStep(null);
    setLastDetectedPhase(null);
    setDualMessages({ primary: [], secondary: [] });
    setActiveConversation(null);
  };

  // Create a new dual conversation
  const handleNewDualConversation = async () => {
    if (!user || !promptSettings) return;
    
    try {
      const title = `Dual Mode - ${new Date().toLocaleTimeString()}`;
      const convRef = await addDoc(collection(db, 'conversations'), {
        userId: user.uid,
        title,
        type: 'dual',
        primaryProvider: promptSettings.provider,
        secondaryProvider: promptSettings.dualModeProvider,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveConversationId(convRef.id);
      setDualMessages({ primary: [], secondary: [] });
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error creating dual conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const messagesRef = collection(db, `conversations/${id}/messages`);
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'conversations', id));
      
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `conversations/${id}`);
    }
  };

  const handleSendMessage = async (content: string, isStuck?: boolean) => {
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
          type: 'normal',
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

      // Check if user input is insufficient
      const inputIsInsufficient = isStuck ? false : isInsufficientUserInput(content);
      
      let finalContent: string;
      let isInsufficientInfo: boolean;
      let detectedPhase: PhaseName | null = null;
      let detectedStep: string | null = null;
      
      if (inputIsInsufficient) {
        finalContent = getInsufficientInfoGuidance();
        isInsufficientInfo = true;
      } else {
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        
        const responseText = await generateClinicalResponseWithHistory(
          content,
          history,
          effectivePhase,
          isStuck
        );

        const responseIsInsufficient = isInsufficientInfoResponse(responseText);
        
        finalContent = responseIsInsufficient ? getInsufficientInfoGuidance() : responseText;
        isInsufficientInfo = responseIsInsufficient;

        const parsed = parseFrameworkPosition(responseText);
        detectedPhase = parsed.phase;
        detectedStep = parsed.step;
      }

      let nextPhase = currentPhase;
      let nextStep = currentStep;
      let nextDetectedPhase = lastDetectedPhase;
      if (detectedPhase) {
        setCurrentPhase(detectedPhase);
        setLastDetectedPhase(detectedPhase);
        nextPhase = detectedPhase;
        nextDetectedPhase = detectedPhase;
      }
      if (detectedStep) {
        setCurrentStep(detectedStep);
        nextStep = detectedStep;
      }

      await addDoc(collection(db, `conversations/${convId}/messages`), {
        conversationId: convId,
        role: 'assistant',
        content: finalContent,
        isStuck: isStuck || false,
        isInsufficientInfo: isInsufficientInfo,
        createdAt: serverTimestamp(),
      });

      await saveFrameworkState(convId, {
        currentPhase: nextPhase,
        currentStep: nextStep,
        lastDetectedPhase: nextDetectedPhase,
      });

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhase = (phase: PhaseName) => {
    setCurrentPhase(phase);
    setCurrentStep(null);
    setLastDetectedPhase(phase);

    if (activeConversationId) {
      saveFrameworkState(activeConversationId, {
        currentPhase: phase,
        currentStep: null,
        lastDetectedPhase: phase,
      }).catch((error) => {
        console.error('Error saving selected phase:', error);
      });
    }
  };

  const handleSelectStep = (step: string) => {
    if (!user) return;
    const phaseForStep = findPhaseForStep(step);
    const activePhase = phaseForStep || currentPhase;
    if (phaseForStep) {
      setCurrentPhase(phaseForStep);
      setLastDetectedPhase(phaseForStep);
    }
    setCurrentStep(step);

    if (activeConversationId) {
      const selectedPhase = phaseForStep || currentPhase;
      saveFrameworkState(activeConversationId, {
        currentPhase: selectedPhase,
        currentStep: step,
        lastDetectedPhase: selectedPhase || lastDetectedPhase,
      }).catch((error) => {
        console.error('Error saving selected step:', error);
      });
    }

    const prompt = `I need help with the "${step}" step in the ${activePhase || 'current'} phase of dementia care.`;
    
    if (isDualMode) {
      handleDualSendMessage(prompt, false);
    } else {
      handleSendMessage(prompt, false);
    }
  };

  // Dual mode: send message to both providers
  const handleDualSendMessage = async (content: string, isStuck?: boolean) => {
    if (!user) return;
    
    // Add user message to both conversations
    const userMsgPrimary: Message = {
      id: `user-${Date.now()}-primary`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    const userMsgSecondary: Message = {
      id: `user-${Date.now()}-secondary`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    
    setDualMessages(prev => ({
      primary: [...prev.primary, userMsgPrimary],
      secondary: [...prev.secondary, userMsgSecondary],
    }));
    
    setDualLoading({ primary: true, secondary: true });

    try {
      // Run both models in parallel
      const [primaryResponse, secondaryResponse] = await Promise.allSettled([
        generateClinicalResponseWithHistory(content, [], null, isStuck, primaryProvider),
        generateClinicalResponseWithHistory(content, [], null, isStuck, secondaryProvider),
      ]);

      // Handle primary response
      if (primaryResponse.status === 'fulfilled') {
        const assistantMsgPrimary: Message = {
          id: `assistant-${Date.now()}-primary`,
          role: 'assistant',
          content: primaryResponse.value,
          createdAt: new Date(),
        };
        setDualMessages(prev => ({ ...prev, primary: [...prev.primary, assistantMsgPrimary] }));
      } else {
        const errorMsgPrimary: Message = {
          id: `error-${Date.now()}-primary`,
          role: 'assistant',
          content: `❌ Error: ${primaryResponse.reason?.message || 'Failed to get response from ' + primaryProvider}`,
          createdAt: new Date(),
        };
        setDualMessages(prev => ({ ...prev, primary: [...prev.primary, errorMsgPrimary] }));
      }
      setDualLoading(prev => ({ ...prev, primary: false }));

      // Handle secondary response
      if (secondaryResponse.status === 'fulfilled') {
        const assistantMsgSecondary: Message = {
          id: `assistant-${Date.now()}-secondary`,
          role: 'assistant',
          content: secondaryResponse.value,
          createdAt: new Date(),
        };
        setDualMessages(prev => ({ ...prev, secondary: [...prev.secondary, assistantMsgSecondary] }));
      } else {
        const errorMsgSecondary: Message = {
          id: `error-${Date.now()}-secondary`,
          role: 'assistant',
          content: `❌ Error: ${secondaryResponse.reason?.message || 'Failed to get response from ' + secondaryProvider}`,
          createdAt: new Date(),
        };
        setDualMessages(prev => ({ ...prev, secondary: [...prev.secondary, errorMsgSecondary] }));
      }
      setDualLoading(prev => ({ ...prev, secondary: false }));

    } catch (error) {
      console.error("Error in dual mode:", error);
      setDualLoading({ primary: false, secondary: false });
    }
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Dementia Clinical Coach</h1>
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
          <div className="flex justify-center">
            <img
              src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg"
              alt="Ariadne Labs"
              className="sm:h-20 h-8 w-auto invert dark:invert-0"
            />
          </div>
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
          onSelect={handleSelectConversation}
          onNew={() => handleNewConversation('normal')}
          onNewDual={handleNewDualConversation}
          onDelete={handleDeleteConversation}
          onLogout={logOut}
          userEmail={user.email}
          setShowAdminPanel={setShowAdminPanel}
          setShowSettingsPanel={setShowSettingsPanel}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <Stethoscope size={20} className="text-orange-600 dark:text-orange-400" />
            Dementia Assistant
            {isDualMode && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Dual</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400">
            <Menu size={24} />
          </button>
        </div>

        <NavigationMap
          currentPhase={effectivePhase}
          currentStep={effectiveStep}
          detectedPhase={effectiveDetectedPhase}
          onSelectPhase={handleSelectPhase}
          onSelectStep={handleSelectStep}
        />
        
        <div className="flex-1 relative min-h-0">
          {isDualMode ? (
            <>
              <DualChatView
                primaryMessages={dualMessages.primary}
                secondaryMessages={dualMessages.secondary}
                primaryProvider={primaryProvider}
                secondaryProvider={secondaryProvider}
                primaryLoading={dualLoading.primary}
                secondaryLoading={dualLoading.secondary}
              />
              {/* Dual mode input overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 p-2 md:p-4 pt-8 md:pt-12">
                <DualInputForm
                  onSendMessage={handleDualSendMessage}
                  primaryLoading={dualLoading.primary}
                  secondaryLoading={dualLoading.secondary}
                />
              </div>
            </>
          ) : (
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              suggestedPrompts={promptSettings?.suggestedPrompts || DEFAULT_SUGGESTED_PROMPTS}
            />
          )}
        </div>
      </div>
      
      {showAdminPanel && user.email === 'victor.negadi@gmail.com' && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
      
      {showSettingsPanel && (
        <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
      )}
    </div>
  );
}