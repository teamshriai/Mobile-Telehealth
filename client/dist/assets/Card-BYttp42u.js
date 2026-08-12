import{j as b,m as E}from"./index-CUccPktj.js";const g={default:`
    bg-white/95 border border-[#E8EDF2]
    shadow-[0_1px_2px_0_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)]
  `,elevated:`
    bg-white/95 border border-[#E8EDF2]
    shadow-[0_18px_45px_0_rgba(15,23,42,0.08)]
  `,ghost:`
    bg-[#F8FAFC] border border-[#E8EDF2]
  `,bordered:`
    bg-white border-2 border-[#E8EDF2]
  `,gradient:`
    border border-[#E8EDF2]
    shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_4px_16px_0_rgba(15,23,42,0.06)]
  `,primary:`
    border border-[#BFDBFE]
    shadow-[0_1px_3px_0_rgba(37,99,235,0.08),0_4px_16px_0_rgba(37,99,235,0.08)]
  `},n={none:"",sm:"p-3",md:"p-4",lg:"p-5",xl:"p-6"},p={md:"rounded-xl",lg:"rounded-2xl",xl:"rounded-3xl"};function m({children:a,variant:r="default",padding:_="lg",radius:i="lg",hover:d=!1,animate:F=!1,delay:x=0,onClick:e,className:l="",style:o={}}){const t=r==="gradient"?{background:"linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 100%)"}:r==="primary"?{background:"linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 100%)"}:{},s=`
    ${g[r]||g.default}
    ${n[_]||n.lg}
    ${p[i]||p.lg}
    ${d?"card-hover cursor-pointer":""}
    ${e?"cursor-pointer":""}
    ${l}
  `;return F?b.jsx(E.div,{initial:{opacity:0,y:16},animate:{opacity:1,y:0},transition:{duration:.45,delay:x,ease:[.16,1,.3,1]},whileHover:d?{y:-2}:{},onClick:e,className:s,style:{...t,...o},children:a}):b.jsx("div",{onClick:e,className:s,style:{...t,...o},children:a})}export{m as C};
