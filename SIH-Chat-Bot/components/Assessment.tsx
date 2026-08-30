import React, { useMemo, useState } from 'react';
import type { ViewName } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ASSESSMENT_BANDS, ASSESSMENT_OPTIONS, ASSESSMENT_QUESTIONS, COPY } from '../content';
import { saveAssessmentResult } from '../services/storageService';
import { BreathingCircle, LeafProgress, SectionHeading, WaveDivider } from './design';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChatIcon,
  CheckIcon,
  ClipboardIcon,
  LifelineIcon,
  LockIcon,
  SparkIcon,
} from './icons';

interface AssessmentProps {
  onNavigate?: (view: ViewName) => void;
  onTalkThrough?: (prompt: string) => void;
}

type ResultPhase = { stage: 'done'; score: number; max: number; skipped: number };
type Phase = { stage: 'intro' } | { stage: 'question'; index: number } | { stage: 'review' } | ResultPhase;

const OPTION_DETAILS = [
  'Not present, or only briefly',
  'Occasionally during the fortnight',
  'More often than not',
  'Present on most or nearly all days',
];

const Assessment: React.FC<AssessmentProps> = ({ onNavigate, onTalkThrough }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>({ stage: 'intro' });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const total = ASSESSMENT_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;

  const calculateResult = (finalAnswers: Record<string, number>): ResultPhase => {
    const answered = ASSESSMENT_QUESTIONS.filter(question => finalAnswers[question.id] !== undefined);
    const skipped = total - answered.length;
    const score = answered.reduce((sum, question) => {
      const value = finalAnswers[question.id];
      return sum + (question.id === 'q8' ? 3 - value : value);
    }, 0);
    return { stage: 'done', score, max: answered.length * 3, skipped };
  };

  const finish = () => {
    const result = calculateResult(answers);
    if (user && !user.isGuest && result.max > 0) {
      const fraction = result.score / result.max;
      const resultBand = ASSESSMENT_BANDS.filter(item => fraction >= item.min).pop()!;
      saveAssessmentResult(user.id, {
        ts: Date.now(), score: result.score, maxScore: result.max, skipped: result.skipped, band: resultBand.title,
      });
    }
    setPhase(result);
  };

  const answer = (questionId: string, value: number) => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    setAnswers(previous => ({ ...previous, [questionId]: value }));
    setTimeout(() => {
      const index = ASSESSMENT_QUESTIONS.findIndex(question => question.id === questionId);
      setIsAdvancing(false);
      if (editingFromReview) {
        setEditingFromReview(false);
        setPhase({ stage: 'review' });
      } else {
        setPhase(index + 1 >= total ? { stage: 'review' } : { stage: 'question', index: index + 1 });
      }
    }, 260);
  };

  const band = useMemo(() => {
    if (phase.stage !== 'done' || phase.max === 0) return ASSESSMENT_BANDS[0];
    return ASSESSMENT_BANDS.filter(item => phase.score / phase.max >= item.min).pop()!;
  }, [phase]);

  const buildChatPrompt = (): string => {
    const responseLines = ASSESSMENT_QUESTIONS.map((question, index) => {
      const value = answers[question.id];
      const selected = ASSESSMENT_OPTIONS.find(option => option.value === value);
      return `${index + 1}. Question: ${question.text}\n   Answer: ${selected?.label ?? 'Skipped'}${value !== undefined ? ` (response value ${value} of 3)` : ''}`;
    }).join('\n\n');

    const resultDetails = phase.stage === 'done' && phase.max > 0
      ? `Result band: ${band.title}\nCalculated score: ${phase.score} out of ${phase.max}\nAnswered: ${total - phase.skipped} of ${total}\nSkipped: ${phase.skipped}`
      : `Result band: No result available\nAnswered: ${answeredCount} of ${total}\nSkipped: ${total - answeredCount}`;

    return `I completed a helloMind wellbeing check-in about the last two weeks and chose to share the complete context below. Please respond as a supportive, non-diagnostic student wellbeing assistant.\n\nYour response should:\n- begin with a brief reflection of the main patterns in my answers;\n- acknowledge both difficult and protective signals;\n- ask one gentle, relevant follow-up question;\n- suggest no more than two realistic next steps;\n- avoid diagnosing, labelling, or overstating what this check-in means;\n- encourage human support when the pattern appears heavy or is affecting daily life.\n\nAssessment summary:\n${resultDetails}\n\nComplete question-and-answer detail:\n\n${responseLines}`;
  };

  if (phase.stage === 'intro') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="card-organic overflow-hidden animate-rise">
          <div className="bg-gradient-to-br from-sage-50 via-surface to-dusk-50 px-6 sm:px-9 pt-9 pb-7 text-center relative">
            <BreathingCircle size={82} tone="sage" className="mx-auto mb-5" />
            <p className="text-xs uppercase tracking-wider text-sage-700 font-semibold">Private wellbeing check-in</p>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink-900 mt-2">How has the last fortnight felt?</h1>
            <p className="text-ink-600 mt-3 max-w-lg mx-auto">Eight gentle questions help you notice patterns in stress, energy, connection, and hope. This is a mirror—not a test.</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-3 mb-7">
              {[
                ['8', 'questions'],
                ['2 min', 'at your pace'],
                ['Optional', 'AI reflection'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-soft bg-canvas border border-line-200 p-3 text-center"><p className="font-display text-lg text-ink-900">{value}</p><p className="text-[11px] text-ink-600 mt-0.5">{label}</p></div>
              ))}
            </div>
            <ul className="space-y-3 text-sm text-ink-900 max-w-lg mx-auto">
              <li className="flex gap-3"><ClipboardIcon className="w-5 h-5 text-sage-500 flex-shrink-0" />One question at a time, with the option to skip anything that does not fit.</li>
              <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-sage-500 flex-shrink-0" />Review and change every answer before seeing your result.</li>
              <li className="flex gap-3"><LockIcon className="w-5 h-5 text-dusk-500 flex-shrink-0" />Your answers stay on this device unless you explicitly send them to helloMind chat.</li>
            </ul>
            <button onClick={() => setPhase({ stage: 'question', index: 0 })} className="btn-primary w-full mt-8">Begin when you’re ready <ArrowRightIcon className="w-4 h-4" /></button>
            <p className="text-xs text-ink-600 text-center mt-4">{COPY.disclaimer}</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase.stage === 'question') {
    const question = ASSESSMENT_QUESTIONS[phase.index];
    const selectedValue = answers[question.id];
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center gap-4 mb-5">
          <button onClick={() => { if (editingFromReview) { setEditingFromReview(false); setPhase({ stage: 'review' }); } else { setPhase(phase.index === 0 ? { stage: 'intro' } : { stage: 'question', index: phase.index - 1 }); } }} className="btn-ghost px-2 py-1" aria-label={editingFromReview ? 'Back to review' : 'Previous question'}><ArrowLeftIcon className="w-5 h-5" /></button>
          <div className="flex-1"><LeafProgress value={(phase.index + 1) / total} label={`${phase.index + 1} of ${total}`} /></div>
            <button onClick={() => { setEditingFromReview(false); setPhase({ stage: 'review' }); }} className="text-xs sm:text-sm text-ink-600 hover:text-sage-700">Review</button>
        </div>

        <div className="flex gap-1.5 mb-6" aria-label={`${answeredCount} questions answered`}>
          {ASSESSMENT_QUESTIONS.map((item, index) => (
            <button key={item.id} onClick={() => setPhase({ stage: 'question', index })} aria-label={`Go to question ${index + 1}`} className={`h-2 flex-1 rounded-full transition-colors ${index === phase.index ? 'bg-dusk-500' : answers[item.id] !== undefined ? 'bg-sage-500' : 'bg-line-200'}`} />
          ))}
        </div>

        <div key={question.id} className="card-organic p-6 sm:p-9 animate-rise relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-sage-50" aria-hidden="true" />
          <div className="relative">
            <p className="text-sm text-sage-700 font-medium">Over the last two weeks…</p>
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-ink-900 leading-snug mt-3 max-w-proseletter">{question.text}</h2>
            <div className="mt-8 grid gap-3">
              {ASSESSMENT_OPTIONS.map((option, optionIndex) => {
                const selected = selectedValue === option.value;
                return (
                  <button key={option.value} disabled={isAdvancing} onClick={() => answer(question.id, option.value)} className={`group w-full text-left px-4 sm:px-5 py-4 rounded-soft border transition-all duration-200 disabled:cursor-wait ${selected ? 'border-sage-500 bg-sage-100 shadow-soft' : 'border-line-200 bg-surface hover:border-sage-500 hover:bg-sage-50'}`}>
                    <div className="flex items-center gap-4">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-display ${selected ? 'bg-sage-500 text-white' : 'bg-canvas text-ink-600 group-hover:bg-sage-100 group-hover:text-sage-700'}`}>{selected ? <CheckIcon className="w-5 h-5" /> : option.value}</span>
                      <span className="flex-1"><span className={`block font-medium ${selected ? 'text-sage-700' : 'text-ink-900'}`}>{option.label}</span><span className="block text-xs text-ink-600 mt-0.5">{OPTION_DETAILS[optionIndex]}</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { if (editingFromReview) { setEditingFromReview(false); setPhase({ stage: 'review' }); } else { setPhase(phase.index + 1 >= total ? { stage: 'review' } : { stage: 'question', index: phase.index + 1 }); } }} className="mt-6 text-sm text-ink-600 hover:text-ink-900 underline underline-offset-4">Skip this question</button>
          </div>
        </div>
        <p className="text-xs text-ink-600 text-center mt-4">There is no ideal answer. Choose what has been most true, not what you wish had been true.</p>
      </div>
    );
  }

  if (phase.stage === 'review') {
    const firstMissing = ASSESSMENT_QUESTIONS.findIndex(question => answers[question.id] === undefined);
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start gap-4 mb-7">
          <BreathingCircle size={58} tone="mist" />
          <div><p className="text-sm text-dusk-700 font-medium">One quiet check before the result</p><h1 className="font-display text-2xl sm:text-3xl text-ink-900 mt-1">Do these answers feel like yours?</h1><p className="text-sm text-ink-600 mt-2">Change anything you answered too quickly. Skipping is completely allowed.</p></div>
        </div>

        <div className="card-soft overflow-hidden">
          {ASSESSMENT_QUESTIONS.map((question, index) => {
            const value = answers[question.id];
            const option = ASSESSMENT_OPTIONS.find(item => item.value === value);
            return (
              <button key={question.id} onClick={() => { setEditingFromReview(true); setPhase({ stage: 'question', index }); }} className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left border-b border-line-200 last:border-0 hover:bg-sage-50 transition-colors">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${option ? 'bg-sage-100 text-sage-700' : 'bg-canvas text-ink-600'}`}>{index + 1}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm text-ink-900 truncate">{question.text}</span><span className={`block text-xs mt-1 ${option ? 'text-sage-700' : 'text-ink-600 italic'}`}>{option?.label ?? 'Skipped'}</span></span>
                <span className="text-xs text-dusk-700">Edit</span>
              </button>
            );
          })}
        </div>

        <div className="card-organic p-5 mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1"><p className="font-medium text-ink-900">{answeredCount} of {total} answered</p><p className="text-sm text-ink-600 mt-1">Your result uses only answered questions, so skipped items do not add to the score.</p></div>
          {firstMissing >= 0 && <button onClick={() => { setEditingFromReview(true); setPhase({ stage: 'question', index: firstMissing }); }} className="btn-ghost text-sm whitespace-nowrap">Visit skipped question</button>}
        </div>

        <button onClick={finish} disabled={answeredCount === 0} className="btn-primary w-full mt-5">See my reflection <SparkIcon className="w-5 h-5" /></button>
        {answeredCount === 0 && <p className="text-xs text-ink-600 text-center mt-3">Answer at least one question to create a reflection.</p>}
      </div>
    );
  }

  const valid = phase.max > 0;
  const fraction = valid ? phase.score / phase.max : 0;
  const percentage = Math.round(fraction * 100);
  const scoredAnswers = ASSESSMENT_QUESTIONS
    .filter(question => answers[question.id] !== undefined)
    .map(question => ({ question, raw: answers[question.id], weighted: question.id === 'q8' ? 3 - answers[question.id] : answers[question.id] }))
    .sort((a, b) => b.weighted - a.weighted);

  return (
    <div className="pb-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <section className="card-organic p-6 sm:p-9 animate-rise">
          <div className="grid sm:grid-cols-[170px_1fr] gap-7 items-center">
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="#E3EBE4" strokeWidth="8" /><circle cx="60" cy="60" r="50" fill="none" stroke={fraction >= 0.75 ? '#D98168' : fraction >= 0.5 ? '#8C7FA3' : '#6E8F7C'} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * (1 - fraction)} /></svg>
              <div className="relative text-center"><p className="font-display text-3xl text-ink-900">{percentage}%</p><p className="text-[11px] text-ink-600">of answered range</p></div>
            </div>
            <div><p className="text-sm text-sage-700 font-medium">Your two-week reflection</p><h1 className="font-display text-2xl sm:text-3xl text-ink-900 mt-2 leading-tight">{band.title}</h1><p className="text-ink-600 mt-3">{band.message}</p><p className="text-sage-700 mt-3">{band.suggestion}</p></div>
          </div>

          {phase.skipped > 0 && <p className="text-xs text-ink-600 text-center mt-6 bg-canvas rounded-soft px-4 py-3">You skipped {phase.skipped} {phase.skipped === 1 ? 'question' : 'questions'}. This percentage is based only on what you answered.</p>}

          {scoredAnswers.length > 0 && (
            <div className="mt-7 pt-6 border-t border-line-200">
              <h2 className="font-medium text-ink-900">Signals worth noticing</h2>
              <p className="text-sm text-ink-600 mt-1">These were the strongest pressure signals in your responses—not diagnoses or conclusions.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {scoredAnswers.slice(0, 2).map(({ question, raw }) => (
                  <div key={question.id} className="rounded-soft bg-dusk-50 border border-dusk-200 p-4"><p className="text-sm text-ink-900 leading-snug">{question.text}</p><p className="text-xs text-dusk-700 font-medium mt-2">{ASSESSMENT_OPTIONS.find(option => option.value === raw)?.label}</p></div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-ink-600 text-center mt-6">{COPY.disclaimer}</p>
        </section>

        <section className="mt-6 card-soft p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="w-10 h-10 rounded-soft bg-dusk-100 text-dusk-700 flex items-center justify-center flex-shrink-0"><ChatIcon className="w-5 h-5" /></span><div><h2 className="font-medium text-ink-900">Would you like to talk through the pattern?</h2><p className="text-sm text-ink-600 mt-1">Nothing is sent automatically. Clicking below adds the complete assessment context to helloMind chat so it can respond to your actual answers.</p></div></div>
          <details className="mt-4 rounded-soft bg-canvas border border-line-200 group">
            <summary className="cursor-pointer px-4 py-3 text-sm text-sage-700 font-medium">Preview exactly what will be shared</summary>
            <div className="px-4 pb-4 max-h-64 overflow-y-auto border-t border-line-200 pt-3">
              <pre className="text-xs text-ink-600 whitespace-pre-wrap font-sans leading-relaxed">{buildChatPrompt()}</pre>
            </div>
          </details>
          <button onClick={() => { if (isHandingOff) return; setIsHandingOff(true); const prompt = buildChatPrompt(); if (onTalkThrough) onTalkThrough(prompt); else onNavigate?.('chat'); }} disabled={isHandingOff} className="btn-secondary w-full mt-4"><ChatIcon className="w-5 h-5" />{isHandingOff ? 'Opening helloMind…' : 'Talk it through with helloMind'}</button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-600 mt-3"><LockIcon className="w-3.5 h-3.5" />Only the assessment information shown above is included.</p>
        </section>

        <div className="grid gap-3 mt-5">
          {fraction >= 0.5 && <button onClick={() => onNavigate?.('resources')} className="btn-primary w-full"><LifelineIcon className="w-5 h-5" />See human support options</button>}
          <button onClick={() => { setAnswers({}); setIsHandingOff(false); setEditingFromReview(false); setPhase({ stage: 'intro' }); }} className="btn-ghost w-full">Take the check-in again another time</button>
        </div>
      </div>

      <WaveDivider className="text-sage-50" />
      <div className="bg-sage-50 py-8"><div className="max-w-xl mx-auto px-4 sm:px-6 text-center"><SectionHeading title="A note on what this is" sub="This check-in helps you notice patterns—it cannot diagnose anything. If the result stays with you or daily life feels hard to manage, a counsellor or mental-health professional can help you understand what is happening." className="mb-0 text-center mx-auto" /></div></div>
    </div>
  );
};

export default Assessment;
