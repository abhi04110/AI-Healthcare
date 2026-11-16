import React, { useState } from 'react';
import { Bot, BookOpen, Send, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { clinicalAiService } from '@/services/clinicalAiService';
import { usePreferences } from '@/context/PreferencesContext';
import { useToast } from '@/context/ToastContext';
import { extractApiError } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AssistantAskResponse, PatientResponse } from '@/types/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: AssistantAskResponse;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      tokens.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={key++} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

function FormattedAnswer({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code blocks
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <div key={key++} className="my-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-slate-100">
          {lang && (
            <div className="border-b border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-3 border-slate-200" />);
      i += 1;
      continue;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].replace(/\s+#+$/, '');
      if (level === 1) {
        blocks.push(
          <h2 key={key++} className="mt-3 mb-1.5 text-lg font-bold tracking-tight text-slate-900 first:mt-0">
            {renderInline(content)}
          </h2>,
        );
      } else if (level === 2) {
        blocks.push(
          <h3 key={key++} className="mt-3 mb-1 text-base font-bold text-slate-900 first:mt-0">
            {renderInline(content)}
          </h3>,
        );
      } else if (level === 3) {
        blocks.push(
          <h4 key={key++} className="mt-2.5 mb-1 text-[15px] font-semibold text-slate-900 first:mt-0">
            {renderInline(content)}
          </h4>,
        );
      } else {
        blocks.push(
          <h5 key={key++} className="mt-2 mb-0.5 text-sm font-semibold text-slate-800 first:mt-0">
            {renderInline(content)}
          </h5>,
        );
      }
      i += 1;
      continue;
    }

    // Markdown table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(lines[i + 1])
    ) {
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(parseRow(lines[i]));
        i += 1;
      }

      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-100">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold text-slate-800">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r, rIdx) => (
                <tr key={rIdx}>
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-700">
                      {renderInline(r[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 border-l-4 border-clinical-400 bg-clinical-50/50 py-1.5 pl-3 pr-2 text-sm text-slate-700"
        >
          {quoteLines.map((q, qIdx) => (
            <p key={qIdx}>{renderInline(q)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, '').trim());
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="my-1.5 space-y-1.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-800">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clinical-600" />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: { num: string; text: string }[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const m = lines[i].trim().match(/^(\d+)[.)]\s+(.+)$/);
        if (m) items.push({ num: m[1], text: m[2].trim() });
        i += 1;
      }
      blocks.push(
        <ol key={key++} className="my-1.5 space-y-1.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800">
              <span className="min-w-[1.25rem] font-semibold text-clinical-700">{item.num}.</span>
              <span className="flex-1">{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Normal paragraph (group consecutive non-special lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('```') ||
        /^(#{1,4})\s+/.test(cur) ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        cur.startsWith('>') ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-slate-800">
        {renderInline(paraLines.join(' '))}
      </p>,
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}

export function AiAssistantPanel({
  patients = [],
  defaultPatientId,
  title = 'AI Medical Assistant',
  subtitle = 'Get clear clinical insights based on patient records and medical guidelines.',
  quickPrompts = [
    'Summarize WHO hypertension targets and lifestyle guidance',
    'Explain how elevated fasting glucose and BMI affect cardiovascular risk',
  ],
}: {
  patients?: Array<Pick<PatientResponse, 'id' | 'name' | 'patient_code'>>;
  defaultPatientId?: number | null;
  title?: string;
  subtitle?: string;
  quickPrompts?: string[];
}) {
  const { prefs } = usePreferences();
  const toast = useToast();
  const [provider, setProvider] = useState<'auto' | 'gemini' | 'groq'>(prefs.aiProvider);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    defaultPatientId ? String(defaultPatientId) : '',
  );
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSubmit = async (promptText?: string) => {
    const raw = (promptText ?? question).trim();
    if (!raw || loading) return;

    // Backend extracts `patient ID <id>` directly from the question text.
    const scopedQuestion =
      selectedPatientId && !/patient\s*(id|#|no\.?|number)?\s*\d+/i.test(raw)
        ? `For patient ID ${selectedPatientId}: ${raw}`
        : raw;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: scopedQuestion,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setQuestion('');
    setLoading(true);

    try {
      const response = await clinicalAiService.askAssistant(scopedQuestion, provider);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: response.answer,
          meta: response,
        },
      ]);
    } catch (err) {
      toast.error('AI Assistant error', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {patients.length > 0 && (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                aria-label="Scope question to patient"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-clinical-500 focus:outline-none"
              >
                <option value="">General (No Patient Scope)</option>
                {patients.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({p.patient_code})
                  </option>
                ))}
              </select>
            )}
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'auto' | 'gemini' | 'groq')}
              aria-label="Select LLM provider"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-clinical-500 focus:outline-none"
            >
              <option value="auto">Auto (Groq → Gemini)</option>
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        }
      />

      <CardBody className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Decision support & educational insights only — not a medical diagnosis or prescription.
          </span>
        </div>

        <div className="max-h-[420px] min-h-[240px] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clinical-50 text-clinical-600 ring-1 ring-clinical-100">
                <Bot className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Ask clinical, guideline, or patient-scoped questions
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                {patients.length > 0
                  ? 'Ask in English, Hindi, or Hinglish. Select a patient above to include their medical context.'
                  : 'Ask in English, Hindi, or Hinglish about health, guidelines, or your care.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSubmit(prompt)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-clinical-300 hover:bg-clinical-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-clinical-600" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === 'user'
                    ? 'ml-auto max-w-2xl rounded-2xl bg-clinical-600 px-4 py-3 text-sm text-white shadow-sm'
                    : 'mr-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                }
              >
                {msg.role === 'user' ? (
                  <p>{msg.text}</p>
                ) : (
                  <div className="space-y-3">
                    <FormattedAnswer text={msg.text} />

                    {msg.meta && (
                      <div className="space-y-2 border-t border-slate-100 pt-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="blue">{msg.meta.provider}</Badge>
                          <Badge variant="slate">
                            <UserCheck className="h-3 w-3" />
                            {msg.meta.data_scope}
                          </Badge>
                        </div>

                        {msg.meta.rag_warning && (
                          <p className="text-xs text-amber-700">{msg.meta.rag_warning}</p>
                        )}

                        {msg.meta.medical_knowledge_sources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                              <BookOpen className="h-3 w-3" /> Sources:
                            </span>
                            {msg.meta.medical_knowledge_sources.map((src, idx) => (
                              <Badge key={idx} variant="teal">
                                {src.source}
                                {src.page !== null ? ` p.${src.page}` : ''}
                                {src.similarity !== null
                                  ? ` (${Math.round(src.similarity * 100)}%)`
                                  : ''}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500">
              <Bot className="h-4 w-4 animate-pulse text-clinical-600" />
              Analyzing medical knowledge & authorized context...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question (e.g. 'Summarize patient ID 5 vitals and risk factors')..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-2 focus:ring-clinical-500/20"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-clinical-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clinical-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask AI
          </button>
        </form>
      </CardBody>
    </Card>
  );
}

