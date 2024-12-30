"use strict";(self.webpackChunkkamiwaza_docs=self.webpackChunkkamiwaza_docs||[]).push([[8391],{192:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>l,contentTitle:()=>s,default:()=>h,frontMatter:()=>o,metadata:()=>a,toc:()=>d});var a=i(5209),t=i(4848),r=i(8453);const o={},s="Harnessing the Power of Large Language Models: A Hardware Primer",l={authorsImageUrls:[]},d=[{value:"The Right Hardware for the Right Task: Starting Your AI Journey",id:"the-right-hardware-for-the-right-task-starting-your-ai-journey",level:2},{value:"Nvidia with Linux: The Leading Choice for AI",id:"nvidia-with-linux-the-leading-choice-for-ai",level:3},{value:"Optimal for High-Performance AI Tasks",id:"optimal-for-high-performance-ai-tasks",level:4},{value:"Considerations",id:"considerations",level:4},{value:"Apple OSX with Metal: Seamless Integration for Mac Developers",id:"apple-osx-with-metal-seamless-integration-for-mac-developers",level:3},{value:"Best for Integrated Apple Ecosystems",id:"best-for-integrated-apple-ecosystems",level:4},{value:"Considerations",id:"considerations-1",level:4},{value:"Windows Environments",id:"windows-environments",level:3},{value:"Versatile but with Nuanced Support",id:"versatile-but-with-nuanced-support",level:4},{value:"Understanding Model Scales: From SLM to LLM",id:"understanding-model-scales-from-slm-to-llm",level:2},{value:"Small Language Models (SLM) &amp; Developer Systems",id:"small-language-models-slm--developer-systems",level:3},{value:"Large Language Models (LLM)",id:"large-language-models-llm",level:3},{value:"Decoding Performance Metrics: Token Speed and VRAM",id:"decoding-performance-metrics-token-speed-and-vram",level:2},{value:"Advancements in Model Efficiency",id:"advancements-in-model-efficiency",level:2},{value:"Comprehensive Approach to AI Application Stack",id:"comprehensive-approach-to-ai-application-stack",level:2},{value:"Bottom Line Recommendations",id:"bottom-line-recommendations",level:2},{value:"nVidia",id:"nvidia",level:3},{value:"Other nVidia Hardware",id:"other-nvidia-hardware",level:3},{value:"Cloud vs Owned and Operated",id:"cloud-vs-owned-and-operated",level:2}];function c(e){const n={a:"a",em:"em",h2:"h2",h3:"h3",h4:"h4",img:"img",li:"li",ol:"ol",p:"p",strong:"strong",ul:"ul",...(0,r.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.p,{children:"Welcome to an illuminating journey through the world of hardware essentials for deploying and leveraging Large Language Models (LLMs). In this era of generative AI, the right hardware is not just an operational need; it\u2019s a strategic asset that can drastically elevate the performance, scalability, and efficiency of your AI applications. Whether you are integrating AI into your enterprise solutions or enhancing existing applications, understanding the interplay between hardware and AI capabilities is fundamental. Let's dive into the crucial hardware considerations that can help you kickstart and scale your AI initiatives effectively."}),"\n",(0,t.jsx)(n.h2,{id:"the-right-hardware-for-the-right-task-starting-your-ai-journey",children:"The Right Hardware for the Right Task: Starting Your AI Journey"}),"\n",(0,t.jsx)(n.p,{children:"Before diving into specifics, it's essential to understand why selecting the right hardware is critical for proving the value of AI in your business. The hardware you choose impacts everything from development speed to operational efficiency and scalability. It serves as the launching pad for your AI projects, setting the tone for innovation and performance outcomes."}),"\n",(0,t.jsx)(n.h3,{id:"nvidia-with-linux-the-leading-choice-for-ai",children:"Nvidia with Linux: The Leading Choice for AI"}),"\n",(0,t.jsx)(n.h4,{id:"optimal-for-high-performance-ai-tasks",children:"Optimal for High-Performance AI Tasks"}),"\n",(0,t.jsx)(n.p,{children:"Nvidia GPUs, running on a Linux operating system, are a common sight in the world of AI hardware, largely due to Nvidia's significant market share and proven track record in AI applications. This combination is highly scalable, perfect for server setups where expansion is anticipated, and offers robust AI support with superior CUDA support for intensive computations."}),"\n",(0,t.jsx)(n.h4,{id:"considerations",children:"Considerations"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Driver Compatibility:"})," Linux requires careful management of GPU drivers and CUDA versions, which can be challenging in rapidly evolving setups."]}),"\n"]}),"\n",(0,t.jsx)(n.h3,{id:"apple-osx-with-metal-seamless-integration-for-mac-developers",children:"Apple OSX with Metal: Seamless Integration for Mac Developers"}),"\n",(0,t.jsx)(n.h4,{id:"best-for-integrated-apple-ecosystems",children:"Best for Integrated Apple Ecosystems"}),"\n",(0,t.jsx)(n.p,{children:"For developers already embedded in the Apple ecosystem, OSX with Metal provides a streamlined performance pathway. Metal API is tailored to optimize AI operations specifically on Apple hardware, leveraging shared memory capabilities and accommodating large RAM sizes which are integral for complex AI tasks."}),"\n",(0,t.jsx)(n.h4,{id:"considerations-1",children:"Considerations"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Limited GPU Support:"})," Apple hardware typically does not support external GPUs as flexibly as PC setups, limiting performance scalability."]}),"\n"]}),"\n",(0,t.jsx)(n.h3,{id:"windows-environments",children:"Windows Environments"}),"\n",(0,t.jsx)(n.h4,{id:"versatile-but-with-nuanced-support",children:"Versatile but with Nuanced Support"}),"\n",(0,t.jsxs)(n.p,{children:["Windows has long been a first class citizen for nVidia drivers due to its heritage in gaming. Indeed, nVidia has even release a ",(0,t.jsx)(n.a,{href:"https://blogs.nvidia.com/blog/chat-with-rtx-available-now/",children:"Chat With RTX"})," local LLM/RAG app; the problem with Windows for Enterprise is that it can be much more challenging to see the direct path between development and production due to the large OS deltas. One reason Kamiwaza opted to build and support OSX hand-in-hand with Linux as a production environment was that the support on OSX was nearly like-for-like, providing a very consistent development -> production experience."]}),"\n",(0,t.jsx)(n.h2,{id:"understanding-model-scales-from-slm-to-llm",children:"Understanding Model Scales: From SLM to LLM"}),"\n",(0,t.jsxs)(n.p,{children:["Before discussing specific models, it's crucial to understand what a \"model\" in AI parlance means. Essentially, the term refers to the underlying AI that has been trained to understand and generate human-like text based on the data it has been fed. Models are measured in parameters\u2014a parameter being a piece of the model that has learned a specific part of the data during training. The scale of the model, from Small Language Models (SLMs) like Google's Gemma-2B, to an optimized open source 7B model like ",(0,t.jsx)(n.a,{href:"https://huggingface.co/teknium/OpenHermes-2.5-Mistral-7B",children:"OpenHermes-2.5-Mistral-7B"})," for drafting emails, to Large Language Models (LLMs) like HuggingFace\u2019s Zephyr-Orpo 141B, a fine-tuning of Mistral Mixtral-8x22B models."]}),"\n",(0,t.jsx)(n.h3,{id:"small-language-models-slm--developer-systems",children:"Small Language Models (SLM) & Developer Systems"}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Hardware Needs:"})," Can run efficiently on consumer-grade laptops or desktops typically; and even, depending on the hardware, directly on consumer mobile devices. Qualcomm announced in early 2023 a working version of Stable Diffusion ",(0,t.jsx)(n.a,{href:"https://www.qualcomm.com/news/onq/2023/02/worlds-first-on-device-demonstration-of-stable-diffusion-on-android",children:"on an Android phone"}),". That said, for prototyping we recommend either Macbook M* with ample RAM (the M2MAX/M3 Macbook Pros, or equivalent Mac desktops, are extremely popular with developers and other professionals, but with heavy RAM, 96-128GB, they can run extremely large models)."]}),"\n",(0,t.jsx)(n.h3,{id:"large-language-models-llm",children:"Large Language Models (LLM)"}),"\n",(0,t.jsx)(n.p,{children:"For larger models, heavy production use, you typically now want to turn to production-grade hardware. While the typical choice today is Linux servers with nVidia GPUs, there are a lot of alternatives here, including:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"CPU-based inference"})," on Intel AVX512-capable chips"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Qualcomm"})," ",(0,t.jsx)(n.a,{href:"https://www.qualcomm.com/products/technology/processors/cloud-artificial-intelligence/cloud-ai-100",children:"AI 100"})," series, with their AI 100 Pro and AI 100 Ultra, which are extremely powerful hardware with impressively low power consumption"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"AMD"})," ",(0,t.jsx)(n.a,{href:"https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html",children:"AMD Instinct"})," is AMD's answer to nVidia's dominance and sport impressively large VRAM and solid performance; but many caution around software support in newer libraries"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"nVidia"})," nVidia needs no introduction; their A100 and H100, with their upcoming GH200 and the recently announced ",(0,t.jsx)(n.a,{href:"https://nvidianews.nvidia.com/news/nvidia-blackwell-platform-arrives-to-power-a-new-era-of-computing",children:"Blackwell"})," GPUs starting with the B100. nVidia has reaped the boom of GenAI very notably with orgs like Meta announcing a buy of ",(0,t.jsx)(n.a,{href:"https://www.pcmag.com/news/zuckerbergs-meta-is-spending-billions-to-buy-350000-nvidia-h100-gpus",children:"350,000 H100s"}),", adding to an extremely large farm of GPUs already operated - this helps them attract and retain talent developing their in-house open-sourced LLMs, like ",(0,t.jsx)(n.a,{href:"https://llama.meta.com/llama2/",children:"Llama 2"}),", arguably the most influential open-source AI model ever released."]}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"decoding-performance-metrics-token-speed-and-vram",children:"Decoding Performance Metrics: Token Speed and VRAM"}),"\n",(0,t.jsx)(n.p,{children:"When selecting hardware for AI, understanding performance metrics is crucial. Token speed and VRAM stand out as primary indicators."}),"\n",(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.strong,{children:"Tokens/second"})," is just a metric of how fast a given model engine can generate output tokens. For a visual in-context view on model deployment and stress test, check out the ",(0,t.jsx)(n.a,{href:"https://www.youtube.com/watch?v=h4yyqfw9liY",children:"Kamiwaza Model Deployment and Inference Stress Test"})," video on YouTube."]}),"\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.img,{alt:"Tokens Per Second CLI readout",src:i(3914).A+"",width:"968",height:"119"})}),"\n",(0,t.jsx)(n.p,{children:"It's important to note that due to the way the hardware and software interact, there's a difference on many hardware platforms between the speed you would see in a single client generation (e.g., one prompt -> one response) vs batched. For example, in the image above, our stress test averaged almost 1200 tokens/second but the same card responding to a single request would likely only get ~40-60 tokens/second at best; but it can perform many parallel inferences when batching. Kamiwaza helps with model deployment to make this easier to manage."}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Model Size Impact:"})," Larger models, while capable of generating more complex texts, tend to operate more slowly due to their size. More ",(0,t.jsx)(n.strong,{children:"parameters"})," means more math operations for each pass through a model. You can think of it as a set of multiplication operations through dense matrices, each full pass popping out the next generated token based on the input context and probabilities in the neural network weights."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"VRAM Requirements"})," As a rule, you can think of memory requirements being driven by three things:"]}),"\n"]}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"The number of Parameters"}),': For a "70B" model, 70 billion parameters means 70 billion numbers in the neural network, effectively. Model models at "full weight" for inference at 16-bit, and you may see the term ',(0,t.jsx)(n.em,{children:"float16"})," or ",(0,t.jsx)(n.em,{children:"bfloat16"})," which are specific 2-byte data types. So a full-weight 70B model needs 140GB of memory to hold the weights. This number can be reduced through using a lower-precision model, through a technique called ",(0,t.jsx)(n.strong,{children:"quantization"}),' which is essentially a neural-network specific version of "rounding" the numbers; so instead of a 16-bit number, each weight becomes an 8-bit or a 4-bit weight. (And quantization has more variety than that, such as quantizing different layers to different weights, as some are more performance-sensitive to that rounding)']}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"The context"}),": The user input must be converted into numbers also, called an embedding, to be processed by the network; there is the direct usage of the embedding, but there is also intermediate calculations and caches; the usage of these varies by architecture.  There are some tools like this ",(0,t.jsx)(n.a,{href:"https://huggingface.co/spaces/NyxKrage/LLM-Model-VRAM-Calculator",children:"VRAM calculator on HuggingFace"})," that can help estimate; something like 1-2GB per 4096 input context tokens at a batch size of 512 isn't a terrible rule of thumb, but this varies quite a bit."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Added KV Cache for Performance"}),": Engines like vLLM (the default deployment engine Kamiwaza deploys on when using Linux) pre-allocate additional memory for KV cache; this can dramatically speed up performance. vLLM will happily pre-allocate an entire 80GB card even on a 7B parameter model (so, one you could definitely run easily at full weight even on a 24GB consumer card), but it doesn't need that much. Kamiwaza's default deployment configs can be modified but try to allocate a recommended amount of memory by default for a performance boost, without being excessively generous."]}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"advancements-in-model-efficiency",children:"Advancements in Model Efficiency"}),"\n",(0,t.jsx)(n.p,{children:"In the dynamic landscape of AI, continuous improvements are crucial for enhancing model performance and managing resource utilization effectively. Key techniques have emerged that not only boost computational efficiency but also optimize the overall functioning of AI models:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Quantization:"})," This technique transforms the model to operate on lower precision (e.g., 8-bit integers instead of 16-bit floats), which can significantly increase the speed of computations and reduce the overall model size. This is particularly beneficial in environments with limited hardware capabilities or where rapid response times are crucial."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Mixture of Depths:"})," Adapting the depth of the neural network layers according to the task complexity can optimize processing time and power consumption. This approach tailors the resource allocation based on the immediate needs of the application, ensuring efficient use of computational power."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Dynamic Pruning:"})," By temporarily reducing the size of the neural network during computations, dynamic pruning helps conserve resources without a notable compromise in performance. This method is particularly useful in runtime environments where flexibility in resource allocation can lead to cost efficiencies."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"These techniques represent the forefront of making large-scale models more accessible and manageable, paving the way for broader adoption across various industries."}),"\n",(0,t.jsx)(n.h2,{id:"comprehensive-approach-to-ai-application-stack",children:"Comprehensive Approach to AI Application Stack"}),"\n",(0,t.jsx)(n.p,{children:"Implementing LLMs effectively requires a comprehensive understanding and integration of multiple components of the AI application stack. This holistic approach ensures that each layer is optimized for maximum performance and efficiency:"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Hardware:"})," The foundational layer, which includes high-performance GPUs and CPUs, tailored to the needs of demanding AI tasks."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Operating System:"})," Choosing the right OS\u2014whether it be Linux, OSX, or Windows\u2014is crucial as it must synergize with the hardware to optimize performance and provide stability."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Model Engine:"})," Utilizing advanced frameworks like TensorFlow or PyTorch, which are designed to leverage the underlying hardware capabilities to the fullest."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"Application-Level Packages:"})," Tools such as LangChain and dSPY provide specialized functionalities that are essential for developing sophisticated AI applications. They serve as the building blocks for creating user-centric solutions that harness the power of LLMs."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"With a solid grasp of these components, organizations can navigate the complexities of AI deployment more confidently, ensuring that their AI initiatives are both scalable and robust."}),"\n",(0,t.jsx)(n.h2,{id:"bottom-line-recommendations",children:"Bottom Line Recommendations"}),"\n",(0,t.jsx)(n.p,{children:'These are "inference only" recommendations; for training, there may be other considerations.'}),"\n",(0,t.jsx)(n.h3,{id:"nvidia",children:"nVidia"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"At least 3 hosts for redundancy for Enterprise"}),"\n",(0,t.jsx)(n.li,{children:"Homogenous hardware config for cpu/gpu/memory; Kamiwaza can deploy multiple models on larger cards"}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"RTX4090"})," is often at performance parity with the datacenter A100 card for inference; they have 24GB of memory per card\n-- You can find deployment options fairly standard for configs of up to 6x4090, giving 192GB of VRAM\n-- Being a consumer card, the RTX4090 can typically be found at ~$2k/card, meaning the 6x setup is favorable vs a single A100 datacenter card"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.strong,{children:"A100, H100"}),' are the kings of the "available" datacenter-class hardware\n-- You can build single hosts at up to 8x\n-- They come in PCEe and SXM form factors\n-- Both very widely available in cloud instances\n-- 40GB and 80GB VRAM versions\n-- Relatively expensive hardware (as of this writing, a single A100 80GB is still about $17,000, just for 1 card); although prices have been coming down lately\n-- For the most powerful open models, 4x or more can be required. For example, the recently released Apache-licensed ',(0,t.jsx)(n.a,{href:"https://huggingface.co/mistral-community/Mixtral-8x22B-v0.1",children:"Mixtral-8x22B-v0.1 model"})," requires ",(0,t.jsx)(n.strong,{children:"~260GB"})," of VRAM to load the full-weight (non-quanitzied) version, plus memory for kv cache, and input context; this means this model can largely consume a ",(0,t.jsx)(n.strong,{children:"4xA100-80B"})," setup on its own. Commensurately, however, fine-tunes such as the ",(0,t.jsx)(n.a,{href:"https://huggingface.co/microsoft/WizardLM-2-8x22B",children:"Microsoft WizardLM fine-tune"})," are stronger than the original GPT4 model, which combined with its 64K context length makes it comparable to being able to operate a completely private GPT4-class model\n-- In the middle ground, many organizations will find that base or fine-tuned version of models like ",(0,t.jsx)(n.a,{href:"https://huggingface.co/mistralai/Mixtral-8x7B-v0.1",children:"Mixtral-8x7B"})," or ",(0,t.jsx)(n.a,{href:"https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct",children:"DeepSeek-Coder-33B"})," will be appropriate; possibly at any weights from the full weight (using a single A100) to a strong 4-5 bit quantization (which can run on a single RTX4090, or locally on a well-equippted mac/macbook pro)."]}),"\n"]}),"\n",(0,t.jsx)(n.h3,{id:"other-nvidia-hardware",children:"Other nVidia Hardware"}),"\n",(0,t.jsx)(n.p,{children:'As a footnote, there are a number of other cards that share similar architectures; for example, the nVidia Ada architecture powers the RTX4xxx series, but also the "pro" cards, like the RTX6000, as well the L40, sport (up to) 48GB of memory. Those can be reasonable choices as well.'}),"\n",(0,t.jsx)(n.p,{children:"For the curious, the highest-end cards, like the A100 and H100, excel at 32-bit workloads, which is why classic model training happens almost exclusively on them, as they offer the mix of large memory and good performance at high precision; this is an extremely different workload than run of the mill inference."}),"\n",(0,t.jsx)(n.h2,{id:"cloud-vs-owned-and-operated",children:"Cloud vs Owned and Operated"}),"\n",(0,t.jsx)(n.p,{children:"We find our customers anywhere on the spectrum of:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Open to Cloud, but want to control the stack: fine to use cloud instances, and Kamiwaza is cloud-deployable easily; in fact, we have a fully-scripted install that is tested on Microsoft Azure for releases, against Ubuntu 22.04LTS-Server"}),"\n",(0,t.jsx)(n.li,{children:"Cloud ok for Test-Dev: They have use cases they want running on owned/operated hardware, but they will test on cloud instances"}),"\n",(0,t.jsx)(n.li,{children:"Owned & Operated only: The enterprise wants to keep their entire flow private on hardware and software they control, for a variety of reasons"}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Obviously cloud, even using spot instances, can be a good way to do some early testing on certain models or use cases without a purchase."})]})}function h(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(c,{...e})}):c(e)}},3914:(e,n,i)=>{i.d(n,{A:()=>a});const a=i.p+"assets/images/blog_tokens_sec-0c9e365f52edc8c6855b0e73e0b620dd.png"},8453:(e,n,i)=>{i.d(n,{R:()=>o,x:()=>s});var a=i(6540);const t={},r=a.createContext(t);function o(e){const n=a.useContext(r);return a.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function s(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:o(e.components),a.createElement(r.Provider,{value:n},e.children)}},5209:e=>{e.exports=JSON.parse('{"permalink":"/kamiwaza-docs/blog/2024/04/15/a-primer-on-GenAI-hardware","source":"@site/blog/2024-04-15-a-primer-on-GenAI-hardware.md","title":"Harnessing the Power of Large Language Models: A Hardware Primer","description":"Welcome to an illuminating journey through the world of hardware essentials for deploying and leveraging Large Language Models (LLMs). In this era of generative AI, the right hardware is not just an operational need; it\u2019s a strategic asset that can drastically elevate the performance, scalability, and efficiency of your AI applications. Whether you are integrating AI into your enterprise solutions or enhancing existing applications, understanding the interplay between hardware and AI capabilities is fundamental. Let\'s dive into the crucial hardware considerations that can help you kickstart and scale your AI initiatives effectively.","date":"2024-04-15T00:00:00.000Z","tags":[],"readingTime":11.375,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false}')}}]);