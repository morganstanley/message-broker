"use strict";(self.webpackChunk_morgan_stanley_message_broker_gh_pages=self.webpackChunk_morgan_stanley_message_broker_gh_pages||[]).push([[993],{1369:function(e,n,a){var t=a(8453),s=a(6540);function o(e){const n=Object.assign({span:"span"},(0,t.RP)(),e.components);return s.createElement(s.Fragment,null,s.createElement(n.span,{dangerouslySetInnerHTML:{__html:'<div class="gatsby-highlight" data-language="bash"><pre class="language-bash"><code class="language-bash"><span class="token function">npm</span> <span class="token function">install</span> @morgan-stanley/message-broker</code></pre></div>'}}),"\n",s.createElement(n.span,{dangerouslySetInnerHTML:{__html:'<div class="gatsby-highlight" data-language="typescript"><pre class="language-typescript"><code class="language-typescript"><span class="token keyword">import</span> <span class="token punctuation">{</span>\n    messagebroker<span class="token punctuation">,</span>\n    IMessageBroker\n<span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">\'@morgan-stanley/message-broker\'</span>\n\n<span class="token keyword">interface</span> <span class="token class-name">IContracts</span> <span class="token punctuation">{</span>\n    myChannel<span class="token operator">:</span> <span class="token punctuation">{</span>\n        payload<span class="token operator">:</span> <span class="token builtin">string</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n\n<span class="token keyword">const</span> broker<span class="token operator">:</span> IMessageBroker<span class="token operator">&lt;</span>IContracts<span class="token operator">></span>\n    <span class="token operator">=</span> <span class="token generic-function"><span class="token function">messagebroker</span><span class="token generic class-name"><span class="token operator">&lt;</span>IContracts<span class="token operator">></span></span></span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\nbroker<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">\'myChannel\'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span>message <span class="token operator">=></span> <span class="token punctuation">{</span>\n    <span class="token builtin">console</span><span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>message<span class="token punctuation">.</span>payload<span class="token punctuation">)</span>\n<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\nbroker<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token string">\'myChannel\'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">publish</span><span class="token punctuation">(</span><span class="token punctuation">{</span>\n    payload<span class="token operator">:</span> <span class="token string">\'My first message using the MessageBroker!\'</span>\n<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre></div>'}}))}n.A=function(e){void 0===e&&(e={});const{wrapper:n}=Object.assign({},(0,t.RP)(),e.components);return n?s.createElement(n,e,s.createElement(o,e)):o(e)}},3327:function(e,n,a){a.r(n),a.d(n,{Head:function(){return h},default:function(){return m}});var t=a(8453),s=a(6540),o=a(1369);function c(e){const n=Object.assign({p:"p",h4:"h4",a:"a",span:"span",strong:"strong",ul:"ul",li:"li"},(0,t.RP)(),e.components),{Hero:a,Article:c}=n;return c||p("Article",!0),a||p("Hero",!0),s.createElement(s.Fragment,null,s.createElement(a,{title:"Message Broker"},s.createElement(n.p,null,"The Message Broker is a Typescript library which aims to provide asynchronous\ncommunication between typescript components. It leverages the RxJS library to\nfacilitate a pub/sub pattern and accepts user-defined contracts to ensure type\nsafety across messages.")),"\n",s.createElement("section",{className:"content"},s.createElement(c,{title:"Background"},s.createElement(n.p,null,"This project was written at Morgan Stanley to provide an internal messaging system for large scale UI systems.\nThe project was later Open Sourced so others could benefit from it.")),s.createElement(c,{title:"Use cases"},s.createElement(n.p,null,"Here is an example of a usecase in which the Message Broker could be useful."),s.createElement(n.h4,{id:"notification-system",style:{position:"relative"}},s.createElement(n.a,{href:"#notification-system","aria-label":"notification system permalink",className:"anchor before"},s.createElement(n.span,{dangerouslySetInnerHTML:{__html:'<svg aria-hidden="true" focusable="false" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg>'}})),"Notification system"),s.createElement(n.p,null,"Let’s say you have some document uploading functionality in your UI.\nThe uploading may take up to a minute and you don’t want the user to have to wait, so once the upload is complete you want to have a pop-up notification appear which tells the user that their upload was successful."),s.createElement(n.p,null,"The code for your pop-up notification can live anywhere in your codebase, and can “listen” for a “document_uploaded” message using the MessageBroker.\nNow all that needs to happen is for the document upload service to publish that message when the upload completes."),s.createElement(n.p,null,s.createElement(n.strong,null,"Note:")," that with this model, our document uploading service doesn’t even have to know about the existence of the notification service, so everything is nice and decoupled."),s.createElement(n.h4,{id:"mediator-pattern",style:{position:"relative"}},s.createElement(n.a,{href:"#mediator-pattern","aria-label":"mediator pattern permalink",className:"anchor before"},s.createElement(n.span,{dangerouslySetInnerHTML:{__html:'<svg aria-hidden="true" focusable="false" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg>'}})),"Mediator Pattern"),s.createElement(n.p,null,"More generically, the Message Broker essentially acts as a ",s.createElement(n.a,{href:"https://refactoring.guru/design-patterns/mediator"},"Mediator")," for your components.\nAny time you would apply the Mediator pattern, the Message Broker is the perfect solution to avoid you some boilerplate coding.")),s.createElement(c,{title:"Alternatives"},s.createElement(n.p,null,"List of alternatives to the Message Broker."),s.createElement(n.ul,null,"\n",s.createElement(n.li,null,s.createElement(n.a,{href:"https://docs.bullmq.io"},"BullMQ"),"\n",s.createElement(n.ul,null,"\n",s.createElement(n.li,null,"Relies on Redis"),"\n"),"\n"),"\n",s.createElement(n.li,null,s.createElement(n.a,{href:"https://bus.node-ts.com"},"@node-ts/bus")),"\n"),s.createElement(n.p,null,"Both of these alternatives lack the same level of type safety that the Message Broker provides.")),s.createElement(c,{title:"Getting Started"},s.createElement(o.A))))}var l=function(e){void 0===e&&(e={});const{wrapper:n}=Object.assign({},(0,t.RP)(),e.components);return n?s.createElement(n,e,s.createElement(c,e)):c(e)};function p(e,n){throw new Error("Expected "+(n?"component":"object")+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}var r=a(392),i=a(2870);const u=e=>{let{data:n,location:a,children:t,pageContext:o}=e;return s.createElement(r.A,{data:n,location:a,menu:o.menu},s.createElement("div",{className:"main home-main"},t))};function m(e){return s.createElement(u,e,s.createElement(l,e))}const h=e=>{let{data:n,pageContext:a}=e;const t=`${n.site.siteMetadata.title}`;return s.createElement(i.A,{title:t},s.createElement("meta",{name:"description",content:a.description}))}}}]);
//# sourceMappingURL=component---node-modules-morganstanley-gatsby-theme-ms-gh-pages-src-templates-index-js-content-file-path-content-index-mdx-1cfa37b976219ed4369b.js.map