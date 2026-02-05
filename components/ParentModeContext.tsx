import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './Button';

type ParentModeContextValue = {
  isParentMode: boolean;
  requestParentUnlock: () => Promise<boolean>;
  lockParentMode: () => void;
};

const PARENT_MODE_UNTIL_KEY = 'sm_parent_mode_until';
const PARENT_MODE_TTL_MS = 15 * 60 * 1000;

const parseUntil = (raw: string | null) => {
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
};

const randomOperand = () => 3 + Math.floor(Math.random() * 7); // 3..9

type GateQuestion = { left: number; right: number };

const newQuestion = (): GateQuestion => ({ left: randomOperand(), right: randomOperand() });

const ParentModeContext = createContext<ParentModeContextValue | null>(null);

export const ParentModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [until, setUntil] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseUntil(localStorage.getItem(PARENT_MODE_UNTIL_KEY));
  });
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [question, setQuestion] = useState<GateQuestion>(() => newQuestion());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const isParentMode = useMemo(() => Date.now() < until, [until]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!until) {
      localStorage.removeItem(PARENT_MODE_UNTIL_KEY);
      return;
    }
    localStorage.setItem(PARENT_MODE_UNTIL_KEY, String(until));
  }, [until]);

  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= until) setUntil(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  const lockParentMode = useCallback(() => {
    setUntil(0);
  }, []);

  const closeGate = useCallback((result: boolean) => {
    setIsGateOpen(false);
    setAnswer('');
    setError(null);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(result);
  }, []);

  const requestParentUnlock = useCallback((): Promise<boolean> => {
    if (isParentMode) return Promise.resolve(true);
    setQuestion(newQuestion());
    setAnswer('');
    setError(null);
    setIsGateOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [isParentMode]);

  const handleUnlock = useCallback(() => {
    const expected = question.left * question.right;
    const cleaned = answer.trim();
    const value = Number(cleaned);
    if (!cleaned || !Number.isFinite(value)) {
      setError('Please enter a number.');
      return;
    }
    if (value !== expected) {
      setError('Not quite—try again.');
      return;
    }
    setUntil(Date.now() + PARENT_MODE_TTL_MS);
    closeGate(true);
  }, [answer, closeGate, question.left, question.right]);

  const contextValue = useMemo(
    () => ({
      isParentMode,
      requestParentUnlock,
      lockParentMode,
    }),
    [isParentMode, lockParentMode, requestParentUnlock]
  );

  return (
    <ParentModeContext.Provider value={contextValue}>
      {children}
      {isGateOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-[2.5rem] border-8 border-[#DCCBFF] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.45em] text-gray-400 text-center">
              Parents
            </p>
            <h3 className="mt-2 font-heading text-2xl text-[#6B4F3F] text-center">
              Unlock Skip
            </h3>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Listening helps kids learn words and pronunciation. Parent Mode can unlock skipping when needed.
            </p>

            <div className="mt-4 rounded-3xl border-2 border-[#FFE9A8] bg-[#FFFDF3] p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-gray-400">Quick check</p>
              <p className="mt-1 font-heading text-3xl text-[#6B4F3F]">
                {question.left} × {question.right}
              </p>
            </div>

            <div className="mt-4">
              <input
                type="text"
                inputMode="numeric"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError(null);
                }}
                placeholder="Answer"
                className="w-full bg-white border-2 border-[#CDEBFF] rounded-2xl px-4 py-3 font-heading text-[#6B4F3F] text-lg focus:outline-none focus:border-[#6B4F3F]"
                aria-label="Multiplication answer"
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={handleUnlock}>
                Unlock Parent Mode
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1 text-sm px-4 py-3"
                  onClick={() => {
                    setQuestion(newQuestion());
                    setAnswer('');
                    setError(null);
                  }}
                  type="button"
                >
                  New question
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 text-sm px-4 py-3"
                  onClick={() => closeGate(false)}
                  type="button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ParentModeContext.Provider>
  );
};

export const useParentMode = () => {
  const context = useContext(ParentModeContext);
  if (!context) {
    throw new Error('useParentMode must be used within ParentModeProvider');
  }
  return context;
};

