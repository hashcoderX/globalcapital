'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

type SkillKey = 'overview' | 'hr' | 'finance' | 'microfinance' | 'operations';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type ChatSession = {
  id: string;
  title: string;
  skill: SkillKey;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const CHAT_STORAGE_KEY = 'gc_ai_assistant_chats_v1';

const createChatSession = (initialSkill: SkillKey): ChatSession => {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New Chat',
    skill: initialSkill,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

const SKILLS: Array<{ key: SkillKey; label: string; description: string }> = [
  { key: 'overview', label: 'Overview', description: 'General cross-module summary' },
  { key: 'hr', label: 'HR', description: 'Employees and structure insights' },
  { key: 'finance', label: 'Finance', description: 'Accounting and finance focus' },
  { key: 'microfinance', label: 'Microfinance', description: 'Loan request and repayment focus' },
  { key: 'operations', label: 'Operations', description: 'System-level operational view' },
];

const SKILL_ICONS: Record<SkillKey, string> = {
  overview: 'Radar',
  hr: 'People',
  finance: 'Ledger',
  microfinance: 'Lending',
  operations: 'Ops',
};

const QUICK_PROMPTS: Record<SkillKey, string[]> = {
  overview: [
    'Give me a full system snapshot for today.',
    'What are the top risks right now?',
  ],
  hr: [
    'Summarize employee and department health today.',
    'Any HR records that need immediate attention?',
  ],
  finance: [
    'Show today finance highlights and outliers.',
    'What financial checks should I run today?',
  ],
  microfinance: [
    'How many micro credit loans were entered today?',
    'List today entered micro loans with amount and status.',
  ],
  operations: [
    'Give operations status and bottlenecks.',
    'What needs action before end of day?',
  ],
};

export default function AssistantPage() {
  const apiBase = getApiBaseUrl();
  const router = useRouter();
  const [skill, setSkill] = useState<SkillKey>('overview');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => [createChatSession('overview')]);
  const [activeChatId, setActiveChatId] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) {
        const initial = createChatSession('overview');
        setChatSessions([initial]);
        setActiveChatId(initial.id);
        return;
      }

      const parsed = JSON.parse(raw) as { sessions?: ChatSession[]; activeChatId?: string };
      const sessions = Array.isArray(parsed?.sessions) && parsed.sessions.length > 0
        ? parsed.sessions
        : [createChatSession('overview')];
      const selectedId = sessions.some((item) => item.id === parsed?.activeChatId)
        ? (parsed?.activeChatId as string)
        : sessions[0].id;

      setChatSessions(sessions);
      setActiveChatId(selectedId);

      const activeSession = sessions.find((item) => item.id === selectedId);
      if (activeSession?.skill) {
        setSkill(activeSession.skill);
      }
    } catch {
      const initial = createChatSession('overview');
      setChatSessions([initial]);
      setActiveChatId(initial.id);
    }
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({
        sessions: chatSessions,
        activeChatId,
      })
    );
  }, [chatSessions, activeChatId]);

  const activeSession = useMemo(
    () => chatSessions.find((item) => item.id === activeChatId) || null,
    [chatSessions, activeChatId]
  );

  const orderedSessions = useMemo(
    () => [...chatSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [chatSessions]
  );

  const messages = activeSession?.messages || [];

  const canSend = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please login first.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    if (!activeChatId) {
      const created = createChatSession(skill);
      setChatSessions([created]);
      setActiveChatId(created.id);
    }

    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeChatId) return session;
        const title = session.messages.length === 0
          ? trimmed.slice(0, 70)
          : session.title;
        return {
          ...session,
          skill,
          title,
          updatedAt: new Date().toISOString(),
          messages: [...session.messages, userMessage],
        };
      })
    );
    setQuestion('');
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(
        `${apiBase}/ai/assistant/chat`,
        {
          message: trimmed,
          skill,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const answer = String(response?.data?.answer || '').trim();
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: answer || 'No answer returned.',
        timestamp: new Date().toISOString(),
      };
      setChatSessions((prev) =>
        prev.map((session) => {
          if (session.id !== activeChatId) return session;
          return {
            ...session,
            skill,
            updatedAt: new Date().toISOString(),
            messages: [...session.messages, assistantMessage],
          };
        })
      );
    } catch (err: unknown) {
      const backendMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Assistant request failed. Please try again.';
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    const nextSession = createChatSession(skill);
    setChatSessions((prev) => [nextSession, ...prev]);
    setActiveChatId(nextSession.id);
    setQuestion('');
    setError(null);
  };

  const handleSelectChat = (sessionId: string) => {
    setActiveChatId(sessionId);
    const selected = chatSessions.find((item) => item.id === sessionId);
    if (selected?.skill) {
      setSkill(selected.skill);
    }
    setError(null);
    setQuestion('');
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#cffafe_0%,#f8fafc_35%,#fff7ed_100%)] px-4 py-6 md:px-8"
      style={{ fontFamily: 'Sora, Manrope, Segoe UI, sans-serif' }}
    >
      <div className="pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="float-slow pointer-events-none absolute top-24 -right-20 h-80 w-80 rounded-full bg-orange-200/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative mx-auto flex h-[calc(100vh-3rem)] max-w-6xl">
        <div className="enter-up flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-[0_22px_60px_-22px_rgba(15,23,42,0.32)] backdrop-blur-xl">
          <div className="border-b border-slate-200/70 bg-gradient-to-r from-white via-cyan-50/60 to-orange-50/60 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">AI System Assistant</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Smart workspace for asking live business questions with skill-driven context.
                </p>
              </div>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Live Context Mode
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-800 transition hover:bg-cyan-100"
              >
                New Chat
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Close Chat
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-6 p-5 md:grid-cols-[280px_1fr]">
            <section className="overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Skills</h2>
              <div className="mt-3 space-y-2">
                {SKILLS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSkill(item.key)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-300 ${
                      skill === item.key
                        ? 'border-cyan-300 bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 shadow-[0_8px_20px_-14px_rgba(14,116,144,0.7)]'
                        : 'border-slate-200/90 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{item.label}</div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{SKILL_ICONS[item.key]}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">{item.description}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-orange-200/70 bg-orange-50/70 px-3 py-2">
                <p className="text-xs font-medium text-orange-800">Hint</p>
                <p className="mt-1 text-xs text-orange-700">
                  Pick the closest skill first, then ask specific timeline or branch-level questions.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chat History</p>
                  <span className="text-[10px] font-semibold text-slate-500">{chatSessions.length}</span>
                </div>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {orderedSessions.map((session) => {
                    const isActive = session.id === activeChatId;
                    const preview = session.messages[session.messages.length - 1]?.content || 'No messages yet';
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectChat(session.id)}
                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                          isActive
                            ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200'
                        }`}
                      >
                        <p className="truncate text-xs font-semibold">{session.title || 'Untitled Chat'}</p>
                        <p className="mt-0.5 truncate text-[11px] opacity-80">{preview}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white shadow-sm">
              <div className="border-b border-slate-200/70 bg-white/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {QUICK_PROMPTS[skill].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chat-scroll flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 p-5 text-sm text-slate-500">
                    Start with something specific, like today performance, pending alerts, or branch-wise trends.
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,1)]'
                          : 'border border-slate-200 bg-white text-slate-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className={`mt-2 text-[10px] ${msg.role === 'user' ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:240ms]" />
                    <span className="ml-1">Thinking...</span>
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200/80 bg-white/85 p-4">
                {error && (
                  <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                    placeholder="Ask the assistant about this system..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Active skill: {skill}
                    </span>
                    <button
                      type="submit"
                      disabled={!canSend}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }

        .enter-up {
          animation: enter-up 500ms ease-out;
        }

        .chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: #67e8f9 #e2e8f0;
        }

        .chat-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .chat-scroll::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 9999px;
        }

        .chat-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #06b6d4, #0ea5e9);
          border-radius: 9999px;
          border: 2px solid #e2e8f0;
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes enter-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
