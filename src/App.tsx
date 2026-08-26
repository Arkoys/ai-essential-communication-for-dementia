import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType } from './firebase';
import { SidebarHistory } from './components/SidebarHistory';
import { ChatWindow } from './components/ChatWindow';
import { DualChatView } from './components/DualChatView';
import { DualInputForm } from './components/DualInputForm';
import { CompareChatView } from './components/CompareChatView';
import { CompareInputForm } from './components/CompareInputForm';
import { NavigationMap, PhaseName } from './components/NavigationMap';
import { AdminPanel } from './components/AdminPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ResourcesPanel } from './components/ResourcesPanel';
import { generateClinicalResponseWithHistory, isInsufficientInfoResponse, isInsufficientUserInput, getInsufficientInfoGuidance, GenerationResult } from './lib/llm';
import type { ResponsePath } from './lib/classifier/types';
import { getPromptSettings, PromptSettings, DEFAULT_SUGGESTED_PROMPTS } from './lib/promptSettings';
import { Stethoscope, Menu } from 'lucide-react';
import { cn } from './lib/utils';
import { TemplateDevBadge, useTemplateBadge } from './components/TemplateDevBadge';

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
  type: 'normal' | 'dual' | 'compare';
  primaryProvider?: string;
  secondaryProvider?: string;
}

const PHASES: { name: PhaseName; steps: string[] }[] = [
  {
    name: 'Recognition',
    steps: ['Open the Conversation', 'Assess Function', 'Assess Cognition', 'Assess Safety'],
  },
  {
    name: 'Evaluation',
    steps: [
      'Assess Function',
      'Assess Cognition',
      'Assess Safety',
      'Targeted Exam',
      'Labs and Imaging',
      'Medication Review',
      'Name Condition',
    ],
  },
  {
    name: 'Naming & Diagnosis',
    steps: [
      'Assess and Align Understanding',
      'Apply Diagnosis',
      'Stage Condition',
      'Address Risks and Concerns',
      'Plan Follow-up',
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PhaseName | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [lastDetectedPhase, setLastDetectedPhase] = useState<PhaseName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [promptSettings, setPromptSettings] = useState<PromptSettings | null>(null);
  const [isNavMapOpen, setIsNavMapOpen] = useState(false);
  
  // Response mode state (condensed vs basic)
  const [responseMode, setResponseMode] = useState<'basic' | 'condensed'>('basic');
  
  // Dual mode state
  const [dualMessages, setDualMessages] = useState<{
    primary: Message[];
    secondary: Message[];
  }>({ primary: [], secondary: [] });
  const [dualLoading, setDualLoading] = useState<{
    primary: boolean;
    secondary: boolean;
  }>({ primary: false, secondary: false });
  
  // Compare mode state (basic vs condensed)
  const [compareMessages, setCompareMessages] = useState<{
    basic: Message[];
    condensed: Message[];
  }>({ basic: [], condensed: [] });
  const [compareLoading, setCompareLoading] = useState<{
    basic: boolean;
    condensed: boolean;
  }>({ basic: false, condensed: false });
  
  // Dev template badge state
  const { 
    currentTemplate, 
    tier1Complete, 
    isVisible: isBadgeVisible, 
    updateTemplate, 
    hideBadge 
  } = useTemplateBadge();
  
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Get active conversation from conversations array
  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    // Clear state when switching
    setMessages([]);
    setDualMessages({ primary: [], secondary: [] });
    setDualLoading({ primary: false, secondary: false });
    setCurrentPhase(null);
    setCurrentStep(null);
    setLastDetectedPhase(null);
    setActiveConversationId(id);
    setIsSidebarOpen(false);
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
        data.currentPhase === 'Recognition' || data.currentPhase === 'Evaluation' || data.currentPhase === 'Naming & Diagnosis' || data.currentPhase === 'Diagnosis'
          ? (data.currentPhase as PhaseName)
          : null;
      const detectedPhase =
        data.lastDetectedPhase === 'Recognition' ||
        data.lastDetectedPhase === 'Evaluation' ||
        data.lastDetectedPhase === 'Naming & Diagnosis' ||
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

  // Determine if current conversation is dual or compare mode
  const isDualMode = activeConversation?.type === 'dual';
  const isCompareMode = activeConversation?.type === 'compare';
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

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentPhase(null);
    setCurrentStep(null);
    setLastDetectedPhase(null);
    setDualMessages({ primary: [], secondary: [] });
  };

  // Create a new dual conversation
  const handleNewDualConversation = async () => {
    console.log('handleNewDualConversation called');
    if (!user) {
      console.log('Early return: user missing');
      return;
    }
    
    // Get provider settings with fallback defaults
    const primaryProv = promptSettings?.provider || 'harvard';
    const secondaryProv = promptSettings?.dualModeProvider || 'minimax';
    
    try {
      const title = `Dual Mode - ${new Date().toLocaleTimeString()}`;
      console.log('Creating dual conversation with title:', title);
      
      const convRef = await addDoc(collection(db, 'conversations'), {
        userId: user.uid,
        title,
        type: 'dual',
        primaryProvider: primaryProv,
        secondaryProvider: secondaryProv,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('Created conversation with id:', convRef.id);
      
      // Clear dual messages and set new conversation
      setDualMessages({ primary: [], secondary: [] });
      setDualLoading({ primary: false, secondary: false });
      setActiveConversationId(convRef.id);
      setMessages([]);
      setCurrentPhase(null);
      setCurrentStep(null);
      setLastDetectedPhase(null);
      setIsSidebarOpen(false);
      
      console.log('State updated, conversation should be active now');
    } catch (error) {
      console.error("Error creating dual conversation:", error);
    }
  };

  // Create a new compare conversation
  const handleNewCompareConversation = async () => {
    if (!user) return;
    
    try {
      const title = `Compare Mode - ${new Date().toLocaleTimeString()}`;
      
      const convRef = await addDoc(collection(db, 'conversations'), {
        userId: user.uid,
        title,
        type: 'compare',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Clear compare messages and set new conversation
      setCompareMessages({ basic: [], condensed: [] });
      setCompareLoading({ basic: false, condensed: false });
      setActiveConversationId(convRef.id);
      setMessages([]);
      setCurrentPhase(null);
      setCurrentStep(null);
      setLastDetectedPhase(null);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error creating compare conversation:", error);
    }
  };

  // Compare mode: send message with both basic and condensed responses
  const handleCompareSendMessage = async (content: string, isStuck?: boolean) => {
    if (!user) return;
    
    // Add user message to both views
    const userMsgBasic: Message = {
      id: `user-${Date.now()}-basic`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    const userMsgCondensed: Message = {
      id: `user-${Date.now()}-condensed`,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    
    setCompareMessages(prev => ({
      basic: [...prev.basic, userMsgBasic],
      condensed: [...prev.condensed, userMsgCondensed],
    }));
    
    setCompareLoading({ basic: true, condensed: true });

    try {
      // Run both response modes in parallel
      const [basicResponse, condensedResponse] = await Promise.allSettled([
        generateClinicalResponseWithHistory(content, [], null, isStuck, primaryProvider, 'basic'),
        generateClinicalResponseWithHistory(content, [], null, isStuck, primaryProvider, 'condensed'),
      ]);

      // Handle basic response
      if (basicResponse.status === 'fulfilled') {
        const assistantMsgBasic: Message = {
          id: `assistant-${Date.now()}-basic`,
          role: 'assistant',
          content: basicResponse.value.response,
          createdAt: new Date(),
        };
        setCompareMessages(prev => ({ ...prev, basic: [...prev.basic, assistantMsgBasic] }));
      } else {
        const errorMsgBasic: Message = {
          id: `error-${Date.now()}-basic`,
          role: 'assistant',
          content: `❌ Error: ${basicResponse.reason?.message || 'Failed to get basic response'}`,
          createdAt: new Date(),
        };
        setCompareMessages(prev => ({ ...prev, basic: [...prev.basic, errorMsgBasic] }));
      }
      setCompareLoading(prev => ({ ...prev, basic: false }));

      // Handle condensed response
      if (condensedResponse.status === 'fulfilled') {
        const assistantMsgCondensed: Message = {
          id: `assistant-${Date.now()}-condensed`,
          role: 'assistant',
          content: condensedResponse.value.response,
          createdAt: new Date(),
        };
        setCompareMessages(prev => ({ ...prev, condensed: [...prev.condensed, assistantMsgCondensed] }));
      } else {
        const errorMsgCondensed: Message = {
          id: `error-${Date.now()}-condensed`,
          role: 'assistant',
          content: `❌ Error: ${condensedResponse.reason?.message || 'Failed to get condensed response'}`,
          createdAt: new Date(),
        };
        setCompareMessages(prev => ({ ...prev, condensed: [...prev.condensed, errorMsgCondensed] }));
      }
      setCompareLoading(prev => ({ ...prev, condensed: false }));

    } catch (error) {
      console.error("Error in compare mode:", error);
      setCompareLoading({ basic: false, condensed: false });
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

      // NOTE: isInsufficientUserInput check REMOVED
      // The new template classification system handles this better
      // All prompts now go through to the LLM for proper routing
      
      let finalContent: string;
      let isInsufficientInfo: boolean = false;
      let detectedPhase: PhaseName | null = null;
      let detectedStep: string | null = null;
      
      // Get current messages for history
      const currentMessages = messages.map(m => ({ role: m.role, content: m.content }));
      
      // Track detected template for debugging
      let detectedTemplate: ResponsePath = 'assess_template_1_or_3';
      
      // Get responseMode from localStorage
      const savedResponseMode = typeof window !== 'undefined' 
        ? (localStorage.getItem('responseMode') || 'basic')
        : 'basic';
      const responseMode = savedResponseMode as 'basic' | 'condensed';
      
      try {
        const result = await generateClinicalResponseWithHistory(
          content,
          currentMessages,
          effectivePhase,
          isStuck,
          undefined,
          responseMode
        );

        // Extract response and template from result
        const responseText = result.response;
        detectedTemplate = result.template;
        
        // Update dev badge with template info
        updateTemplate(detectedTemplate, result.tier1Complete, primaryProvider);

        const responseIsInsufficient = isInsufficientInfoResponse(responseText);
        
        finalContent = responseIsInsufficient ? getInsufficientInfoGuidance() : responseText;
        isInsufficientInfo = responseIsInsufficient;

        const parsed = parseFrameworkPosition(responseText);
        detectedPhase = parsed.phase;
        detectedStep = parsed.step;
      } catch (llmError) {
        console.error('LLM Error:', llmError);
        // Show error to user
        const errorMessage = llmError instanceof Error ? llmError.message : 'Failed to generate response';
        finalContent = `❌ **Error:** ${errorMessage}\n\nPlease check your API configuration and try again.`;
        isInsufficientInfo = false;
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
          content: primaryResponse.value.response,
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
          content: secondaryResponse.value.response,
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
          onNew={handleNewConversation}
          onNewDual={handleNewDualConversation}
          onNewCompare={handleNewCompareConversation}
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
            {isCompareMode && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Compare</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400">
            <Menu size={24} />
          </button>
        </div>

        <div className="relative">
          <NavigationMap
            currentPhase={effectivePhase}
            currentStep={effectiveStep}
            detectedPhase={effectiveDetectedPhase}
            onSelectPhase={handleSelectPhase}
            onSelectStep={handleSelectStep}
            onShowResources={() => setShowResourcesPanel(true)}
            onToggleOpen={(open) => setIsNavMapOpen(open)}
          />
        </div>
        
        <div className="flex-1 relative min-h-0">
          {isCompareMode ? (
            <>
              <CompareChatView
                primaryMessages={compareMessages.basic}
                secondaryMessages={compareMessages.condensed}
                primaryLoading={compareLoading.basic}
                secondaryLoading={compareLoading.condensed}
              />
              {/* Compare mode input overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 p-2 md:p-4 pt-8 md:pt-12">
                <CompareInputForm
                  onSendMessage={handleCompareSendMessage}
                  basicLoading={compareLoading.basic}
                  condensedLoading={compareLoading.condensed}
                />
              </div>
            </>
          ) : isDualMode ? (
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
              provider={primaryProvider}
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
      
      <ResourcesPanel 
        isOpen={showResourcesPanel} 
        onClose={() => setShowResourcesPanel(false)} 
      />
      
      {/* Dev Template Badge - shows which template is being used */}
      {currentTemplate && isBadgeVisible && (
        <TemplateDevBadge
          template={currentTemplate}
          tier1Complete={tier1Complete ?? undefined}
          provider={primaryProvider}
        />
      )}
    </div>
  );
}
