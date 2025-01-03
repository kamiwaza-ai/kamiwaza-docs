"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[9819],{4167:(e,i,n)=>{n.r(i),n.d(i,{assets:()=>s,contentTitle:()=>l,default:()=>r,frontMatter:()=>o,metadata:()=>t,toc:()=>c});var t=n(5476),a=n(4848),I=n(8453);const o={title:"Using Kamiwaza Authentication and Model Inferencing with Any AI Application",description:"How to integrate Kamiwaza's authentication and model inferencing into any AI application.",date:new Date("2025-01-03T00:00:00.000Z"),image:"/img/blog/images/2025-01-03-kamiwaza-private-gpt.png"},l="Adding Kamiwaza Authentication and Model Inferencing to Your AI Application",s={authorsImageUrls:[]},c=[{value:"Enterprise Authentication Integration",id:"enterprise-authentication-integration",level:2},{value:"How It Works",id:"how-it-works",level:3},{value:"Setting Up the Auth API Interface",id:"setting-up-the-auth-api-interface",level:3},{value:"Managing Authentication State",id:"managing-authentication-state",level:3},{value:"Model Integration",id:"model-integration",level:2},{value:"How It Works",id:"how-it-works-1",level:3},{value:"Integrating Models in Practice",id:"integrating-models-in-practice",level:3},{value:"Using Models for Inference",id:"using-models-for-inference",level:3},{value:"Example Implementation: Vercel AI Chatbot",id:"example-implementation-vercel-ai-chatbot",level:2}];function d(e){const i={a:"a",code:"code",h2:"h2",h3:"h3",img:"img",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,I.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(i.p,{children:["The Kamiwaza Enterprise AI Platform provides a comprehensive suite of tools for building and deploying AI applications in enterprise environments. This guide focuses on two specific features of the platform: enterprise authentication and model inferencing. We'll demonstrate how to integrate these features into your application using our port of the Vercel AI Chatbot as an example. All of the code in this guide is available in the ",(0,a.jsx)(i.a,{href:"https://github.com/kamiwaza-ai/ai-chatbot",children:"Kamiwaza Vercel AI Chatbot repository"}),"."]}),"\n",(0,a.jsx)(i.h2,{id:"enterprise-authentication-integration",children:"Enterprise Authentication Integration"}),"\n",(0,a.jsx)(i.p,{children:"Kamiwaza's authentication system provides centralized auth management that can be integrated into any application. Rather than building your own auth system, you can leverage Kamiwaza's secure token-based authentication and user management. The platform also supports advanced authentication features including role-based access control, group management, and organization-level permissioning - enabling enterprise-grade user management beyond basic authentication. While this guide focuses on core authentication, these additional features can be leveraged through the same centralized auth service."}),"\n",(0,a.jsx)(i.h3,{id:"how-it-works",children:"How It Works"}),"\n",(0,a.jsx)(i.p,{children:(0,a.jsx)(i.img,{alt:"Authentication Flow Diagram",src:n(3740).A+"",width:"800",height:"400"})}),"\n",(0,a.jsx)(i.p,{children:"When integrating with Kamiwaza auth:"}),"\n",(0,a.jsxs)(i.ol,{children:["\n",(0,a.jsx)(i.li,{children:"Your application sends login requests to Kamiwaza's auth service"}),"\n",(0,a.jsx)(i.li,{children:"Kamiwaza validates credentials and returns a JWT token in a secure HTTP-only cookie"}),"\n",(0,a.jsx)(i.li,{children:"Your application verifies the token's validity with Kamiwaza for protected routes"}),"\n"]}),"\n",(0,a.jsx)(i.p,{children:"Now, your application can use the token to access protected routes and resources."}),"\n",(0,a.jsx)(i.h3,{id:"setting-up-the-auth-api-interface",children:"Setting Up the Auth API Interface"}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-typescript",children:"// lib/kamiwazaApi.ts\nconst KAMIWAZA_API_URI = process.env.KAMIWAZA_API_URI;\n\nexport async function login(username: string, password: string): Promise<LoginResponse> {\n  const response = await fetch(`${KAMIWAZA_API_URI}/api/auth/token`, {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/x-www-form-urlencoded',\n    },\n    body: new URLSearchParams({\n      username,\n      password,\n    }),\n  });\n\n  if (!response.ok) {\n    throw new Error('Login failed');\n  }\n\n  return response.json();\n}\n\nexport async function verifyToken(token?: string): Promise<UserData | null> {\n  const response = await fetch(`${KAMIWAZA_API_URI}/api/auth/verify-token`, {\n    headers: { 'Cookie': `access_token=${token}` }\n  });\n\n  if (!response.ok) {\n    return null;\n  }\n\n  return response.json();\n}\n"})}),"\n",(0,a.jsx)(i.h3,{id:"managing-authentication-state",children:"Managing Authentication State"}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-typescript",children:"// lib/auth-context.tsx\nexport function AuthProvider({ children }: { children: ReactNode }) {\n  const [user, setUser] = useState<UserData | null>(null);\n  \n  useEffect(() => {\n    const checkAuth = async () => {\n      try {\n        const userData = await verifyToken();\n        if (userData) {\n          setUser(userData);\n        }\n      } catch (error) {\n        setUser(null);\n      }\n    }\n    checkAuth();\n  }, []);\n\n  return (\n    <AuthContext.Provider value={{ user }}>\n      {children}\n    </AuthContext.Provider>\n  );\n}\n"})}),"\n",(0,a.jsx)(i.p,{children:"This integration provides your application with:"}),"\n",(0,a.jsxs)(i.ul,{children:["\n",(0,a.jsx)(i.li,{children:"Secure token-based authentication"}),"\n",(0,a.jsx)(i.li,{children:"Centralized user management"}),"\n",(0,a.jsx)(i.li,{children:"Session handling via HTTP-only cookies"}),"\n",(0,a.jsx)(i.li,{children:"Built-in token verification and refresh"}),"\n"]}),"\n",(0,a.jsx)(i.p,{children:"The AuthProvider component wraps your application and manages the authentication state, while the Kamiwaza service handles all the security-critical operations like token generation and validation."}),"\n",(0,a.jsx)(i.h2,{id:"model-integration",children:"Model Integration"}),"\n",(0,a.jsx)(i.p,{children:"Models deployed through the Kamiwaza Platform can be easily integrated into any AI application. While models are deployed and managed through Kamiwaza's dashboard, accessing them in your application is straightforward - you just need to point your application to the deployed model's endpoint. This enables you to use Kamiwaza-hosted models alongside other LLM providers like OpenAI or Anthropic, giving you flexibility in model selection while maintaining a consistent integration pattern."}),"\n",(0,a.jsx)(i.p,{children:(0,a.jsx)(i.img,{alt:"Model Inference Diagram",src:n(8793).A+"",width:"800",height:"500"})}),"\n",(0,a.jsx)(i.h3,{id:"how-it-works-1",children:"How It Works"}),"\n",(0,a.jsxs)(i.ul,{children:["\n",(0,a.jsx)(i.li,{children:"Models are deployed and managed through the Kamiwaza dashboard"}),"\n",(0,a.jsx)(i.li,{children:"Each deployed model is accessible via a specific endpoint and port"}),"\n",(0,a.jsx)(i.li,{children:"Your application can fetch available models using Kamiwaza's deployment API"}),"\n",(0,a.jsx)(i.li,{children:"Once selected, models can be used through a familiar OpenAI-compatible interface"}),"\n"]}),"\n",(0,a.jsx)(i.p,{children:"This approach allows you to switch between different models without changing application code, use multiple models in the same application, and maintain a consistent API interface regardless of the model provider."}),"\n",(0,a.jsx)(i.h3,{id:"integrating-models-in-practice",children:"Integrating Models in Practice"}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-typescript",children:"// app/kamiwaza/actions.ts\nexport async function getKamiwazaDeployments() {\n  const response = await fetch(`${KAMIWAZA_API_URI}/api/serving/deployments`);\n  if (!response.ok) {\n    throw new Error('Failed to fetch deployments');\n  }\n  \n  const data = await response.json();\n  return data.filter((d: Deployment) => d.status === 'DEPLOYED')\n    .map((d: Deployment) => ({\n      ...d,\n      instances: d.instances.map(instance => ({\n        ...instance,\n        host_name: instance.host_name || 'localhost'\n      }))\n    }));\n}\n\n// components/model-selector.tsx\nexport function ModelSelector({ onModelSelect }: ModelSelectorProps) {\n  const [deployments, setDeployments] = useState<Deployment[]>([]);\n\n  useEffect(() => {\n    const fetchDeployments = async () => {\n      const fetchedDeployments = await getKamiwazaDeployments();\n      if (fetchedDeployments.length > 0) {\n        const deployment = fetchedDeployments[0];\n        const modelInfo = {\n          baseUrl: `http://${deployment.instances[0].host_name}:${deployment.lb_port}/v1`,\n          modelName: deployment.m_name\n        };\n        onModelSelect(modelInfo);\n      }\n    };\n\n    fetchDeployments();\n  }, []);\n}\n"})}),"\n",(0,a.jsx)(i.h3,{id:"using-models-for-inference",children:"Using Models for Inference"}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-typescript",children:"// lib/chat/actions.tsx\nconst modelClient = createOpenAI({\n  baseURL: getDockerizedUrl(selectedModel.baseUrl),\n  apiKey: 'kamiwaza_model'\n});\n\nconst result = await streamUI({\n  model: modelClient(selectedModel.modelName),\n  messages: messages,\n  text: ({ content, done }) => {\n    // Handle streaming response\n  }\n});\n"})}),"\n",(0,a.jsx)(i.h2,{id:"example-implementation-vercel-ai-chatbot",children:"Example Implementation: Vercel AI Chatbot"}),"\n",(0,a.jsx)(i.p,{children:"We've provided a complete example implementation that demonstrates these concepts in action. You can deploy your own instance of our Kamiwaza-enabled chatbot using Docker:"}),"\n",(0,a.jsxs)(i.ol,{children:["\n",(0,a.jsx)(i.li,{children:"Clone the repository:"}),"\n"]}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-bash",children:"git clone https://github.com/kamiwaza-ai/ai-chatbot\ncd ai-chatbot\n"})}),"\n",(0,a.jsxs)(i.ol,{start:"2",children:["\n",(0,a.jsx)(i.li,{children:"Configure environment variables:"}),"\n"]}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-bash",children:"cp .env.example .env\n"})}),"\n",(0,a.jsxs)(i.p,{children:["Update the ",(0,a.jsx)(i.code,{children:".env"})," file with your configuration:"]}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-bash",children:"# Kamiwaza Configuration\nKAMIWAZA_API_URI=http://localhost:7777\nNEXT_PUBLIC_KAMIWAZA_API_URI=http://localhost:7777\n\n# Model Configuration (optional - for fixed model setup)\nFIXED_MODEL_URI=http://localhost:8000/v1\nFIXED_MODEL_NAME='Dracarys2-72B-Instruct-4bit'\nALLOW_ANONYMOUS=false\n\n# Authentication (generate using: openssl rand -base64 32)\nAUTH_SECRET=your-generated-secret\nNEXTAUTH_SECRET=your-generated-secret\nNEXTAUTH_URL=http://localhost:3003\n\n# Redis Configuration\nKV_URL=redis://localhost:6379\nKV_REST_API_URL=None\nKV_REST_API_TOKEN=dummy_token\nKV_REST_API_READ_ONLY_TOKEN=dummy_readonly_token\n\n# Required but can be set to noop for Kamiwaza\nOPENAI_API_KEY=noop\n"})}),"\n",(0,a.jsxs)(i.ol,{start:"3",children:["\n",(0,a.jsx)(i.li,{children:"Build and start the application using Docker:"}),"\n"]}),"\n",(0,a.jsx)(i.pre,{children:(0,a.jsx)(i.code,{className:"language-bash",children:"docker-compose build\ndocker-compose up -d\n"})}),"\n",(0,a.jsxs)(i.p,{children:["The application will be available at ",(0,a.jsx)(i.code,{children:"http://localhost:3003"}),". You can now log in using your Kamiwaza credentials and start chatting with your deployed models. The Docker Compose configuration will automatically set up both the chatbot application and its required Redis database for storing chat history."]}),"\n",(0,a.jsxs)(i.p,{children:["The complete example code demonstrates authentication integration, model selection, and chat functionality in a production-ready application context. If you're interested in learning more about how Kamiwaza can help you build your own AI applications, please ",(0,a.jsx)(i.a,{href:"https://kamiwaza.ai/contact",children:"contact us"})," for a demo."]}),"\n",(0,a.jsx)(i.p,{children:"\xa0"})]})}function r(e={}){const{wrapper:i}={...(0,I.R)(),...e.components};return i?(0,a.jsx)(i,{...e,children:(0,a.jsx)(d,{...e})}):d(e)}},3740:(e,i,n)=>{n.d(i,{A:()=>t});const t="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MDAgNDAwIj4KICA8IS0tIERlZmluaXRpb25zIC0tPgogIDxkZWZzPgogICAgPG1hcmtlciBpZD0iYXJyb3doZWFkIiBtYXJrZXJXaWR0aD0iMTAiIG1hcmtlckhlaWdodD0iNyIgcmVmWD0iOSIgcmVmWT0iMy41IiBvcmllbnQ9ImF1dG8iPgogICAgICA8cG9seWdvbiBwb2ludHM9IjAgMCwgMTAgMy41LCAwIDciIGZpbGw9IiM2NjYiIC8+CiAgICA8L21hcmtlcj4KICA8L2RlZnM+CgogIDwhLS0gQmFja2dyb3VuZCAtLT4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZjlmYSIgcng9IjEwIiAvPgogIAogIDwhLS0gQ2xpZW50IEFwcCBCb3ggLS0+CiAgPHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgcng9IjEwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkNsaWVudCBBcHBsaWNhdGlvbjwvdGV4dD4KICA8dGV4dCB4PSIxNTAiIHk9IjEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij4oWW91ciBBcHApPC90ZXh0PgoKICA8IS0tIEthbWl3YXphIEF1dGggQm94IC0tPgogIDxyZWN0IHg9IjMwMCIgeT0iMTUwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgcng9IjEwIiBmaWxsPSIjNENBRjUwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjQwMCIgeT0iMTkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIj5LYW1pd2F6YSBBdXRoPC90ZXh0PgogIDx0ZXh0IHg9IjQwMCIgeT0iMjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmYiPi9hcGkvYXV0aC8qPC90ZXh0PgoKICA8IS0tIFByb3RlY3RlZCBSZXNvdXJjZXMgQm94IC0tPgogIDxyZWN0IHg9IjU1MCIgeT0iMjUwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgcng9IjEwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjY1MCIgeT0iMjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPlByb3RlY3RlZCBSZXNvdXJjZXM8L3RleHQ+CiAgPHRleHQgeD0iNjUwIiB5PSIzMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+KFlvdXIgQXBwJ3MgRmVhdHVyZXMpPC90ZXh0PgoKICA8IS0tIEFycm93cyAtLT4KICA8IS0tIExvZ2luIFJlcXVlc3QgLS0+CiAgPHBhdGggZD0iTSAxNTAsMTUwIEwgMTUwLDIwMCBMIDI5MCwyMDAiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiIGZpbGw9Im5vbmUiLz4KICA8dGV4dCB4PSIyMjAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij4xLiBMb2dpbiBSZXF1ZXN0PC90ZXh0PgoKICA8IS0tIEF1dGggVG9rZW4gLS0+CiAgPHBhdGggZD0iTSA1MTAsMjAwIEwgNjAwLDIwMCBMIDYwMCwyNDAiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiIGZpbGw9Im5vbmUiLz4KICA8dGV4dCB4PSI1NzAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij4yLiBBdXRoIFRva2VuPC90ZXh0PgoKICA8IS0tIFJlc291cmNlIFJlcXVlc3QgLS0+CiAgPHBhdGggZD0iTSAxNTAsMTUwIEMgMTUwLDI4MCAzMDAsMzAwIDU0MCwzMDAiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiIGZpbGw9Im5vbmUiLz4KICA8dGV4dCB4PSIzMDAiIHk9IjMyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij4zLiBBY2Nlc3MgUmVzb3VyY2VzIHdpdGggVG9rZW48L3RleHQ+CgogIDwhLS0gTGVnZW5kIC0tPgogIDxyZWN0IHg9IjUwIiB5PSIzNTAiIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNSIgZmlsbD0iIzRDQUY1MCIvPgogIDx0ZXh0IHg9Ijc1IiB5PSIzNjIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+S2FtaXdhemEgU2VydmljZXM8L3RleHQ+CiAgCiAgPHJlY3QgeD0iMjAwIiB5PSIzNTAiIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMzMzIi8+CiAgPHRleHQgeD0iMjI1IiB5PSIzNjIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+WW91ciBBcHBsaWNhdGlvbjwvdGV4dD4KPC9zdmc+Cg=="},8793:(e,i,n)=>{n.d(i,{A:()=>t});const t="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MDAgNTAwIj4KICA8IS0tIERlZmluaXRpb25zIC0tPgogIDxkZWZzPgogICAgPG1hcmtlciBpZD0iYXJyb3doZWFkIiBtYXJrZXJXaWR0aD0iMTAiIG1hcmtlckhlaWdodD0iNyIgcmVmWD0iOSIgcmVmWT0iMy41IiBvcmllbnQ9ImF1dG8iPgogICAgICA8cG9seWdvbiBwb2ludHM9IjAgMCwgMTAgMy41LCAwIDciIGZpbGw9IiM2NjYiIC8+CiAgICA8L21hcmtlcj4KICA8L2RlZnM+CgogIDwhLS0gQmFja2dyb3VuZCAtLT4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2Y4ZjlmYSIgcng9IjEwIiAvPgogIAogIDwhLS0gWW91ciBBcHBsaWNhdGlvbiBCb3ggLS0+CiAgPHJlY3QgeD0iNTAiIHk9IjIwMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNTAiIHk9IjI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5Zb3VyIEFwcGxpY2F0aW9uPC90ZXh0PgogIDx0ZXh0IHg9IjE1MCIgeT0iMjYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkFJLXBvd2VyZWQgRmVhdHVyZXM8L3RleHQ+CgogIDwhLS0gS2FtaXdhemEgU2VjdGlvbiAtLT4KICA8cmVjdCB4PSI0MDAiIHk9IjUwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgcng9IjEwIiBmaWxsPSIjNENBRjUwIiBmaWxsLW9wYWNpdHk9IjAuMSIgc3Ryb2tlPSIjNENBRjUwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSI1NTAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM0Q0FGNTAiPkthbWl3YXphIFBsYXRmb3JtPC90ZXh0PgogIAogIDwhLS0gS2FtaXdhemEgTW9kZWxzIC0tPgogIDxyZWN0IHg9IjQ1MCIgeT0iMTAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjNENBRjUwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSI1NTAiIHk9IjEzNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5TZWxmLWhvc3RlZCBNb2RlbHM8L3RleHQ+CiAgPHRleHQgeD0iNTUwIiB5PSIxNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+TGxhbWEtMy4yLCBRd2VuLCBldGMuPC90ZXh0PgoKICA8IS0tIE9wZW5BSSBTZWN0aW9uIC0tPgogIDxyZWN0IHg9IjQwMCIgeT0iMjUwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgcng9IjEwIiBmaWxsPSIjMDBBNjdFIiBmaWxsLW9wYWNpdHk9IjAuMSIgc3Ryb2tlPSIjMDBBNjdFIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSI1NTAiIHk9IjI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMDBBNjdFIj5PcGVuQUk8L3RleHQ+CiAgPHRleHQgeD0iNTUwIiB5PSIzMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+R1BULTRvLCBvMTwvdGV4dD4KCiAgPCEtLSBBbnRocm9waWMgU2VjdGlvbiAtLT4KICA8cmVjdCB4PSI0MDAiIHk9IjM4MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCIgZmlsbD0iIzZCNDhGRiIgZmlsbC1vcGFjaXR5PSIwLjEiIHN0cm9rZT0iIzZCNDhGRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHRleHQgeD0iNTUwIiB5PSI0MTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzZCNDhGRiI+QW50aHJvcGljPC90ZXh0PgogIDx0ZXh0IHg9IjU1MCIgeT0iNDUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkNsYXVkZSAzLjUgU29ubmV0PC90ZXh0PgoKICA8IS0tIEFycm93cyAtLT4KICA8IS0tIFRvIEthbWl3YXphIC0tPgogIDxwYXRoIGQ9Ik0gMjUwLDIzMCBMIDM1MCwxNDAgTCA0NDAsMTQwIiBzdHJva2U9IiM0Q0FGNTAiIHN0cm9rZS13aWR0aD0iMiIgbWFya2VyLWVuZD0idXJsKCNhcnJvd2hlYWQpIiBmaWxsPSJub25lIi8+CiAgCiAgPCEtLSBUbyBPcGVuQUkgLS0+CiAgPHBhdGggZD0iTSAyNTAsMjUwIEwgMzUwLDMwMCBMIDQ0MCwzMDAiIHN0cm9rZT0iIzAwQTY3RSIgc3Ryb2tlLXdpZHRoPSIyIiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93aGVhZCkiIGZpbGw9Im5vbmUiLz4KICAKICA8IS0tIFRvIEFudGhyb3BpYyAtLT4KICA8cGF0aCBkPSJNIDI1MCwyNzAgTCAzNTAsNDMwIEwgNDQwLDQzMCIgc3Ryb2tlPSIjNkI0OEZGIiBzdHJva2Utd2lkdGg9IjIiIG1hcmtlci1lbmQ9InVybCgjYXJyb3doZWFkKSIgZmlsbD0ibm9uZSIvPgoKICA8IS0tIENvZGUgU25pcHBldCBCb3ggLS0+CiAgPHJlY3QgeD0iNTAiIHk9IjMwIiB3aWR0aD0iMjgwIiBoZWlnaHQ9IjEyMCIgcng9IjUiIGZpbGw9IiMxRTFFMUUiLz4KICA8dGV4dCB4PSI2NSIgeT0iNTAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmYiPi8vIENob29zZSB5b3VyIHByb3ZpZGVyPC90ZXh0PgogIDx0ZXh0IHg9IjY1IiB5PSI3MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzRDQUY1MCI+Y29uc3Qga2FtaXdhemFDbGllbnQgPSBjcmVhdGVBSSh7PC90ZXh0PgogIDx0ZXh0IHg9Ijc1IiB5PSI4NSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzRDQUY1MCI+ICBiYXNlVVJMOiBrYW1pd2F6YUVuZHBvaW50PC90ZXh0PgogIDx0ZXh0IHg9IjY1IiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM0Q0FGNTAiPn0pOzwvdGV4dD4KICA8dGV4dCB4PSI2NSIgeT0iMTIwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMDBBNjdFIj5jb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKCk7PC90ZXh0PgogIDx0ZXh0IHg9IjY1IiB5PSIxNDAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjQ4RkYiPmNvbnN0IGFudGhyb3BpYyA9IG5ldyBBbnRocm9waWMoKTs8L3RleHQ+Cjwvc3ZnPg=="},8453:(e,i,n)=>{n.d(i,{R:()=>o,x:()=>l});var t=n(6540);const a={},I=t.createContext(a);function o(e){const i=t.useContext(I);return t.useMemo((function(){return"function"==typeof e?e(i):{...i,...e}}),[i,e])}function l(e){let i;return i=e.disableParentContext?"function"==typeof e.components?e.components(a):e.components||a:o(e.components),t.createElement(I.Provider,{value:i},e.children)}},5476:e=>{e.exports=JSON.parse('{"permalink":"/kamiwaza-docs/blog/2025/01/03/adding-kamiwaza-auth-and-models-to-your-app","source":"@site/blog/2025-01-03-adding-kamiwaza-auth-and-models-to-your-app.md","title":"Using Kamiwaza Authentication and Model Inferencing with Any AI Application","description":"How to integrate Kamiwaza\'s authentication and model inferencing into any AI application.","date":"2025-01-03T00:00:00.000Z","tags":[],"readingTime":4.635,"hasTruncateMarker":false,"authors":[],"frontMatter":{"title":"Using Kamiwaza Authentication and Model Inferencing with Any AI Application","description":"How to integrate Kamiwaza\'s authentication and model inferencing into any AI application.","date":"2025-01-03T00:00:00.000Z","image":"/img/blog/images/2025-01-03-kamiwaza-private-gpt.png"},"unlisted":false,"nextItem":{"title":"2024: A Year in Review for GenAI","permalink":"/kamiwaza-docs/blog/2024/12/31/a-year-in-review"}}')}}]);