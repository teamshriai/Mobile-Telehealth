import{j as r}from"./index-B8MrwdYc.js";const t={success:"bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]",danger:"bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]",warning:"bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",info:"bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]",primary:"bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",muted:"bg-[#F1F5F9] text-[#64748B] border-[#E8EDF2]",purple:"bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]",dark:"bg-[#0F172A] text-white border-transparent"},s={xs:"px-2 py-0.5 text-[10px] rounded-md gap-1",sm:"px-2.5 py-1 text-xs rounded-lg gap-1.5",md:"px-3 py-1.5 text-xs rounded-xl gap-1.5"},n={success:"bg-[#16A34A]",danger:"bg-[#DC2626]",warning:"bg-[#D97706]",info:"bg-[#0284C7]",primary:"bg-[#2563EB]",muted:"bg-[#64748B]",purple:"bg-[#7C3AED]",dark:"bg-white"};function F({children:a,variant:e="primary",size:o="sm",dot:d=!1,pulse:p=!1,className:b=""}){const x=t[e]??t.primary,g=s[o]??s.sm,E=n[e]??n.primary;return r.jsxs("span",{className:`
        inline-flex items-center font-semibold border
        whitespace-nowrap select-none
        ${x}
        ${g}
        ${b}
      `,children:[d&&r.jsx("span",{className:`
            w-1.5 h-1.5 rounded-full flex-shrink-0
            ${E}
            ${p?"animate-pulse":""}
          `}),a]})}export{F as S};
