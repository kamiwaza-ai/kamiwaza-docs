"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[3249],{7763:(e,n,t)=>{t.d(n,{A:()=>c});t(6540);var a=t(4164),i=t(5195);const l={tableOfContents:"tableOfContents_bqdL",docItemContainer:"docItemContainer_F8PC"};var s=t(4848);const r="table-of-contents__link toc-highlight",o="table-of-contents__link--active";function c(e){let{className:n,...t}=e;return(0,s.jsx)("div",{className:(0,a.A)(l.tableOfContents,"thin-scrollbar",n),children:(0,s.jsx)(i.A,{...t,linkClassName:r,linkActiveClassName:o})})}},5195:(e,n,t)=>{t.d(n,{A:()=>v});var a=t(6540),i=t(6342);function l(e){const n=e.map((e=>({...e,parentIndex:-1,children:[]}))),t=Array(7).fill(-1);n.forEach(((e,n)=>{const a=t.slice(2,e.level);e.parentIndex=Math.max(...a),t[e.level]=n}));const a=[];return n.forEach((e=>{const{parentIndex:t,...i}=e;t>=0?n[t].children.push(i):a.push(i)})),a}function s(e){let{toc:n,minHeadingLevel:t,maxHeadingLevel:a}=e;return n.flatMap((e=>{const n=s({toc:e.children,minHeadingLevel:t,maxHeadingLevel:a});return function(e){return e.level>=t&&e.level<=a}(e)?[{...e,children:n}]:n}))}function r(e){const n=e.getBoundingClientRect();return n.top===n.bottom?r(e.parentNode):n}function o(e,n){let{anchorTopOffset:t}=n;const a=e.find((e=>r(e).top>=t));if(a){return function(e){return e.top>0&&e.bottom<window.innerHeight/2}(r(a))?a:e[e.indexOf(a)-1]??null}return e[e.length-1]??null}function c(){const e=(0,a.useRef)(0),{navbar:{hideOnScroll:n}}=(0,i.p)();return(0,a.useEffect)((()=>{e.current=n?0:document.querySelector(".navbar").clientHeight}),[n]),e}function d(e){const n=(0,a.useRef)(void 0),t=c();(0,a.useEffect)((()=>{if(!e)return()=>{};const{linkClassName:a,linkActiveClassName:i,minHeadingLevel:l,maxHeadingLevel:s}=e;function r(){const e=function(e){return Array.from(document.getElementsByClassName(e))}(a),r=function(e){let{minHeadingLevel:n,maxHeadingLevel:t}=e;const a=[];for(let i=n;i<=t;i+=1)a.push(`h${i}.anchor`);return Array.from(document.querySelectorAll(a.join()))}({minHeadingLevel:l,maxHeadingLevel:s}),c=o(r,{anchorTopOffset:t.current}),d=e.find((e=>c&&c.id===function(e){return decodeURIComponent(e.href.substring(e.href.indexOf("#")+1))}(e)));e.forEach((e=>{!function(e,t){t?(n.current&&n.current!==e&&n.current.classList.remove(i),e.classList.add(i),n.current=e):e.classList.remove(i)}(e,e===d)}))}return document.addEventListener("scroll",r),document.addEventListener("resize",r),r(),()=>{document.removeEventListener("scroll",r),document.removeEventListener("resize",r)}}),[e,t])}var m=t(8774),u=t(4848);function f(e){let{toc:n,className:t,linkClassName:a,isChild:i}=e;return n.length?(0,u.jsx)("ul",{className:i?void 0:t,children:n.map((e=>(0,u.jsxs)("li",{children:[(0,u.jsx)(m.A,{to:`#${e.id}`,className:a??void 0,dangerouslySetInnerHTML:{__html:e.value}}),(0,u.jsx)(f,{isChild:!0,toc:e.children,className:t,linkClassName:a})]},e.id)))}):null}const h=a.memo(f);function v(e){let{toc:n,className:t="table-of-contents table-of-contents__left-border",linkClassName:r="table-of-contents__link",linkActiveClassName:o,minHeadingLevel:c,maxHeadingLevel:m,...f}=e;const v=(0,i.p)(),g=c??v.tableOfContents.minHeadingLevel,x=m??v.tableOfContents.maxHeadingLevel,p=function(e){let{toc:n,minHeadingLevel:t,maxHeadingLevel:i}=e;return(0,a.useMemo)((()=>s({toc:l(n),minHeadingLevel:t,maxHeadingLevel:i})),[n,t,i])}({toc:n,minHeadingLevel:g,maxHeadingLevel:x});return d((0,a.useMemo)((()=>{if(r&&o)return{linkClassName:r,linkActiveClassName:o,minHeadingLevel:g,maxHeadingLevel:x}}),[r,o,g,x])),(0,u.jsx)(h,{toc:p,className:t,linkClassName:r,...f})}},8663:(e,n,t)=>{t.r(n),t.d(n,{default:()=>m});var a=t(6540),i=t(4164),l=t(1213),s=t(7559),r=t(8244),o=t(7763),c=t(4848);function d(e){let{content:n}=e;const t=n,{metadata:i,frontMatter:l,toc:s}=n,d=i.readingTime?`${Math.ceil(i.readingTime)} min read`:null;return a.useEffect((()=>{const e=document.createElement("style");return e.innerHTML="\n      .markdown img {\n        width: 100%;\n        height: auto;\n        border-radius: 0.5rem;\n      }\n      \n      .markdown p img {\n        margin: 2rem 0;\n      }\n      \n      .markdown p {\n        position: relative;\n      }\n      \n      .markdown p:has(> img) {\n        padding: 2rem;\n        margin: 2rem 0;\n        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\n        border-radius: 0.5rem;\n        background: white;\n      }\n    ",document.head.appendChild(e),()=>{document.head.removeChild(e)}}),[]),(0,c.jsx)(r.A,{title:i.title,description:i.description,children:(0,c.jsx)("div",{className:"container",children:(0,c.jsxs)("div",{className:"row",children:[(0,c.jsxs)("div",{className:"col col--7",children:[(0,c.jsxs)("header",{children:[(0,c.jsx)("h1",{className:"text-[2.5rem] leading-[1.2] font-bold mb-4",children:i.title}),(0,c.jsxs)("div",{className:"text-sm text-gray-600 mb-8",children:[new Date(i.date).toLocaleDateString(),d&&(0,c.jsxs)("span",{children:[" \xb7 ",d]})]}),l.description&&(0,c.jsx)("div",{className:"text-lg text-gray-700 mb-8",children:l.description}),l.image&&(0,c.jsx)("div",{className:"mb-12 rounded-lg overflow-hidden",children:(0,c.jsx)("img",{src:`/kamiwaza-docs${l.image}`,alt:i.title,style:{width:"100%",height:"100%",objectFit:"cover"}})})]}),(0,c.jsx)("main",{className:"markdown",children:(0,c.jsx)(t,{})})]}),s&&(0,c.jsx)("div",{className:"col col--3 col--offset-1",children:(0,c.jsx)("div",{className:"sticky top-4",children:(0,c.jsx)(o.A,{toc:s})})})]})})})}function m(e){const{content:n}=e;return(0,c.jsx)(l.e3,{className:(0,i.A)(s.G.wrapper.blogPages,s.G.page.blogPostPage),children:(0,c.jsx)(d,{content:n})})}}}]);