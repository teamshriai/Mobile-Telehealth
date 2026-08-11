import{r as B,j as e,l as E,X as j}from"./index-89N0AgCs.js";function z({value:o,onChange:t,placeholder:d="Search...",onClear:s,size:a="md",className:x="",autoFocus:p=!1}){const[f,i]=B.useState(""),l=o!==void 0,r=l?o:f,m=u=>{l||i(u.target.value),t==null||t(u.target.value)},S=()=>{l||i(""),t==null||t(""),s==null||s()},c={sm:"px-3 py-2 pl-8 text-xs rounded-xl",md:"px-4 py-2.5 pl-9 text-sm rounded-xl",lg:"px-4 py-3 pl-10 text-sm rounded-2xl"},n={sm:{size:13,left:"left-2.5"},md:{size:14,left:"left-3"},lg:{size:15,left:"left-3.5"}},{size:b,left:v}=n[a]||n.md;return e.jsxs("div",{className:`relative ${x}`,children:[e.jsx(E,{size:b,className:`absolute ${v} top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none`}),e.jsx("input",{type:"text",value:r,onChange:m,placeholder:d,autoFocus:p,className:`
          w-full bg-white border border-[#E8EDF2]
          text-[#0F172A] placeholder-[#94A3B8]
          transition-all duration-200
          focus:outline-none focus:border-[#2563EB]
          focus:ring-4 focus:ring-[#2563EB]/10
          hover:border-[#94A3B8]
          ${c[a]||c.md}
          ${r?"pr-8":""}
        `}),r&&e.jsx("button",{type:"button",onClick:S,className:`absolute right-3 top-1/2 -translate-y-1/2
                     text-[#94A3B8] hover:text-[#64748B] transition-colors`,children:e.jsx(j,{size:13})})]})}export{z as S};
