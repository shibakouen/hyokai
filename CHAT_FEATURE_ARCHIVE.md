# Chat Feature Archive

This document contains the complete implementation of a ChatGPT-like chat feature that was built for Hyokai but later removed. Save this for reference if you want to re-add it.

## Overview

The chat feature added:
- Multi-turn conversations with AI models
- Conversation sidebar with history
- Model selection per chat
- Web search integration (via OpenRouter's `:online` suffix)
- localStorage persistence for conversations
- App mode toggle (Transform vs Chat)

## Files Created

### 1. `src/lib/chat.ts` - Types and localStorage utilities

```typescript
// Chat types and localStorage utilities

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: number;
  searchEnabled?: boolean;  // Track if web search was used for this message
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

const CONVERSATIONS_KEY = 'hyokai-conversations';
const ACTIVE_CONVERSATION_KEY = 'hyokai-active-conversation-id';
const SEARCH_ENABLED_KEY = 'hyokai-chat-search-enabled';
const MAX_CONVERSATIONS = 20;

// Get search enabled preference
export function getSearchEnabled(): boolean {
  return localStorage.getItem(SEARCH_ENABLED_KEY) === 'true';
}

// Set search enabled preference
export function setSearchEnabled(enabled: boolean): void {
  localStorage.setItem(SEARCH_ENABLED_KEY, enabled.toString());
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all conversations from localStorage
export function getConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save conversations to localStorage
export function saveConversations(conversations: Conversation[]): void {
  // Keep only the most recent MAX_CONVERSATIONS
  const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
}

// Get active conversation ID
export function getActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
}

// Set active conversation ID
export function setActiveConversationId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }
}

// Create a new conversation
export function createConversation(model: string): Conversation {
  return {
    id: generateId(),
    title: 'New Chat',
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Generate conversation title from first message
export function generateTitle(firstMessage: string): string {
  const maxLength = 30;
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength).trim() + '...';
}

// Format timestamp for display
export function formatChatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
```

### 2. `src/hooks/useChat.ts` - Chat state management hook

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABLE_MODELS } from '@/lib/models';
import {
  ChatMessage,
  Conversation,
  getConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createConversation,
  generateId,
  generateTitle,
  getSearchEnabled,
  setSearchEnabled as setSearchEnabledStorage,
} from '@/lib/chat';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [searchEnabled, setSearchEnabledState] = useState(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const stored = getConversations();
    setConversations(stored);

    const activeId = getActiveConversationId();
    if (activeId && stored.find((c) => c.id === activeId)) {
      setActiveId(activeId);
    } else if (stored.length > 0) {
      setActiveId(stored[0].id);
    }

    // Load selected model index
    const savedModelIndex = localStorage.getItem('hyokai-chat-model-index');
    if (savedModelIndex) {
      const index = parseInt(savedModelIndex, 10);
      if (index >= 0 && index < AVAILABLE_MODELS.length) {
        setSelectedModelIndex(index);
      }
    }

    // Load search enabled preference
    setSearchEnabledState(getSearchEnabled());
  }, []);

  // Wrapper to update both state and localStorage for search
  const setSearchEnabled = useCallback((enabled: boolean) => {
    setSearchEnabledState(enabled);
    setSearchEnabledStorage(enabled);
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  // Save active conversation ID when it changes
  useEffect(() => {
    setActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  // Save selected model index
  useEffect(() => {
    localStorage.setItem('hyokai-chat-model-index', selectedModelIndex.toString());
  }, [selectedModelIndex]);

  // Get the active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Create a new conversation
  const startNewConversation = useCallback(() => {
    const model = AVAILABLE_MODELS[selectedModelIndex];
    const newConversation = createConversation(model.id);

    setConversations((prev) => [newConversation, ...prev]);
    setActiveId(newConversation.id);
    setError(null);

    return newConversation;
  }, [selectedModelIndex]);

  // Switch to a different conversation
  const switchConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);

      // If we deleted the active conversation, switch to another
      if (id === activeConversationId) {
        if (filtered.length > 0) {
          setActiveId(filtered[0].id);
        } else {
          setActiveId(null);
        }
      }

      return filtered;
    });
  }, [activeConversationId]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    let conversation = activeConversation;

    // If no active conversation, create one
    if (!conversation) {
      conversation = startNewConversation();
    }

    const model = AVAILABLE_MODELS[selectedModelIndex];
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    // Optimistically add user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversation!.id) {
          const updatedMessages = [...c.messages, userMessage];
          return {
            ...c,
            messages: updatedMessages,
            // Update title from first message
            title: c.messages.length === 0 ? generateTitle(content) : c.title,
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );

    setIsLoading(true);
    setError(null);

    try {
      // Build messages array for the API
      const updatedConversation = conversations.find((c) => c.id === conversation!.id);
      const allMessages = [...(updatedConversation?.messages || []), userMessage];

      const messagesForApi = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error: apiError } = await supabase.functions.invoke('transform-prompt', {
        body: {
          messages: messagesForApi,
          model: model.id,
          chatMode: true,
          enableSearch: searchEnabled,
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to get response');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.result || 'No response received',
        model: model.name,
        timestamp: Date.now(),
        searchEnabled: searchEnabled,
      };

      // Add assistant message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation!.id) {
            return {
              ...c,
              messages: [...c.messages, assistantMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      // Remove the optimistically added user message on error
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversation!.id) {
            return {
              ...c,
              messages: c.messages.filter((m) => m.id !== userMessage.id),
            };
          }
          return c;
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, conversations, selectedModelIndex, startNewConversation, searchEnabled]);

  // Clear all conversations
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveId(null);
    localStorage.removeItem('hyokai-conversations');
    localStorage.removeItem('hyokai-active-conversation-id');
  }, []);

  return {
    conversations,
    activeConversation,
    isLoading,
    error,
    selectedModelIndex,
    setSelectedModelIndex,
    searchEnabled,
    setSearchEnabled,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    clearAllConversations,
  };
}
```

### 3. `src/components/ChatView.tsx` - Main chat container

```typescript
import { useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, Globe } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ConversationList } from './ConversationList';
import { useChat } from '@/hooks/useChat';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AVAILABLE_MODELS } from '@/lib/models';

export function ChatView() {
  const {
    conversations,
    activeConversation,
    isLoading,
    error,
    selectedModelIndex,
    setSelectedModelIndex,
    searchEnabled,
    setSearchEnabled,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    clearAllConversations,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const selectedModel = AVAILABLE_MODELS[selectedModelIndex];

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Conversation Sidebar */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={switchConversation}
        onNewConversation={startNewConversation}
        onDeleteConversation={deleteConversation}
        onClearAll={clearAllConversations}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {activeConversation && activeConversation.messages.length > 0 ? (
            <div className="pb-4">
              {activeConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 px-4 py-4 bg-muted/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {searchEnabled ? (
                      <Globe className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{selectedModel?.name || 'Assistant'}</span>
                    <p className="text-muted-foreground mt-1">
                      {searchEnabled ? 'Searching the web...' : 'Thinking...'}
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground max-w-md">
                Chat with AI models directly. Your conversation history is saved locally.
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-4 pb-2">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          selectedModelIndex={selectedModelIndex}
          onModelChange={setSelectedModelIndex}
          searchEnabled={searchEnabled}
          onSearchToggle={setSearchEnabled}
        />
      </div>
    </div>
  );
}
```

### 4. `src/components/ChatInput.tsx` - Input with model selector and search toggle

```typescript
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AVAILABLE_MODELS } from '@/lib/models';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModelIndex: number;
  onModelChange: (index: number) => void;
  searchEnabled: boolean;
  onSearchToggle: (enabled: boolean) => void;
}

export function ChatInput({
  onSend,
  isLoading,
  selectedModelIndex,
  onModelChange,
  searchEnabled,
  onSearchToggle,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Filter to only show non-thinking models for chat (simpler UX)
  const chatModels = AVAILABLE_MODELS.filter((m) => !m.thinking);

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-3">
        {/* Model Selector and Search Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Model:</span>
            <Select
              value={selectedModelIndex.toString()}
              onValueChange={(value) => onModelChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chatModels.map((model, index) => {
                  // Find the actual index in AVAILABLE_MODELS
                  const actualIndex = AVAILABLE_MODELS.findIndex(
                    (m) => m.id === model.id && !m.thinking
                  );
                  return (
                    <SelectItem key={model.id + index} value={actualIndex.toString()}>
                      {model.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Search Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={searchEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSearchToggle(!searchEnabled)}
                className={cn(
                  'gap-2 transition-all',
                  searchEnabled && 'bg-primary text-primary-foreground'
                )}
              >
                <Globe className="h-4 w-4" />
                Search
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enable web search for real-time information</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[200px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px] shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
```

### 5. `src/components/ChatMessage.tsx` - Message bubble component

```typescript
import { Copy, Check, User, Bot, Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/lib/chat';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-4',
        isUser ? 'bg-transparent' : 'bg-muted/30'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : message.model || 'Assistant'}
          </span>
          {!isUser && message.searchEnabled && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              <Globe className="h-3 w-3" />
              Web
            </span>
          )}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>

      {/* Copy Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
```

### 6. `src/components/ConversationList.tsx` - Sidebar with conversation history

```typescript
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation, formatChatTimestamp } from '@/lib/chat';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClearAll,
}: ConversationListProps) {
  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b">
        <Button onClick={onNewConversation} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  activeConversationId === conversation.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conversation.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatChatTimestamp(conversation.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {conversations.length > 0 && (
        <div className="p-3 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your chat history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
```

### 7. `src/contexts/AppModeContext.tsx` - App mode context

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppMode = 'transform' | 'chat';

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const APP_MODE_KEY = 'hyokai-app-mode';

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [appMode, setAppModeState] = useState<AppMode>('transform');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(APP_MODE_KEY) as AppMode;
    if (saved === 'transform' || saved === 'chat') {
      setAppModeState(saved);
    }
  }, []);

  // Save to localStorage when mode changes
  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    localStorage.setItem(APP_MODE_KEY, mode);
  };

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
```

### 8. `src/components/AppModeToggle.tsx` - Toggle component

```typescript
import { Wand2, MessageSquare } from 'lucide-react';
import { useAppMode } from '@/contexts/AppModeContext';
import { cn } from '@/lib/utils';

export function AppModeToggle() {
  const { appMode, setAppMode } = useAppMode();

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <button
        onClick={() => setAppMode('transform')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
          appMode === 'transform'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        )}
      >
        <Wand2 className="h-4 w-4" />
        <span className="font-medium">Transform</span>
      </button>
      <button
        onClick={() => setAppMode('chat')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
          appMode === 'chat'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        )}
      >
        <MessageSquare className="h-4 w-4" />
        <span className="font-medium">Chat</span>
      </button>
    </div>
  );
}
```

## Edge Function Changes

In `supabase/functions/transform-prompt/index.ts`, add this chat mode handler after parsing the request body:

```typescript
const { userPrompt, model, mode, thinking, chatMode, messages, enableSearch } = await req.json();

// Chat mode: direct conversation without system prompt transformation
if (chatMode && messages && Array.isArray(messages)) {
  // Append :online suffix to model ID if search is enabled
  // This enables OpenRouter's web search plugin powered by Exa.ai
  const modelId = enableSearch
    ? `${model || "google/gemini-3-pro-preview"}:online`
    : (model || "google/gemini-3-pro-preview");

  console.log(`=== HYOKAI CHAT MODE ===`);
  console.log(`Model: ${modelId}`);
  console.log(`Messages count: ${messages.length}`);
  console.log(`Web search enabled: ${enableSearch}`);

  // Add system message when search is enabled to instruct model to use search results
  let chatMessages = messages;
  if (enableSearch) {
    const searchSystemMessage = {
      role: "system",
      content: `You have web search enabled. Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. When answering questions:
1. Use the web search results provided to give accurate, up-to-date information
2. Cite your sources using markdown links [source](url)
3. If search results don't contain the answer, say so rather than guessing
4. For weather, dates, news, or time-sensitive info, always use the search results`
    };
    chatMessages = [searchSystemMessage, ...messages];
  }

  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: chatMessages,
    max_tokens: 4096,
    temperature: 0.7, // Higher temperature for more natural chat
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://hyokai.lovable.app",
      "X-Title": "Hyokai Chat",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("Insufficient credits on OpenRouter. Please add credits to your account.");
    }
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error("No response received from the model");
  }

  console.log(`Chat response length: ${result.length} characters`);

  return new Response(JSON.stringify({ result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

## App.tsx Integration

Wrap the app with `AppModeProvider`:

```typescript
import { AppModeProvider } from "@/contexts/AppModeContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ModeProvider>
        <AppModeProvider>
          <TooltipProvider>
            {/* ... rest of app */}
          </TooltipProvider>
        </AppModeProvider>
      </ModeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);
```

## Index.tsx Integration

Add conditional rendering based on app mode:

```typescript
import { ChatView } from "@/components/ChatView";
import { AppModeToggle } from "@/components/AppModeToggle";
import { useAppMode } from "@/contexts/AppModeContext";

const Index = () => {
  const { appMode } = useAppMode();

  // Chat mode render
  if (appMode === 'chat') {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <LanguageSelector />
        <div className="absolute inset-0 bg-gradient-to-b from-ice-frost via-background to-ice-crystal opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <div className="border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Header />
                <AppModeToggle />
              </div>
            </div>
          </div>
          <ChatView />
        </div>
      </div>
    );
  }

  // Transform mode render (original)
  return (
    // ... original transform UI with <AppModeToggle /> added
  );
};
```

## Web Search via OpenRouter

The feature uses OpenRouter's `:online` suffix to enable web search for any model:

- **How it works**: Append `:online` to model ID (e.g., `google/gemini-3-pro-preview:online`)
- **Backend**: Powered by Exa.ai search engine
- **Cost**: ~$0.02 per request (5 results default)
- **Response**: Model receives search results and generates response with citations

**Known limitation**: Some models hallucinate instead of using search results properly. A system message was added to mitigate this, but results vary by model.

## localStorage Keys

- `hyokai-conversations` - Array of Conversation objects (max 20)
- `hyokai-active-conversation-id` - Current conversation ID
- `hyokai-chat-model-index` - Selected model index for chat
- `hyokai-chat-search-enabled` - Web search toggle state
- `hyokai-app-mode` - 'transform' | 'chat'

## Why It Was Removed

The web search feature didn't work reliably - models would hallucinate plausible-sounding but incorrect information (like wrong dates, fake weather data) instead of using actual search results. The core chat functionality worked, but without reliable search it wasn't differentiated enough from existing chat interfaces to justify the added complexity.
