import React, { useMemo, useState } from 'react';
import type { TraitScores } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  PERSONALITY_FACETS,
  PERSONALITY_OPTIONS,
  PERSONALITY_QUESTIONS,
  PERSONALITY_TRAITS,
} from '../content';
import { savePersonalityResult } from '../services/storageService';
import { BreathingCircle, LeafProgress } from './design';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, SparkIcon } from './icons';

interface PersonalityReport {
  traits: TraitScores;
  facets: TraitScores;
  responseConfidence: number;
}

type Phase =
  | { stage: 'intro' }
  | { stage: 'question'; index: number }
  | ({ stage: 'done' } & PersonalityReport);

const R = 96;
const CX = 130;
const CY = 130;

const point = (index: number, fraction: number): [number, number] => {
  const angle = (-90 + index * 72) * (Math.PI / 180);
  return [CX + R * fraction * Math.cos(angle), CY + R * fraction * Math.sin(angle)];
};

const polygon = (fractions: number[]): string =>
  fractions.map((fraction, index) => point(index, fraction).join(',')).join(' ');

const PetalChart: React.FC<{ traits: TraitScores }> = ({ traits }) => {
  const values = PERSONALITY_TRAITS.map(trait => (traits[trait.id] ?? 0) / 100);
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[320px] mx-auto" role="img" aria-label="Five-trait personality profile">
      {[0.25, 0.5, 0.75, 1].map(ring => (
        <polygon key={ring} points={polygon(PERSONALITY_TRAITS.map(() => ring))} fill="none" stroke="#E4E0D6" strokeWidth="1" />
      ))}
      {PERSONALITY_TRAITS.map((_, index) => {
        const [x, y] = point(index, 1);
        return <line key={index} x1={CX} y1={CY} x2={x} y2={y} stroke="#E4E0D6" strokeWidth="1" />;
      })}
      <polygon points={polygon(values)} fill="#8C7FA3" fillOpacity="0.24" stroke="#665A7D" strokeWidth="2.5" strokeLinejoin="round" />
      {PERSONALITY_TRAITS.map((trait, index) => {
        const [x, y] = point(index, (traits[trait.id] ?? 0) / 100);
        return <circle key={trait.id} cx={x} cy={y} r="4.5" fill="#6E8F7C" />;
      })}
      {PERSONALITY_TRAITS.map((trait, index) => {
        const [x, y] = point(index, 1.25);
        return (
          <text key={trait.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-ink-600" style={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
            {trait.shortLabel}
          </text>
        );
      })}
    </svg>
  );
};

const scoreBand = (score: number) =>
  score < 40
    ? { label: 'Lower expression', tone: 'bg-dusk-100 text-dusk-700', key: 'low' as const }
    : score < 65
      ? { label: 'Flexible range', tone: 'bg-sage-100 text-sage-700', key: 'middle' as const }
      : { label: 'Higher expression', tone: 'bg-honey-100 text-ink-900', key: 'high' as const };

const HIGH_EDGES: Record<string, { strength: string; watch: string; practice: string }> = {
  calm: {
    strength: 'Composure, perspective, and the ability to steady a tense situation.',
    watch: 'Moving past difficult feelings so quickly that they do not get properly processed.',
    practice: 'When something matters, pause long enough to ask what the feeling may be trying to signal.',
  },
  spark: {
    strength: 'Initiative, visible enthusiasm, and an ability to bring people into motion.',
    watch: 'Filling available space before quieter people have had time to enter it.',
    practice: 'In one group conversation, deliberately invite a quieter voice before adding your next point.',
  },
  steady: {
    strength: 'Reliability, preparation, and sustained effort when work becomes demanding.',
    watch: 'Perfectionism, overcontrol, or feeling guilty when rest interrupts a plan.',
    practice: 'Define what “good enough” looks like before starting one task this week.',
  },
  curious: {
    strength: 'Original thinking, perspective-taking, and comfort with complexity.',
    watch: 'Collecting possibilities without choosing one, or becoming restless with routine necessities.',
    practice: 'Choose one interesting idea and turn it into a small concrete experiment.',
  },
  warmth: {
    strength: 'Trust-building, compassion, and sensitivity to what a relationship needs.',
    watch: 'Over-accommodating, avoiding necessary conflict, or carrying feelings that belong to others.',
    practice: 'Use one kind, direct boundary: “I care about this, and here is what I can realistically do.”',
  },
};

const COMBINATIONS: Record<string, string> = {
  'calm|spark': 'Composure and social energy together can make you a reassuring visible presence. Others may look to you when a group needs both momentum and steadiness.',
  'calm|steady': 'Emotional steadiness and self-management can support reliable performance under pressure. Remember that competence does not remove the need for recovery.',
  'calm|curious': 'A steady inner climate can give curiosity room to explore difficult or unfamiliar ideas without becoming overwhelmed by uncertainty.',
  'calm|warmth': 'You may offer others a grounded kind of care: emotionally present without being easily swept away. Make room for your own needs as well.',
  'spark|steady': 'Social initiative plus follow-through can make you effective at organising people and carrying shared plans through to completion.',
  'curious|spark': 'Curiosity and outward energy may show up as enthusiastic idea-sharing, experimentation, and an appetite for new people or experiences.',
  'spark|warmth': 'Social confidence and warmth can make connection come naturally. Your influence is strongest when listening keeps pace with expression.',
  'curious|steady': 'You may be especially able to turn ideas into systems, projects, or finished work—the bridge between possibility and execution.',
  'steady|warmth': 'Reliability and care together often create trust. Be alert to taking responsibility for more than your fair share.',
  'curious|warmth': 'Openness and compassion can help you understand lives unlike your own and hold more than one perspective at a time.',
};

const calculateReport = (answers: Record<string, number>): PersonalityReport => {
  const scored = (question: (typeof PERSONALITY_QUESTIONS)[number]) => {
    const raw = answers[question.id] ?? 3;
    return question.reverse ? 6 - raw : raw;
  };
  const toPercent = (values: number[]) => Math.round(((values.reduce((sum, value) => sum + value, 0) / values.length - 1) / 4) * 100);

  const traits: TraitScores = {};
  for (const trait of PERSONALITY_TRAITS) {
    traits[trait.id] = toPercent(PERSONALITY_QUESTIONS.filter(question => question.trait === trait.id).map(scored));
  }

  const facets: TraitScores = {};
  for (const facet of PERSONALITY_FACETS) {
    facets[facet.id] = toPercent(PERSONALITY_QUESTIONS.filter(question => question.facet === facet.id).map(scored));
  }

  const values = Object.values(answers);
  const uniqueAnswers = new Set(values).size;
  const mostFrequent = Math.max(...PERSONALITY_OPTIONS.map(option => values.filter(value => value === option.value).length));
  const dominantShare = mostFrequent / Math.max(1, values.length);
  const responseConfidence = uniqueAnswers >= 4 && dominantShare < 0.65 ? 92 : uniqueAnswers >= 3 && dominantShare < 0.8 ? 80 : uniqueAnswers >= 2 ? 65 : 45;

  return { traits, facets, responseConfidence };
};

const PersonalityTest: React.FC = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>({ stage: 'intro' });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isAdvancing, setIsAdvancing] = useState(false);
  const total = PERSONALITY_QUESTIONS.length;

  const finish = (finalAnswers: Record<string, number>) => {
    const report = calculateReport(finalAnswers);
    if (user && !user.isGuest) {
      savePersonalityResult(user.id, { ts: Date.now(), ...report, version: 2 });
    }
    setPhase({ stage: 'done', ...report });
  };

  const answer = (questionId: string, value: number) => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    setTimeout(() => {
      setIsAdvancing(false);
      const index = PERSONALITY_QUESTIONS.findIndex(question => question.id === questionId);
      if (index + 1 >= total) finish(next);
      else setPhase({ stage: 'question', index: index + 1 });
    }, 260);
  };

  const narrative = useMemo(() => {
    if (phase.stage !== 'done') return null;
    const ranked = [...PERSONALITY_TRAITS].sort((a, b) => phase.traits[b.id] - phase.traits[a.id]);
    const top = ranked.slice(0, 2);
    const key = [top[0].id, top[1].id].sort().join('|');
    return { ranked, top, interaction: COMBINATIONS[key] };
  }, [phase]);

  if (phase.stage === 'intro') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="card-organic p-6 sm:p-9 animate-rise">
          <div className="flex justify-center mb-5"><BreathingCircle size={76} tone="dusk" /></div>
          <p className="text-xs uppercase tracking-wider text-dusk-700 font-semibold text-center">Five-factor self-reflection</p>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink-900 text-center mt-2">A deeper personality portrait</h1>
          <p className="text-ink-600 text-center mt-3 mb-8 max-w-lg mx-auto">
            Thirty carefully balanced statements explore five broad traits and ten underlying facets. Answer for how you have usually been over the last six months—not only today.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            {[
              ['30', 'mixed statements'],
              ['8–10 min', 'at an unhurried pace'],
              ['10 facets', 'with practical analysis'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-soft bg-dusk-50 border border-dusk-200 p-4 text-center">
                <p className="font-display text-xl text-dusk-700">{value}</p><p className="text-xs text-ink-600 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-3 text-sm text-ink-900 mb-8 max-w-lg mx-auto">
            <li className="flex gap-3"><CheckIcon className="w-5 h-5 text-sage-500 flex-shrink-0" />Reverse-scored items help reduce the tendency to agree with everything.</li>
            <li className="flex gap-3"><SparkIcon className="w-5 h-5 text-dusk-500 flex-shrink-0" />Your report includes trait interactions, strengths, watch-outs, and small experiments.</li>
            <li className="flex gap-3"><ArrowRightIcon className="w-5 h-5 text-dusk-500 flex-shrink-0" />No trait is “good” or “bad”—context determines when a tendency helps.</li>
          </ul>
          <button onClick={() => setPhase({ stage: 'question', index: 0 })} className="btn-primary w-full bg-dusk-500 hover:bg-dusk-700 active:bg-dusk-700">Begin my portrait</button>
          <p className="text-xs text-ink-600 text-center mt-4">This is a structured self-reflection tool, not a diagnosis or a clinically validated personality inventory.</p>
        </div>
      </div>
    );
  }

  if (phase.stage === 'question') {
    const question = PERSONALITY_QUESTIONS[phase.index];
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => phase.index === 0 ? setPhase({ stage: 'intro' }) : setPhase({ stage: 'question', index: phase.index - 1 })} className="btn-ghost px-2 py-1" aria-label="Previous statement"><ArrowLeftIcon className="w-5 h-5" /></button>
          <LeafProgress value={(phase.index + 1) / total} label={`${phase.index + 1} of ${total}`} />
          <span className="text-xs text-ink-600 w-16 text-right">{Math.round(((phase.index + 1) / total) * 100)}%</span>
        </div>
        <div key={question.id} className="card-organic p-6 sm:p-8 animate-rise">
          <p className="text-sm text-dusk-700 font-medium mb-3">Thinking about the last six months…</p>
          <h2 className="font-display text-xl sm:text-2xl font-medium text-ink-900 leading-snug">“{question.text}”</h2>
          <div className="mt-7 space-y-2.5">
            {PERSONALITY_OPTIONS.map(option => (
              <button key={option.value} disabled={isAdvancing} onClick={() => answer(question.id, option.value)} className={`w-full text-left px-5 py-3.5 rounded-soft border transition-colors duration-200 disabled:cursor-wait ${answers[question.id] === option.value ? 'border-dusk-500 bg-dusk-100 text-dusk-700 font-medium' : 'border-line-200 bg-surface text-ink-900 hover:border-dusk-500 hover:bg-dusk-50'}`}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-600 mt-5 text-center">Choose the answer that is generally true, even if exceptions come to mind.</p>
        </div>
      </div>
    );
  }

  if (!narrative) return null;
  const confidenceLabel = phase.responseConfidence >= 85 ? 'Well differentiated' : phase.responseConfidence >= 70 ? 'Reasonably differentiated' : 'Interpret gently';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16">
      <section className="card-organic p-6 sm:p-9 animate-rise">
        <p className="text-sm text-dusk-700 font-medium text-center mb-1">Your personality portrait</p>
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink-900 text-center">A pattern, not a box</h1>
        <p className="text-ink-600 text-center mt-3 max-w-xl mx-auto">These scores describe tendencies in your answers. They are not percentiles, diagnoses, or limits on who you can become.</p>
        <div className="my-8"><PetalChart traits={phase.traits} /></div>

        <div className="grid sm:grid-cols-2 gap-4">
          {narrative.top.map(trait => {
            const band = scoreBand(phase.traits[trait.id]);
            return (
              <div key={trait.id} className="rounded-soft border border-dusk-200 bg-dusk-50 p-5">
                <p className="text-xs text-dusk-700 font-semibold uppercase tracking-wide">Strongest signal</p>
                <h2 className="font-display text-xl text-ink-900 mt-1">{trait.label}</h2>
                <p className="text-sm text-ink-600 mt-2">{trait[band.key]}</p>
              </div>
            );
          })}
        </div>

        {narrative.interaction && (
          <div className="mt-5 rounded-soft bg-sage-50 border border-sage-200 p-5">
            <h2 className="font-medium text-ink-900">How your strongest signals may work together</h2>
            <p className="text-sm text-ink-600 mt-2 leading-relaxed">{narrative.interaction}</p>
          </div>
        )}

        <div className="mt-5 rounded-soft border border-line-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-ink-900">Response confidence: {confidenceLabel}</p>
            <p className="text-sm text-ink-600 mt-1">Based on completion and how distinctly you used the answer scale—not a measure of clinical reliability.</p>
          </div>
          <span className="font-display text-2xl text-dusk-700">{phase.responseConfidence}%</span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-ink-900">Detailed trait analysis</h2>
        <p className="text-sm text-ink-600 mt-1 mb-5">Read lower scores as preferences, not deficits. Every range has useful capacities and predictable trade-offs.</p>
        <div className="space-y-5">
          {PERSONALITY_TRAITS.map(trait => {
            const score = phase.traits[trait.id];
            const band = scoreBand(score);
            const facets = PERSONALITY_FACETS.filter(facet => facet.trait === trait.id);
            const highEdge = HIGH_EDGES[trait.id];
            const strength = band.key === 'high' ? highEdge.strength : band.key === 'middle' ? 'Range and adaptability—you can move between both ends when the context asks for it.' : trait.strength;
            const watch = band.key === 'high' ? highEdge.watch : band.key === 'middle' ? 'Your behaviour may vary by setting, so notice which environments pull you toward either extreme.' : trait.watchFor;
            const practice = band.key === 'high' ? highEdge.practice : band.key === 'middle' ? 'Notice one situation where choosing either more or less of this trait would serve you deliberately.' : trait.practice;
            return (
              <article key={trait.id} className="card-soft p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-display text-xl text-ink-900">{trait.label}</h3><p className="text-sm text-ink-600 mt-0.5">{trait.blurb}</p></div>
                  <div className="text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${band.tone}`}>{band.label}</span><p className="font-display text-2xl text-ink-900 mt-1">{score}</p></div>
                </div>
                <div className="h-2 rounded-full bg-sage-100 overflow-hidden mt-4"><span className="block h-full rounded-full bg-gradient-to-r from-sage-500 to-dusk-500" style={{ width: `${score}%` }} /></div>
                <p className="text-sm text-ink-900 mt-4 leading-relaxed">{trait[band.key]}</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  {facets.map(facet => (
                    <div key={facet.id} className="rounded-soft bg-canvas border border-line-200 p-4">
                      <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-ink-900">{facet.label}</span><span className="text-dusk-700">{phase.facets[facet.id]}</span></div>
                      <div className="h-1.5 rounded-full bg-dusk-100 mt-2 overflow-hidden"><span className="block h-full bg-dusk-500 rounded-full" style={{ width: `${phase.facets[facet.id]}%` }} /></div>
                      <p className="text-xs text-ink-600 mt-2">{facet.description}</p>
                    </div>
                  ))}
                </div>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div><dt className="font-medium text-sage-700">Capacity to trust</dt><dd className="text-ink-600 mt-0.5">{strength}</dd></div>
                  <div><dt className="font-medium text-coral-500">Possible overextension</dt><dd className="text-ink-600 mt-0.5">{watch}</dd></div>
                  <div><dt className="font-medium text-dusk-700">One useful experiment</dt><dd className="text-ink-600 mt-0.5">{practice}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 card-organic p-6 bg-dusk-50">
        <h2 className="font-display text-xl text-ink-900">How to use this report</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-600 list-disc list-inside">
          <li>Look for descriptions that match repeated behaviour, not one unusual week.</li>
          <li>Compare your two facets inside each trait; large gaps often contain the most useful insight.</li>
          <li>Retake after several months or a major life change—not repeatedly in search of a preferred score.</li>
          <li>For formal educational, workplace, or clinical decisions, use a validated assessment with a qualified professional.</li>
        </ul>
      </section>

      <button onClick={() => { setAnswers({}); setPhase({ stage: 'intro' }); }} className="btn-secondary w-full mt-7">Take it again another season</button>
    </div>
  );
};

export default PersonalityTest;
