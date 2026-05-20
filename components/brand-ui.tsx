'use client';

import { useState, useRef } from 'react';

export const C = {
  navy:        '#0A0E45',
  blue:        '#0062DF',
  orange:      '#FF6300',
  green:       '#00DD84',
  white:       '#ffffff',
  navy2:       '#0E0E3B',
  lightGrey:   '#F5F6FE',
  charcoal:    '#59596D',
  lightPurple: '#CECFEE',
  black:       '#00002E',
} as const;

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open  = () => { clearTimeout(hideTimer.current); setShow(true);  };
  const close = () => { hideTimer.current = setTimeout(() => setShow(false), 120); };

  return (
    <span className="relative inline-flex items-center" onMouseEnter={open} onMouseLeave={close}>
      <span
        className="cursor-help w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 select-none"
        style={{ backgroundColor: C.charcoal, color: C.white, fontSize: 10, fontWeight: 700 }}
        aria-hidden="true"
      >
        i
      </span>
      {show && (
        <span
          className="absolute z-50 w-64 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            backgroundColor: C.navy, color: C.white, fontWeight: 400, lineHeight: 1.5,
            bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            whiteSpace: 'normal',
          }}
          onMouseEnter={open}
          onMouseLeave={close}
          role="tooltip"
        >
          {text}
          <span style={{
            position: 'absolute', left: '50%', top: '100%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent', borderTopColor: C.navy, display: 'block',
          }} />
        </span>
      )}
    </span>
  );
}

export function CTABand() {
  return (
    <section className="cta-band py-16 px-6 text-center" style={{ backgroundColor: C.navy }}>
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
        <h2 className="text-2xl" style={{ color: C.white, fontWeight: 700 }}>Ready to improve your score?</h2>
        <p style={{ color: C.lightPurple, fontWeight: 400 }}>
          demandDrive helps B2B companies build visibility across search and AI platforms.
        </p>
        <a
          href="https://www.demanddrive.com/contact-us/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 rounded-lg text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: C.blue, color: C.white, fontWeight: 500 }}
        >
          Talk to Our Team
        </a>
      </div>
    </section>
  );
}
