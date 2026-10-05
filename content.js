// Edit biography, writing, and paper details here.
// Venue/status information was supplied by Jonathan Su; links use the public papers and repositories.
import purrence from './blog/purrence/post.js?v=attention-compute-plateau-20261005';
export const site = {
  name: 'Jonathan Su',
  biography: [
    { type: 'greeting', text: 'hello wonderful people of the internet!' },
    { type: 'paragraph', text: 'i am jonathan su' },
    { type: 'paragraph', text: 'i think llms/ai are like a new digital species, and ai researchers are architectural biologists. so, needless to say, it is the coolest thing ever.' },
    { type: 'paragraph', text: 'right now i am a senior at german swiss international school in hong kong. my interests are in llm architecture (specifically residuals) and pretraining.' },
    {
      type: 'list',
      title: 'here are some things i believe in:',
      items: [
        'simplicity always beats complexity',
        'whatever doesn’t kill you makes you stronger and uglier',
        'the worst and best aspect of life is that there is no meaning/goal',
        'average happiness is positive over a lifetime',
      ],
    },
    {
      type: 'list',
      title: 'things i like',
      items: [
        'cyberpunk 2077 / edgerunners',
        'open source llms (olmo series and modded nanogpt)',
        'calisthenics',
        'pizza',
        'intuition/epiphany',
        'dark mode',
        'chess (not very good)',
      ],
    },
    {
      type: 'list',
      title: 'things i don’t like:',
      items: [
        'large vocab dimensions (softmax bottleneck)',
        'mlps with small dims in llm',
        'unfused operations',
      ],
    },
    {
      type: 'contact',
      before: 'i love talking to new people! if you want, send an email to ',
      email: 'jon123boss@gmail.com',
      after: '. we can play chess :)',
      note: '(the background is inspired by cyberpunk 2077. click on 3 rogue ais from the blackwall; a surprise is waiting)',
    },
  ],
  blogs: [purrence],
  papers: [
    {
      title: 'Attention Projection Mixing with Exogenous Anchors',
      authors: 'Jonathan Su',
      year: '2026',
      venue: 'ICML',
      track: 'Main Track',
      status: '',
      abstract: '',
      url: 'https://arxiv.org/pdf/2601.08131v4',
      github: 'https://github.com/jon123boss/ExoFormer',
      preview: './assets/papers/exoformer-first-page.png',
      explanation: 'exoformer',
    },
    {
      title: 'Low-Rank Attention Residuals',
      authors: 'Jonathan Su',
      year: '2027',
      venue: 'ICLR',
      status: 'Submitted',
      abstract: '',
      url: 'https://arxiv.org/pdf/2607.09694v2',
      github: 'https://github.com/jon123boss/LR-AttnRes',
      preview: './assets/papers/lr-attnres-first-page.png',
      explanation: 'lr-attnres',
    },
  ],
};
