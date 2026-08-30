import React from 'react';
import { HELPLINES } from '../content';
import { BreathingCircle, SectionHeading } from './design';
import { LifelineIcon, PhoneIcon } from './icons';

const Resources: React.FC = () => (
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
    <SectionHeading
      title="People who are glad you called"
      sub="Every service here is free and confidential. You don’t need to be in crisis — “I’m not okay” is reason enough."
    />

    {/* The one to call first */}
    <div className="card-organic p-6 sm:p-7 mb-6 border-coral-500/30 bg-gradient-to-br from-surface to-coral-100/40">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <span className="inline-flex w-12 h-12 items-center justify-center rounded-soft bg-coral-100 text-coral-500 flex-shrink-0">
          <LifelineIcon className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-coral-500 font-medium">If tonight feels heavy</p>
          <h2 className="font-display text-2xl font-medium text-ink-900 mt-1">Tele-MANAS — 14416</h2>
          <p className="text-sm text-ink-600 mt-2">
            Trained counsellors, any hour, in your language. A real person picks up. {HELPLINES[0].availability.toLowerCase()}.
          </p>
          <a href="tel:14416" className="btn-primary mt-4 bg-coral-500 hover:bg-coral-500 active:bg-coral-500">
            <PhoneIcon className="w-5 h-5" />
            Call 14416 now
          </a>
        </div>
      </div>
    </div>

    {/* The full directory */}
    <ul className="space-y-3 mb-10">
      {HELPLINES.map(h => (
        <li key={h.name} className="card-soft p-5 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink-900">{h.name}</p>
            <p className="text-sm text-ink-600 mt-1 leading-snug">{h.description}</p>
            <p className="text-xs text-ink-600/80 mt-2">{h.availability}</p>
          </div>
          <a
            href={`tel:${h.tel}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-soft border border-sage-200 bg-sage-50 text-sage-700 font-medium text-sm hover:bg-sage-100 transition-colors flex-shrink-0"
          >
            <PhoneIcon className="w-4 h-4" />
            {h.phone}
          </a>
        </li>
      ))}
    </ul>

    {/* Campus counselling */}
    <div className="card-soft p-5 mb-10 bg-dusk-50">
      <h3 className="font-medium text-ink-900 mb-1">Your campus counselling centre</h3>
      <p className="text-sm text-ink-600">
        Most colleges have a free counselling cell — often called the “student wellbeing cell.” Ask your hostel warden,
        mentor, or student affairs office for this semester’s timings. Walking in counts as courage, not weakness.
      </p>
    </div>

    <div className="text-center pb-4">
      <div className="flex justify-center mb-4">
        <BreathingCircle size={56} tone="sage" />
      </div>
      <p className="font-display text-lg text-ink-900">You reached this page — that matters.</p>
      <p className="text-sm text-ink-600 mt-2 max-w-sm mx-auto">
        However today ends, tomorrow gets a fresh start. If you’re ever in immediate danger, please call emergency
        services (112 in India) first.
      </p>
    </div>
  </div>
);

export default Resources;
