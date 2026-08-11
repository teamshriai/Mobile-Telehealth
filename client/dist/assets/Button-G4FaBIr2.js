import{d as y,r as b,j as e,A as g,m as p,X as w}from"./index-89N0AgCs.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=y("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]),h={sm:"max-w-sm",md:"max-w-md",lg:"max-w-lg",xl:"max-w-2xl","2xl":"max-w-3xl",full:"max-w-5xl"};function _({isOpen:t,onClose:r,title:n,subtitle:i,children:d,footer:a,size:x="md",closeable:s=!0,className:l=""}){return b.useEffect(()=>(t?document.body.style.overflow="hidden":document.body.style.overflow="",()=>{document.body.style.overflow=""}),[t]),b.useEffect(()=>{const o=c=>{c.key==="Escape"&&s&&(r==null||r())};return t&&window.addEventListener("keydown",o),()=>window.removeEventListener("keydown",o)},[t,s,r]),e.jsx(g,{children:t&&e.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4",children:[e.jsx(p.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2},className:"absolute inset-0 bg-[#0F172A]/40",style:{backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"},onClick:s?r:void 0}),e.jsxs(p.div,{initial:{opacity:0,scale:.95,y:16},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.95,y:16},transition:{duration:.25,ease:[.16,1,.3,1]},className:`
              relative w-full bg-white rounded-3xl
              border border-[#E8EDF2] overflow-hidden
              shadow-[0_20px_60px_0_rgba(15,23,42,0.18)]
              ${h[x]||h.md}
              ${l}
            `,children:[(n||s)&&e.jsxs("div",{className:"flex items-start justify-between px-6 pt-6 pb-0",children:[e.jsxs("div",{className:"space-y-0.5",children:[n&&e.jsx("h3",{className:"text-base font-bold text-[#0F172A] leading-snug",style:{fontFamily:"DM Sans, Inter, sans-serif",letterSpacing:"-0.01em"},children:n}),i&&e.jsx("p",{className:"text-xs text-[#64748B]",children:i})]}),s&&e.jsx("button",{onClick:r,className:`w-8 h-8 flex items-center justify-center rounded-xl
                               text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9]
                               transition-all duration-200 flex-shrink-0 ml-4`,children:e.jsx(w,{size:15})})]}),e.jsx("div",{className:"px-6 py-6",children:d}),a&&e.jsx("div",{className:"px-6 pb-6 pt-0 flex items-center justify-end gap-3 border-t border-[#F1F5F9] mt-2 pt-4",children:a})]})]})})}const u={primary:`
    bg-[#2563EB] text-white border-transparent
    hover:bg-[#1D4ED8]
    shadow-[0_1px_3px_0_rgba(37,99,235,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(37,99,235,0.35)]
  `,secondary:`
    bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]
    hover:bg-[#DBEAFE] hover:border-[#93C5FD]
  `,ghost:`
    bg-transparent text-[#64748B] border-transparent
    hover:bg-[#F1F5F9] hover:text-[#0F172A]
  `,danger:`
    bg-[#DC2626] text-white border-transparent
    hover:bg-[#B91C1C]
    shadow-[0_1px_3px_0_rgba(220,38,38,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(220,38,38,0.3)]
  `,outline:`
    bg-white text-[#0F172A] border-[#E8EDF2]
    hover:bg-[#F8FAFC] hover:border-[#94A3B8]
  `,success:`
    bg-[#16A34A] text-white border-transparent
    hover:bg-[#15803D]
    shadow-[0_1px_3px_0_rgba(22,163,74,0.3)]
    hover:shadow-[0_4px_16px_0_rgba(22,163,74,0.3)]
  `},f={xs:"px-3 py-1.5 text-xs rounded-lg gap-1.5",sm:"px-3 py-1.5 text-xs rounded-lg gap-1.5",md:"px-4 py-2 text-sm rounded-lg gap-2",lg:"px-5 py-2.5 text-sm rounded-xl gap-2",xl:"px-8 py-4 text-base rounded-2xl gap-3"};function j({children:t,variant:r="primary",size:n="md",icon:i,iconRight:d,loading:a=!1,disabled:x=!1,fullWidth:s=!1,onClick:l,type:o="button",className:c=""}){const m=x||a;return e.jsxs(p.button,{type:o,onClick:l,disabled:m,whileTap:m?{}:{scale:.97},className:`
        inline-flex items-center justify-center
        font-semibold border
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15
        disabled:opacity-50 disabled:cursor-not-allowed
        ${u[r]||u.primary}
        ${f[n]||f.md}
        ${s?"w-full":""}
        ${c}
      `,children:[a?e.jsx(v,{size:14,className:"animate-spin flex-shrink-0"}):i?e.jsx("span",{className:"flex-shrink-0",children:i}):null,t&&e.jsx("span",{children:t}),d&&!a&&e.jsx("span",{className:"flex-shrink-0",children:d})]})}export{j as B,_ as M};
