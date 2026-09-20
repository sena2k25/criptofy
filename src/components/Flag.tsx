import { useId } from "react";

const FLAGS: Record<string, string> = {
  br: `<rect width="22" height="22" fill="#009b3a"/><polygon points="11,3.2 20.2,11 11,18.8 1.8,11" fill="#fedf00"/><circle cx="11" cy="11" r="4.1" fill="#002776"/>`,
  us: `<rect width="22" height="22" fill="#bf0a30"/><rect y="2" width="22" height="2" fill="#fff"/><rect y="6" width="22" height="2" fill="#fff"/><rect y="10" width="22" height="2" fill="#fff"/><rect y="14" width="22" height="2" fill="#fff"/><rect y="18" width="22" height="2" fill="#fff"/><rect width="11" height="12" fill="#002868"/>`,
  pt: `<rect width="22" height="22" fill="#ff0000"/><rect width="8" height="22" fill="#006600"/><circle cx="8" cy="11" r="3.2" fill="#ffcc00"/>`,
  es: `<rect width="22" height="22" fill="#c60b1e"/><rect y="6" width="22" height="10" fill="#ffc400"/>`,
  ar: `<rect width="22" height="22" fill="#74acdf"/><rect y="7" width="22" height="8" fill="#fff"/><circle cx="11" cy="11" r="2.2" fill="#f6b40e"/>`,
  py: `<rect width="22" height="7.4" fill="#d52b1e"/><rect y="7.4" width="22" height="7.2" fill="#fff"/><rect y="14.6" width="22" height="7.4" fill="#0038a8"/><circle cx="11" cy="11" r="2" fill="#f8d109"/>`,
  uy: `<rect width="22" height="22" fill="#fff"/><rect y="2" width="22" height="2" fill="#0038a8"/><rect y="6" width="22" height="2" fill="#0038a8"/><rect y="10" width="22" height="2" fill="#0038a8"/><rect y="14" width="22" height="2" fill="#0038a8"/><rect y="18" width="22" height="2" fill="#0038a8"/><rect width="9" height="10" fill="#fff"/><circle cx="4.5" cy="5" r="2.1" fill="#fcd116"/>`,
  cl: `<rect width="22" height="22" fill="#fff"/><rect y="11" width="22" height="11" fill="#d52b1e"/><rect width="8" height="11" fill="#0039a6"/>`,
  co: `<rect width="22" height="11" fill="#fcd116"/><rect y="11" width="22" height="5.5" fill="#003893"/><rect y="16.5" width="22" height="5.5" fill="#ce1126"/>`,
  mx: `<rect width="22" height="22" fill="#fff"/><rect width="7.4" height="22" fill="#006847"/><rect x="14.6" width="7.4" height="22" fill="#ce1126"/><circle cx="11" cy="11" r="2" fill="#c5922c"/>`,
  pe: `<rect width="22" height="22" fill="#fff"/><rect width="7.4" height="22" fill="#d91023"/><rect x="14.6" width="7.4" height="22" fill="#d91023"/>`,
  gb: `<rect width="22" height="22" fill="#012169"/><path d="M0,0 L22,22 M22,0 L0,22" stroke="#fff" stroke-width="4"/><path d="M0,0 L22,22 M22,0 L0,22" stroke="#c8102e" stroke-width="2"/><path d="M11,0 V22 M0,11 H22" stroke="#fff" stroke-width="6"/><path d="M11,0 V22 M0,11 H22" stroke="#c8102e" stroke-width="3"/>`,
  ca: `<rect width="22" height="22" fill="#fff"/><rect width="6" height="22" fill="#d52b1e"/><rect x="16" width="6" height="22" fill="#d52b1e"/><polygon points="11,4 12.2,8.2 16.6,8.2 13.1,10.8 14.4,15 11,12.4 7.6,15 8.9,10.8 5.4,8.2 9.8,8.2" fill="#d52b1e"/>`,
  jp: `<rect width="22" height="22" fill="#fff"/><circle cx="11" cy="11" r="5" fill="#bc002d"/>`,
  de: `<rect width="22" height="7.4" fill="#000"/><rect y="7.4" width="22" height="7.2" fill="#d00"/><rect y="14.6" width="22" height="7.4" fill="#ffce00"/>`,
  fr: `<rect width="22" height="22" fill="#fff"/><rect width="7.4" height="22" fill="#0055a4"/><rect x="14.6" width="7.4" height="22" fill="#ef4135"/>`,
};

export function Flag({ id }: { id: string }) {
  const clip = useId().replace(/:/g, "");
  return (
    <span className="fx-flag" aria-hidden>
      <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <defs>
          <clipPath id={clip}>
            <circle cx="11" cy="11" r="11" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`} dangerouslySetInnerHTML={{ __html: FLAGS[id] || FLAGS.br }} />
      </svg>
    </span>
  );
}
