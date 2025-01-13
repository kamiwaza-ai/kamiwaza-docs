---
title: "Agentic Computing is Here, Just Not Evenly Distributed"
description: "The future of computing is more personal and much more powerful. We are at an interesting stage presently where the capabilities of LLMs and the end-user experience are dramatically disconnected; a huge amount of engineering is yet to be done."
date: 2025-01-13
image: /img/blog/images/2025-01-13-swarm-of-agents.png
---
# Agentic Computing is Here, Just Not Evenly Distributed

The future of computing is more personal and much more powerful. We are at an interesting stage presently where the capabilities of LLMs and the end-user experience are dramatically disconnected; a huge amount of engineering is yet to be done.

This last week we were presenting on Agentic AI at the Rocky Mountain AI Interest Group.

We had a blast showing off Kamiwaza, and a bunch of cool agentic tools. One of those was STORM, from Stanford. It was fairly trivial to integrate with Kamiwaza. This meant I was able to use a reasonably high-quality model both on a hosted server or locally on my MBP (which is admittedly beefy, but we will see a lot more mega-powerful AI personal computing options soon, and there were audible gasps when I showed what it was doing under the hood, which involved the tool combing through literally hundreds of links to satisfy my request. Behind the scenes, I could confirm it - the tool that was doing search lookups retrieved over 900 search pages, navigating and slurping up that data.

![A browser pointed at localhost showing part of hundreds of links browser agentically](/img/blog/images/2025-01-13-storm-browser-links.png)

The end result of this process is a conversation among agentic experts:

![The STORM tool, showing conversations with various experts](/img/blog/images/2025-01-13-storm-experts.png)

The STORM tool uses persona-based processes. In this case, my simple query about cheeses which are similar to Manchego (a personal favorite), spawns a collection:

- Cultural Anthropologist
- Historian of Cheese  
- Basic Fact Writer
- Cheesemaker from La Mancha
- Cheese Sommelier
- Nutritionist

The AI agentically creates an interview/response style setup with each of these personas, integrating this huge body of retrieved content, in order to produce a final output.

![A Final Article (on cheeses similar to manchego) produced by STORM](/img/blog/images/2025-01-13-storm-final-article.png)

As a tech demo, this is super fun. I took a random topic from the audience and we watched it research and output as we talked and reviewed other demos. This is something extremely different from the "typical experience" of AI right now. This is no casual tool - using a model on a server capable of generating 1000+ tokens/sec, with the ability to comb through 900+ results on 90+ pages of searches, read and process hundreds of pages, and then generate hundreds of thousands of tokens of AI-powered discussion, you get a completely different outcome.

Even as a daily user of Perplexity, this is a "We Are Not the Same". I want to joke, "You want to see a real Pro Search? Let me show you what that really looks like."  Because as good as Perplexity is, it does not come anywhere near what I was able to run myself. By looking through >100x as many links, reading far more material, having a for more powerful (6 agent personas and an agentic interviewer!) process, I can a massively better outcome.

## What does this mean for the future of computing?

ChatGPT is an awesome tool. I remember being moved to wish it a happy birthday, and I don't think I've ever wanted to celebrate the birthday of a tool/service before in my life -- but ChatGPT gave people a bad impression about what AI could do. Because zero-shot queries to a model do not represent anything like the best; but they set the tone for what AI could, would, and should do. We are slowly moving away from that. But the world hasn't really grokked how powerful this can be - the personal acquisition, dissemination, and contextualization of knowledge in pursuit of our mental goals.

We got used to the idea long ago that the Internet was far too vast for us. We "surfed" our way through various links, following a web of interconnection. The underlying technology is still there, but one of the biggest trends of this for 30 years has been that of the aggregator. The first great aggregator in my mind was Yahoo. Their collections of links was of enormous value to users - and the ability to get into the Yahoo links equally powerful. There was a brief time when people when "AAA Widgets and Things" or "!! Double Bang Widgets and Things" was the sort of naming convention of choice to be on the top of those pages.

We had a host that followed - Google and Google News, Facebook, Twitter, Instagram, Pinterest. Of course beyond just links and images, there was aggregation of discussion too - Slashdot, Reddit, Quora and so on. Different takes on a theme - but the theme was to collect the content of the Internet and the contributions of users, repackage it for eyeballs, and sell the eyeballs to advertisers.

Fundamentally, this era is over. We won't see the decline for a while. But these things worked because they served the user. If you wanted News, Google News was great because you could peruse 10 headlines on a topic in a moment, grok the theme, drill down where you desired to. Facebook let you get a feed of things that people you knew were up to, and what they wanted to share. Twitter did the same with more anonymity and a less crowded format. Reddit let people form communities of interest and applied the wisdom of the crowd to the rankings.

What does it mean when you can proactively publish, sort, and retrieve information? 

Further, what does it mean when even the quality of sources is agentically rated? So you can algorithmically tailor things based on whatever your preferences are? It could be your version of trusted sources; or trusted sources of those you trust; it could be tone, topic. It could be based on assessments of academic rigor. And the feedback mechanisms could be as sticky as you wanted. Think source &lt;X&gt; is really frustrating? Block it, and your agent not only keeps it out of your feed, it keeps all the derivative material citing it out too.

Meanwhile, your agents can network with other agents, building a web of trust to promote and expose higher-quality content.

The old promotion of content was aggregation as a means of reaching users. Agentic AI potentially gives us the chance to, as a whole, promote content not because it belongs to the ideal "syndicate" but because it is - well, the best content.

In some ways, I blame the status quo on Google. They killed Google Reader, and Reader was a dominant RSS tool at the time. Bloglines was another, and it was having major issues and was overtaken by Reader. 

In a sense it's easy to potentially see why: Reader and similar tools lacked the social context. They were also noisy - because you were often "reading" RSS feeds which were sometimes hundreds of articles; perhaps some form of aggregation behind. A great example for me personally was the presence of BoingBoing on my feed. I felt like BoingBoing had a lot of great content, but the volume was pretty high and the content was pretty eclectic, so I was prone to "mark all read" without really processing it.

So we ultimately end up, even today, dealing with really crappy experiences just in terms of consuming content. We can:

- Select narrowly focused sources, peruse them manually or in batch, but they're disconnected largely from social experience
- Leverage social feeds, and suffer painfully bad signal:noise ratios

AI is going to put an end to this, by merging the social and the topical.

How? It's going to take niche sources (say, my interest in the excellent Semianalysis) and curate them. It won't just be a feed - it will be a feed that is further cut down by my interests. AI can pre-read, and it can:

- Curate: removing things that are from an interesting source but not an interesting (to me) topic
- Enrich: for things off the beaten path, it can anticipate my further interest and collect more data from dozens more sources
- Summarize: for things that are interesting but perhaps only in the macro, summarize for me
- Contextualize: it can remind me of other things. The longer I dwelled on something, or the more I like to share it/discuss it, the more it will want to contextualize around those topic clusters.

And more! But critically the future of AI and the Internet is much more proactive. If it follows that for many time is our most precious resource, the idea that AI will front-run our activities by a large margin is "obvious". We will swim through a sea of meeting notes, project plans, idea boards. The mission of AI in this will be to massively amplify our agency. Pull more in, filter it more tightly, leverage it more powerfully.

## Where is this vision?

Emerging rapidly. I mentioned STORM already with my own integration, but, there are similar tools.

NotebookLM is one of those tools sitting at the intersection of fun+useful. Take it a step further and imagine Notebook LM as selectively social, selectively search-oriented.

You see hints of this in Perplexity Spaces.

You see hardware vendors creating more tools that allow AI to be personal, unmetered, private - whether it's Apple and their Apple Intelligence (or simply the ability on a MBP to run fairly large models and the community that produces quantizations, whether for mlx or llamacpp), the nVidia DIGITS hardware, etc. The "arrows are pointed in the right direction" - models are getting smarter and cheaper, hardware is getting cheaper. The overall cost of "intelligence" has declined massively. 

There's still enormous amounts of engineering to be done here, and none of the hardware, software and models is where they probably ought to be for anything like a final form factor. That said, the ability to easily get a massive level-up on the experience of research combining open source + AI at the cost of pennies shows that we are still heading toward massive disruption of the status quo.

Depending on how the build-out goes, we may even see the return of some of the memes of web3 - the idea of a "new Internet" with less aggregation and more control to the end users could truly happen.

## The Long Tail of Possibility

There are a lot of strange side-effects that could emerge from this. If your agents knew your preferences, and your opinions about existing products, could your agents earn you money by participating on your behalf in user research groups so people could build better products? Could those cost less because your agent would bring you into the fold of awareness because it knew the product solved the problem better for you, saving that new business on advertising and customer acquisition?

It's interesting to consider how we might end up spending more on infrastructure (because search+agents will cost an order of magnitude more than just search) but have that spend be more virtuous (because it would not be products competing for your attention, they would be competing for your approval/endorsement - if a network of virally connected ai agents able to personalize everything can curry good news to you).

In terms of education, awareness, community - these things could all see a similar revolution. On the Kamiwaza.AI slack, we get notifications about interesting GitHub repositories that are trending that fit our interests:

![Slack notification showing trending GitHub repositories](/img/blog/images/2025-01-13-slack-trending.png)

When we continuously enrich, personalize, and contextualize everything we spend our time and energy on in this way, how much better are the outcomes?

## The Shameless Plug

Some of these concepts tie into why we are building Kamiwaza.AI - as a platform, we offer a way to normalize a lot of the developer experience of integrating software into a model inference ecosystem. Moreso, we are doing so in a data-conscious way, with a stack with the ability to understand what data lives where, who should be allowed to access it, with the ability to localize that access. When we recently wrote about integrating Kamiwaza.AI authentication and models into other tools with only a handful of lines of code, it was to show how easy it was to bring new tools "into the fold". While we are oriented around Enterprise use, we offer a community edition that is great for single systems or consumer devices (e.g., I run it constantly on my Macbook Pro - albeit the specs are a bit 'hungry' right now but we are slimming it down) - and it then allows the software to become more personal and portable. Model selection works across models, hardware platforms, inference engines - the exact same code would work in the same way. The authentication integration to Kamiwaza works across local, OAuth, or SAML.

In the future, we will show the same applied to data, so you can more easily see how to integrate private or semi-private enterprise data sources, but in a portable fashion.

But this isn't pure advocacy - because we remain keenly interested in seeing this vision realized for the world. The product is a means to an end, which is a smarter, more agile, more interconnected world.