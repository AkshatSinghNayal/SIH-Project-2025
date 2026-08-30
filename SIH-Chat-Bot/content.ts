/* ------------------------------------------------------------------ */
/* Chatbot quick replies                                               */
/* ------------------------------------------------------------------ */

export const QUICK_REPLIES = ["I'm stressed", 'Help me breathe', 'I need to vent', "I can't focus"];

/* ------------------------------------------------------------------ */
/* Daily mood check-in                                                 */
/* ------------------------------------------------------------------ */

export const MOOD_PROMPTS = [
  'How does today feel?',
  'What does today feel like?',
  'Checking in — how are you, really?',
];

/* ------------------------------------------------------------------ */
/* MCQ psychological assessment                                        */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_OPTIONS = [
  { label: 'Not really', value: 0 },
  { label: 'Some days', value: 1 },
  { label: 'Most days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

export const ASSESSMENT_QUESTIONS: { id: string; text: string }[] = [
  { id: 'q1', text: 'Over the last two weeks, how often have you felt weighed down by what you have to do?' },
  { id: 'q2', text: 'How often have you found it hard to slow down or switch off at night?' },
  { id: 'q3', text: 'How often has worrying made it difficult to focus in class or while studying?' },
  { id: 'q4', text: 'How often have you felt alone, even around other people?' },
  { id: 'q5', text: 'How often have you felt tired without a clear reason?' },
  { id: 'q6', text: 'How often have small setbacks felt much bigger than they should?' },
  { id: 'q7', text: 'How often have you lost interest in things you usually enjoy?' },
  { id: 'q8', text: 'How often have you felt hopeful about the coming week?' },
];

export interface AssessmentBand {
  min: number; // fraction of max score (0..1)
  title: string;
  message: string;
  suggestion: string;
}

// The last question is reverse-scored (hopeful) — framed as relief, not deficit.
export const ASSESSMENT_BANDS: AssessmentBand[] = [
  {
    min: 0,
    title: 'Things feel mostly steady right now',
    message:
      'Your responses suggest this stretch has been manageable. That’s worth noticing — steadiness is something you can protect with small daily habits.',
    suggestion: 'A short breathing exercise or a walk today could help keep it that way.',
  },
  {
    min: 0.25,
    title: 'Some stress is showing up',
    message:
      'Your responses suggest mild stress this week. That’s a common place to be during a semester, and it usually softens with a bit of care.',
    suggestion: 'Try one small thing from today’s task — even two minutes of slow breathing counts.',
  },
  {
    min: 0.5,
    title: 'Your responses suggest elevated stress',
    message:
      'Your responses suggest elevated stress this week. You carried it here, and that took effort. You don’t have to keep carrying it alone.',
    suggestion: 'Talking it through — with the chatbot, a friend, or a counsellor — often helps most this week.',
  },
  {
    min: 0.75,
    title: 'This week has been heavy',
    message:
      'Your responses suggest a lot of weight this week. Please be gentle with yourself — what you’re feeling is real, and support exists for exactly this.',
    suggestion: 'We’d gently encourage reaching out to a counsellor or a helpline. One conversation can lighten the load.',
  },
];

/* ------------------------------------------------------------------ */
/* Personality & psychological tests                                   */
/* ------------------------------------------------------------------ */

export interface PersonalityTraitDefinition {
  id: string;
  label: string;
  shortLabel: string;
  blurb: string;
  low: string;
  middle: string;
  high: string;
  strength: string;
  watchFor: string;
  practice: string;
}

export const PERSONALITY_TRAITS: PersonalityTraitDefinition[] = [
  {
    id: 'calm', label: 'Emotional steadiness', shortLabel: 'Steadiness',
    blurb: 'how strongly stress registers and how readily you recover',
    low: 'Your emotional radar is sensitive. You may notice pressure, uncertainty, and interpersonal shifts quickly and feel them deeply.',
    middle: 'You tend to register stress without always being carried away by it. Your response depends meaningfully on context and support.',
    high: 'You usually stay composed under pressure and regain your footing relatively quickly after setbacks.',
    strength: 'Emotional awareness, depth, and early detection of problems.',
    watchFor: 'Rumination or treating a temporary feeling as a permanent forecast.',
    practice: 'Name the feeling, then ask what evidence belongs to this moment rather than every possible future.',
  },
  {
    id: 'spark', label: 'Social energy', shortLabel: 'Social energy',
    blurb: 'where you draw interpersonal energy and how visibly you enter a room',
    low: 'You may prefer depth, smaller groups, and time alone to reset. You often think before taking social space.',
    middle: 'You can enjoy connection and solitude, shifting between them according to the people, purpose, and energy available.',
    high: 'Connection, activity, and visible participation tend to energise you. You are often comfortable initiating or speaking up.',
    strength: 'Thoughtful presence and selective, often deeper connection.',
    watchFor: 'Being overlooked because your contribution remains unspoken.',
    practice: 'Prepare one idea or question before a group setting so entering the conversation takes less energy.',
  },
  {
    id: 'steady', label: 'Self-management', shortLabel: 'Self-management',
    blurb: 'how you organise effort, follow through, and keep promises to yourself',
    low: 'You may work best through flexibility, urgency, or bursts of interest rather than rigid plans and routines.',
    middle: 'You can be organised and persistent when something matters, while still leaving room for spontaneity and changing priorities.',
    high: 'You tend to plan, persist, and follow through. Structure often helps you turn intentions into completed work.',
    strength: 'Adaptability, responsiveness, and openness to changing course.',
    watchFor: 'Avoidable last-minute pressure or relying on motivation to arrive first.',
    practice: 'Choose one visible next action and make it small enough to begin in five minutes.',
  },
  {
    id: 'curious', label: 'Openness', shortLabel: 'Openness',
    blurb: 'how readily you explore ideas, imagination, novelty, and complexity',
    low: 'You may prefer practical evidence, familiar methods, and ideas with a clear use. Reliability can matter more than novelty.',
    middle: 'You balance curiosity with practicality, exploring when it feels worthwhile without needing constant novelty.',
    high: 'You are likely drawn to ideas, imagination, unfamiliar perspectives, and questions without immediate answers.',
    strength: 'Practical judgement, clarity, and the ability to make ideas usable.',
    watchFor: 'Dismissing an unfamiliar approach before it has a fair trial.',
    practice: 'Once a week, explore one perspective you would not normally choose and note one useful thing in it.',
  },
  {
    id: 'warmth', label: 'Interpersonal warmth', shortLabel: 'Warmth',
    blurb: 'how naturally you prioritise empathy, cooperation, and relational harmony',
    low: 'You may value candour, independence, and rigorous disagreement more than easy harmony. You are less likely to agree merely to be liked.',
    middle: 'You usually combine care with boundaries, adjusting how direct or accommodating you are to the relationship and situation.',
    high: 'You tend to notice others’ feelings, cooperate readily, and protect trust. People may experience you as safe and considerate.',
    strength: 'Honesty, independence, and willingness to address what others avoid.',
    watchFor: 'Sounding sharper than intended or treating every disagreement as a problem to win.',
    practice: 'Before disagreeing, reflect the other person’s point in a way they would recognise as fair.',
  },
];

export const PERSONALITY_FACETS = [
  { id: 'recovery', trait: 'calm', label: 'Recovery', description: 'how readily you regain balance after stress or criticism' },
  { id: 'regulation', trait: 'calm', label: 'Emotional regulation', description: 'how manageable strong feelings feel in the moment' },
  { id: 'sociability', trait: 'spark', label: 'Sociability', description: 'how energising social contact tends to feel' },
  { id: 'assertiveness', trait: 'spark', label: 'Assertiveness', description: 'how comfortably you take initiative and make your voice visible' },
  { id: 'organization', trait: 'steady', label: 'Organisation', description: 'how naturally you create structure before acting' },
  { id: 'persistence', trait: 'steady', label: 'Persistence', description: 'how steadily you continue after novelty or motivation fades' },
  { id: 'imagination', trait: 'curious', label: 'Imagination', description: 'how often you engage possibilities beyond the immediately practical' },
  { id: 'inquiry', trait: 'curious', label: 'Intellectual curiosity', description: 'how readily you investigate unfamiliar ideas and explanations' },
  { id: 'compassion', trait: 'warmth', label: 'Compassion', description: 'how quickly you notice and respond to another person’s emotional state' },
  { id: 'cooperation', trait: 'warmth', label: 'Cooperation', description: 'how strongly you seek fairness, trust, and workable agreement' },
] as const;

export const PERSONALITY_OPTIONS = [
  { label: 'Not like me', value: 1 },
  { label: 'A little like me', value: 2 },
  { label: 'Somewhat like me', value: 3 },
  { label: 'Like me', value: 4 },
  { label: 'Very like me', value: 5 },
];

export interface PersonalityQuestion {
  id: string;
  text: string;
  trait: string;
  facet: string;
  reverse?: boolean;
}

// Mixed ordering and reverse-keyed items reduce simple agreement and section-order bias.
export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  { id: 'p1', text: 'After a difficult moment, I usually regain my balance before long.', trait: 'calm', facet: 'recovery' },
  { id: 'p2', text: 'Spending time with a group often leaves me feeling more energised.', trait: 'spark', facet: 'sociability' },
  { id: 'p3', text: 'I make a workable plan before beginning an important assignment.', trait: 'steady', facet: 'organization' },
  { id: 'p4', text: 'I enjoy imagining possibilities that may never become practical.', trait: 'curious', facet: 'imagination' },
  { id: 'p5', text: 'I notice fairly quickly when someone around me feels uncomfortable.', trait: 'warmth', facet: 'compassion' },
  { id: 'p6', text: 'Small worries can keep circling in my mind long after I want them to stop.', trait: 'calm', facet: 'regulation', reverse: true },
  { id: 'p7', text: 'I am comfortable being the person who starts a conversation or activity.', trait: 'spark', facet: 'assertiveness' },
  { id: 'p8', text: 'I continue with important work even after the initial excitement fades.', trait: 'steady', facet: 'persistence' },
  { id: 'p9', text: 'I like following a question simply because I want to understand it better.', trait: 'curious', facet: 'inquiry' },
  { id: 'p10', text: 'In disagreements, proving my point can matter more to me than finding common ground.', trait: 'warmth', facet: 'cooperation', reverse: true },
  { id: 'p11', text: 'A critical comment can stay with me for much of the day.', trait: 'calm', facet: 'recovery', reverse: true },
  { id: 'p12', text: 'Even with people I like, social gatherings often drain my energy.', trait: 'spark', facet: 'sociability', reverse: true },
  { id: 'p13', text: 'I often begin important work without deciding what to do first.', trait: 'steady', facet: 'organization', reverse: true },
  { id: 'p14', text: 'I rarely spend time imagining how things could be different.', trait: 'curious', facet: 'imagination', reverse: true },
  { id: 'p15', text: 'It can be hard for me to recognise when someone needs emotional support.', trait: 'warmth', facet: 'compassion', reverse: true },
  { id: 'p16', text: 'When emotions run high, I can usually pause before reacting.', trait: 'calm', facet: 'regulation' },
  { id: 'p17', text: 'I hold back useful ideas because speaking up feels uncomfortable.', trait: 'spark', facet: 'assertiveness', reverse: true },
  { id: 'p18', text: 'When a task becomes repetitive, I tend to lose momentum quickly.', trait: 'steady', facet: 'persistence', reverse: true },
  { id: 'p19', text: 'I usually prefer a familiar explanation over exploring a complicated new one.', trait: 'curious', facet: 'inquiry', reverse: true },
  { id: 'p20', text: 'I can disagree with someone while still trying to protect mutual respect.', trait: 'warmth', facet: 'cooperation' },
  { id: 'p21', text: 'Setbacks usually feel temporary to me rather than defining the whole week.', trait: 'calm', facet: 'recovery' },
  { id: 'p22', text: 'I naturally look for opportunities to connect with new people.', trait: 'spark', facet: 'sociability' },
  { id: 'p23', text: 'Keeping my materials and deadlines organised makes me feel more capable.', trait: 'steady', facet: 'organization' },
  { id: 'p24', text: 'Stories, art, or ideas often open vivid inner worlds for me.', trait: 'curious', facet: 'imagination' },
  { id: 'p25', text: 'Before offering advice, I try to understand what the other person is feeling.', trait: 'warmth', facet: 'compassion' },
  { id: 'p26', text: 'When I feel overwhelmed, it is difficult to settle myself without a lot of time.', trait: 'calm', facet: 'regulation', reverse: true },
  { id: 'p27', text: 'In group work, I avoid coordinating people even when direction is needed.', trait: 'spark', facet: 'assertiveness', reverse: true },
  { id: 'p28', text: 'I let small promises to myself slide when nobody else will know.', trait: 'steady', facet: 'persistence', reverse: true },
  { id: 'p29', text: 'I rarely seek perspectives that challenge my first interpretation.', trait: 'curious', facet: 'inquiry', reverse: true },
  { id: 'p30', text: 'Even when compromise is possible, I find it hard to let go of being right.', trait: 'warmth', facet: 'cooperation', reverse: true },
];

/* ------------------------------------------------------------------ */
/* Daily tasks & micro-courses — "Tube Track"                          */
/* ------------------------------------------------------------------ */

export type TaskKind = 'breathe' | 'lesson' | 'tip';
export type TaskNeed = 'calm' | 'focus' | 'rest' | 'learn';

export interface DailyTask {
  id: string;
  kind: TaskKind;
  need: TaskNeed;
  title: string;
  minutes: number;
  summary: string;
  /** kind-specific body */
  steps?: string[];
  paragraphs?: string[];
  takeaway?: string;
}

export const DAILY_TASKS: DailyTask[] = [
  {
    id: 't-breathe-478',
    kind: 'breathe',
    need: 'calm',
    title: 'Four-seven-eight breathing',
    minutes: 2,
    summary: 'A slow rhythm that tells your body the hard part is over.',
    takeaway: 'Notice how your shoulders sit a little lower afterwards.',
  },
  {
    id: 't-breathe-box',
    kind: 'breathe',
    need: 'calm',
    title: 'Box breathing',
    minutes: 3,
    summary: 'In, hold, out, hold — the pattern used to steady nerves before big moments.',
    takeaway: 'Even one minute of this can quiet a racing mind.',
  },
  {
    id: 't-lesson-stress',
    kind: 'lesson',
    need: 'learn',
    title: 'Why stress shows up in your body',
    minutes: 4,
    summary: 'A short read on what that tight-chest feeling actually is.',
    paragraphs: [
      'When you feel stressed, your body isn’t malfunctioning — it’s protecting you. A part of the brain called the amygdala reads deadlines and conflicts as threats, and prepares you to respond: heart rate up, muscles tight, breathing shallow. That was useful for our ancestors. For an exam schedule, less so.',
      'Here’s the hopeful part: the same system that speeds you up can be slowed down, deliberately. Long, slow exhales activate the vagus nerve, which signals safety. This is why breathing exercises aren’t filler — they’re a direct line to your body’s brake pedal.',
      'Stress becomes a problem not when it appears, but when it never leaves. Building small off-ramps into your day — a walk, a breath, a page of a journal — keeps it from settling in.',
    ],
    takeaway: 'You can’t think your way out of a stressed body — but you can breathe your way out.',
  },
  {
    id: 't-lesson-sleep',
    kind: 'lesson',
    need: 'rest',
    title: 'Sleep is a study strategy',
    minutes: 3,
    summary: 'What happens to what you learn while you sleep.',
    paragraphs: [
      'Memory has a night shift. During deep sleep, your brain replays the day and moves what matters into long-term storage. Cutting sleep to study longer is like writing notes and never filing them — the work happens, but it doesn’t stick.',
      'Most students need seven to nine hours. If that feels impossible, start with consistency: the same rough bedtime and wake time, even on weekends, does more for you than one long recovery sleep.',
      'If your mind races at night, keep a notepad by your bed. Writing a worry down tells your brain it’s safe to stop rehearsing it.',
    ],
    takeaway: 'Rest isn’t the opposite of productivity — it’s part of the machinery.',
  },
  {
    id: 't-tip-fivemin',
    kind: 'tip',
    need: 'focus',
    title: 'The five-minute start',
    minutes: 1,
    summary: 'How to begin when motivation doesn’t show up.',
    steps: [
      'Pick the task you’ve been avoiding.',
      'Commit to only five minutes of it — set a timer.',
      'When the timer ends, you’re free to stop, guilt-free.',
      'Notice that most of the time, you won’t want to.',
    ],
    takeaway: 'Starting is a skill. Five minutes at a time is how it’s learned.',
  },
  {
    id: 't-tip-tomorrow',
    kind: 'tip',
    need: 'rest',
    title: 'Tomorrow, written tonight',
    minutes: 1,
    summary: 'Close the day on purpose so the next one opens calmly.',
    steps: [
      'Before bed, write down the three things that matter most tomorrow.',
      'Circle just one — that’s your anchor task.',
      'Put the list somewhere you’ll see it in the morning.',
      'Let everything else wait its turn.',
    ],
    takeaway: 'A short list sleeps better than a long one.',
  },
];

/* ------------------------------------------------------------------ */
/* Resources & expert referral                                         */
/* ------------------------------------------------------------------ */

export interface Helpline {
  name: string;
  description: string;
  phone: string; // display
  tel: string; // tel: link
  availability: string;
  urgent?: boolean;
}

export const HELPLINES: Helpline[] = [
  {
    name: 'Tele-MANAS (Govt. of India)',
    description: 'Free, confidential mental-health support in over 20 languages, staffed by trained counsellors.',
    phone: '14416',
    tel: '14416',
    availability: 'Available any time, day or night',
    urgent: true,
  },
  {
    name: 'KIRAN mental health helpline',
    description: 'A national helpline for students and anyone feeling overwhelmed, run by mental-health professionals.',
    phone: '1800-599-0019',
    tel: '18005990019',
    availability: 'Available any time, day or night',
    urgent: true,
  },
  {
    name: 'Vandrevala Foundation',
    description: 'Free counselling by phone for anxiety, stress, and anything weighing on you.',
    phone: '1860-2662-345',
    tel: '18602662345',
    availability: 'Available any time, day or night',
  },
  {
    name: 'iCALL (TISS)',
    description: 'Email and phone counselling with trained professionals, run by the Tata Institute of Social Sciences.',
    phone: '91529-87821',
    tel: '9152987821',
    availability: 'Mon–Sat, 10 am to 8 pm',
  },
  {
    name: 'Childline (for under-18s)',
    description: 'Support for young people in distress — exams, home, anything that feels too big.',
    phone: '1098',
    tel: '1098',
    availability: 'Available any time, day or night',
  },
];

/* ------------------------------------------------------------------ */
/* Anonymous peer chat                                                 */
/* ------------------------------------------------------------------ */

export const PEER_GUIDELINES = [
  'Listen first. Everyone here is carrying something.',
  'No advice unless it’s asked for — often people just want to be heard.',
  'No names, colleges, or details that could identify anyone, including you.',
  'Be kind about spelling, grammar, and rambles. 3 a.m. messages get grace.',
  'If someone is in crisis, gently point them to the helplines in Resources.',
];

export const NICKNAME_ADJECTIVES = ['Quiet', 'Gentle', 'Slow', 'Soft', 'Steady', 'Drifting', 'Honest'];
export const NICKNAME_PLANTS = ['Fern', 'Marigold', 'Riverstone', 'Lotus', 'Cedar', 'Marigold', 'Sage', 'Willow'];

export const PEER_REPLIES = [
  'That sounds like a lot to hold. I’m listening.',
  'I’ve felt something like that too, especially around exams. You’re not the only one.',
  'Thanks for saying it out loud. That takes more courage than people think.',
  'That makes sense, honestly. Anyone in your place would feel worn down.',
  'No pressure to explain more — but if you want to, I’m here.',
  'This week has been heavy for me too. Somehow it helps knowing we’re both up.',
  'You described that really well. Sometimes naming it is half the relief.',
];

/* ------------------------------------------------------------------ */
/* Gentle microcopy                                                    */
/* ------------------------------------------------------------------ */

export const COPY = {
  error: 'That didn’t work — take a breath and try again?',
  privacyLine: 'Your entries are private and stored only on your device. Only you can see them.',
  disclaimer: 'helloMind is a first-response companion, not a therapist or doctor.',
};
