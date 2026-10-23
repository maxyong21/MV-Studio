import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Check, Code2, Database, Github, Globe2, HeartHandshake, Home as HomeIcon, Layers3, Linkedin, Mail, Menu, Moon, Pencil, Plus, Search, ShieldCheck, Sparkles, Sun, Trash2, X, Zap } from 'lucide-react';
import { fallbackContent } from './content.js';
import { isSupabaseConfigured,loadPublicContent,submitEnquiry } from './public-api.js';
import {sortRows,money,normalizeContactList,normalizeSiteContent,publicHref} from './lib/site.js';
import {estimateFeatures,validateContact} from '../supabase/functions/_shared/enquiry.mjs';
import InlineFieldError from './components/InlineFieldError.jsx';
import SmartImage from './components/SmartImage.jsx';
import Launcher from './chatbot/Launcher.jsx';
import Availability,{PublicBoundary} from './components/Availability.jsx';
import Analytics from './components/Analytics.jsx';
import Promotion from './components/Promotion.jsx';
import {eligiblePromotion} from './lib/promotions.mjs';
import {trackEvent} from './lib/analytics.mjs';
import {emptyPublicContent,hasPublicContent,publicFailure} from './lib/availability.mjs';
const Admin=lazy(()=>import('./admin/Admin.jsx'));

function youtubeEmbed(url){try{const parsed=new URL(url);const host=parsed.hostname.replace(/^www\./,'');const isYoutube=host==='youtube.com'||host.endsWith('.youtube.com');const id=host==='youtu.be'?parsed.pathname.slice(1):isYoutube?(parsed.searchParams.get('v')||parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]):null;return id?`https://www.youtube-nocookie.com/embed/${id}`:null;}catch{return null;}}
function ProjectDemoVideo({url}){if(!url)return null;const embed=youtubeEmbed(url);return <figure className="project-demo-video">{embed?<iframe src={embed} title="Project video demo" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>:<video src={url} controls preload="metadata">Your browser does not support video playback.</video>}</figure>;}

function useSiteData(initialData,enabled=true) {
  const [data,setData]=useState(initialData||emptyPublicContent()),[loading,setLoading]=useState(!initialData&&isSupabaseConfigured),[error,setError]=useState(initialData?.__availability==='maintenance'?new Error('Initial content unavailable'):null);
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    if(!enabled)return;
    const id=++generation.current;
    if(!isSupabaseConfigured){setData(emptyPublicContent());setLoading(false);setError(null);return;}
    setLoading(true);
    try{const next=await loadPublicContent();if(id!==generation.current)return;setData(next);setError(null);}
    catch(failure){if(id===generation.current)setError(failure);}
    finally{if(id===generation.current)setLoading(false);}
  },[enabled]);
  useEffect(()=>{reload();return()=>{generation.current++;};},[reload]);
  const availability=error?'maintenance':hasPublicContent(data)?'ready':loading?'loading':'coming-soon';
  return {data,loading,error,reload,availability};
}
function App({initialData}){
  const {pathname,hash}=useLocation(),site=useSiteData(initialData,pathname!=='/admin');
  useEffect(()=>{if(!hash||site.availability!=='ready')return;requestAnimationFrame(()=>document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());},[pathname,hash,site.availability]);
  const publicPage=children=><PublicBoundary key={pathname}>{site.availability==='ready'?children:<Availability kind={site.availability} onRetry={site.availability==='maintenance'?site.reload:undefined} busy={site.loading}/>}</PublicBoundary>;
  return <><Analytics path={pathname} enabled={site.availability==='ready'&&(pathname==='/'||(site.data.projects||[]).some(project=>pathname===`/projects/${project.id}`))}/><Routes><Route path="/" element={publicPage(<Home {...site}/>)} /><Route path="/projects/:id" element={publicPage(<ProjectDetails {...site}/>)} /><Route path="/admin" element={<Suspense fallback={<div className="admin-loading" role="status">Opening studio workspace...</div>}><Admin /></Suspense>} /><Route path="*" element={<NotFoundPage/>} /></Routes>{site.availability==='ready'&&(pathname==='/'||(site.data.projects||[]).some(project=>pathname===`/projects/${project.id}`))&&<Launcher/>}</>;
}

function NotFoundPage({project=false}){
  const navigate=useNavigate();const [seconds,setSeconds]=useState(6);
  useEffect(()=>{document.title=project?'Project not found | MV Studio':'Page not found | MV Studio';let robots=document.head.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}robots.content='noindex,follow';const tick=window.setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);const redirect=window.setTimeout(()=>navigate('/',{replace:true}),6000);return()=>{window.clearInterval(tick);window.clearTimeout(redirect);};},[navigate,project]);
  return <main className="not-found-page"><div className="not-found-orbit orbit-a"/><div className="not-found-orbit orbit-b"/><div className="not-found-content"><Link className="brand not-found-brand" to="/"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><div className="not-found-art" aria-hidden="true"><span className="not-found-spark spark-left">✳</span><span className="not-found-404">404</span><span className="not-found-spark spark-right">✳</span><span className="not-found-orbit-line"/></div><span className="section-overline"><i className="not-found-dot"/> {project?'PROJECT NOT FOUND':'PAGE NOT FOUND'}</span><h1>{project?'This project may have moved.':'Looks like you took a wrong turn.'}</h1><p>The page you’re looking for may have moved or no longer exists. We’ll take you back to the homepage in <strong>{seconds}</strong> seconds.</p><Link className="button button-dark" to="/"><HomeIcon size={16}/> Back to home <ArrowRight size={15}/></Link><div className="redirect-track" aria-label={`Redirecting in ${seconds} seconds`}><span/></div><small>Redirecting automatically</small></div></main>;
}

function Home({data,loading,error}){
  const [menuOpen,setMenuOpen]=useState(false),[dark,setDark]=useState(false),[toast,setToast]=useState(''),[offerRequest,setOfferRequest]=useState(0);
  const offerTrigger=useRef(null);
  const hasOffer=Boolean(eligiblePromotion(data.promotions));
  const openOffer=event=>{offerTrigger.current=event.currentTarget;setMenuOpen(false);setOfferRequest(value=>value+1);};
  const restoreOfferFocus=useCallback(()=>{const trigger=offerTrigger.current;offerTrigger.current=null;if(trigger)requestAnimationFrame(()=>{if(trigger.getClientRects().length)trigger.focus();else document.querySelector('.mobile-menu')?.focus();});},[]);
  const content=normalizeSiteContent(data.site_content?.content||fallbackContent.site_content.content);
  const primaryEmail=content.contact_emails[0]||'';
  const primaryPhone=content.contact_phones[0]||'';
  const services=sortRows(data.services),projects=sortRows(data.projects),team=sortRows(data.team_members);
  useEffect(()=>{try{setDark(localStorage.getItem('mv-theme')==='dark');}catch{}},[]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('mv-theme',dark?'dark':'light');}catch{}},[dark]);
  useEffect(()=>{
    const targets=document.querySelectorAll('.intro-section .value-item,.work-card,.service-card,.process-grid article,.care-strip,.team-card,.enquiry-form');
    if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});
    targets.forEach((target,index)=>{target.classList.add('reveal-on-scroll');target.style.setProperty('--reveal-delay',`${(index%4)*65}ms`);observer.observe(target);});
    return()=>{observer.disconnect();targets.forEach(target=>target.classList.remove('reveal-on-scroll'));};
  },[data.projects,data.services,data.team_members]);
  useEffect(()=>{const update=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;document.documentElement.style.setProperty('--scroll-progress',max>0?`${window.scrollY/max}`:'0');};update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};},[]);
  useEffect(()=>{
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,'');
    const title=content.seo_title||'Web Design & Development for Small Businesses | MV Studio';
    const description=content.seo_description||content.hero_description;
    const priceValues=services.map(service=>service.price).filter(price=>price!==null&&price!==''&&Number.isFinite(Number(price))).map(Number);
    document.title=title;
    const setMeta=(selector,attribute,value)=>{let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');const [key,name]=attribute;node.setAttribute(key,name);document.head.appendChild(node);}node.setAttribute('content',value||'');};
    setMeta('meta[name="description"]',['name','description'],description);
    setMeta('meta[name="robots"]',['name','robots'],'index,follow,max-image-preview:large');
    setMeta('meta[property="og:title"]',['property','og:title'],title);
    setMeta('meta[property="og:description"]',['property','og:description'],description);
    setMeta('meta[property="og:url"]',['property','og:url'],`${base}/`);
    setMeta('meta[property="og:image"]',['property','og:image'],new URL('/aphome.png',`${base}/`).href);
    let canonical=document.head.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}canonical.href=`${base}/`;
    const structured={
      '@context':'https://schema.org','@graph':[
        {'@type':'ProfessionalService','@id':`${base}/#studio`,name:'MV Studio',url:`${base}/`,description,areaServed:{'@type':'Country',name:'Malaysia'},email:primaryEmail||undefined,telephone:primaryPhone||undefined,priceRange:priceValues.length?`RM ${Math.min(...priceValues)}–RM ${Math.max(...priceValues)}+`:undefined,knowsAbout:services.map(service=>service.name)},
        {'@type':'ItemList','@id':`${base}/#portfolio`,name:'MV Studio selected projects',itemListElement:projects.map((project,index)=>({'@type':'ListItem',position:index+1,item:{'@type':'CreativeWork',name:project.name,headline:project.seo_title||undefined,description:project.seo_description||project.summary,url:`${base}/projects/${encodeURIComponent(project.id)}`,image:project.image_url?new URL(project.image_url,`${base}/`).href:undefined}}))}
      ]
    };
    let jsonLd=document.getElementById('mv-studio-jsonld');if(!jsonLd){jsonLd=document.createElement('script');jsonLd.id='mv-studio-jsonld';jsonLd.type='application/ld+json';document.head.appendChild(jsonLd);}jsonLd.textContent=JSON.stringify(structured);
  },[content,services,projects]);
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(''),2200);};
  return <>
    <a className="skip-link" href="#home">Skip to main content</a>
    <div className="scroll-progress" aria-hidden="true"/>
    <header className="site-nav"><div className="nav-inner"><a className="brand" href="#home" aria-label="MV Studio home"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></a>
      <nav className={menuOpen?'nav-links open':'nav-links'} id="site-navigation" aria-label="Main navigation">{[['Studio','#studio'],['Work','#work'],['Services','#services'],['Contact','#contact']].map(([label,href])=><a key={href} onClick={()=>setMenuOpen(false)} href={href}>{label}</a>)}{hasOffer&&<button type="button" className="nav-offers" aria-haspopup="dialog" onClick={openOffer}>Offers</button>}</nav>
      <div className="nav-end"><button className="icon-button theme-button" onClick={()=>setDark(!dark)} aria-label="Toggle colour theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button><a className="button button-dark nav-cta" href="#enquiry">Start a project <ArrowRight size={15}/></a><button className="icon-button mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label={menuOpen?'Close navigation':'Open navigation'} aria-expanded={menuOpen} aria-controls="site-navigation">{menuOpen?<X/>:<Menu/>}</button></div>
    </div></header>
    <main id="home" tabIndex={-1}>
      <section className="hero"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/>{content.hero_eyebrow}</div><h1>{content.hero_title}</h1><p className="hero-lead">{content.hero_description}</p><div className="hero-actions"><a className="button button-dark" href="#contact">{content.hero_cta} <ArrowUpRight size={16}/></a><a className="text-link" href="#work">Explore our work <ArrowDown size={15}/></a></div><div className="hero-proof"><div className="avatar-stack">{team.slice(0,2).map(member=><SmartImage key={member.id} record={member} alt="" sizes="36px" priority/>)}</div><span>Small team. Thoughtful work.<br/><strong>Built together with you.</strong></span></div></div>
      <div className="hero-art" aria-label="A glimpse at MV Studio work"><div className="art-note note-top"><span className="note-dot"/>Made with intention</div><div className="art-window"><div className="window-top"><span/><span/><span/><b>your-next-big-thing.my</b><i>↗</i></div><div className="window-body"><div className="window-brand">GOOD<span>FORM</span><div>MENU&nbsp; ☰</div></div><div className="window-copy"><small>MADE FOR THE EVERYDAY</small><strong>Make room<br/>for <em>better.</em></strong><span>Thoughtful design for the way you live.</span><button>Discover the collection&nbsp; ↗</button></div><div className="window-sticker">DESIGNED<br/>TO GROW <ArrowUpRight size={18}/></div><div className="window-shape shape-a"/><div className="window-shape shape-b"/></div></div><div className="art-float float-code"><Code2 size={17}/><span>Clean code<br/><b>Clear thinking</b></span></div><div className="art-float float-spark"><Sparkles size={19}/></div><div className="art-caption">A thoughtful first impression<br/><b>does a lot of heavy lifting.</b></div></div></div><div className="hero-bottom"><span>GOOD IDEAS DESERVE A GOOD HOME</span><div className="hero-tags"><span>Websites</span><i/> <span>Web apps</span><i/> <span>Digital systems</span></div></div></section>
      <section className="intro-section section-pad" id="studio"><div className="section-overline"><span>01</span> WHY MV STUDIO</div><div className="intro-layout"><h2>{content.about_title}</h2><div><p>{content.about_text}</p><a className="inline-link" href="#contact">A little more about us <ArrowUpRight size={15}/></a></div></div><div className="value-row"><div className="value-item"><span className="value-icon"><HeartHandshake/></span><div><b>Good people, close by</b><p>Work directly with the developers on your project.</p></div></div><div className="value-item"><span className="value-icon"><BadgeCheck/></span><div><b>Clear from day one</b><p>Know the scope, price, and next step before we start.</p></div></div><div className="value-item"><span className="value-icon"><Zap/></span><div><b>Made to move you forward</b><p>Useful digital work built around your real goals.</p></div></div></div></section>
      <section className="work-section section-pad" id="work"><div className="section-heading"><div><div className="section-overline"><span>02</span> SELECTED WORK</div><h2>Ideas made <em>real.</em></h2></div><p>A few things we’ve built with care, curiosity, and a lot of coffee.</p></div><div className="work-grid">{!projects.length&&<div className="public-section-placeholder"><strong>Coming soon.</strong>Our latest projects will be shared here.</div>}{projects.map((project,index)=><article className={`work-card work-${index+1}`} key={project.id}><Link className="work-image" to={`/projects/${project.id}`}><SmartImage record={project} alt={`${project.name} project preview`} sizes="(max-width:760px) 100vw, 50vw"/><span className="work-open"><ArrowUpRight/></span><span className="work-index">0{index+1}</span></Link><div className="work-meta"><div><span>{project.category}</span><h3><Link to={`/projects/${project.id}`}>{project.name}</Link></h3><p>{project.summary}</p><div className="tag-list">{(project.tags||[]).map(tag=><span key={tag}>{tag}</span>)}</div><div className="project-card-links"><Link to={`/projects/${project.id}`}>Project details <ArrowRight size={13}/></Link>{project.demo_url&&<a href={publicHref(project.demo_url)} target={project.demo_url.startsWith('http')?'_blank':undefined} rel="noreferrer">View demo <ArrowUpRight size={13}/></a>}</div></div><Link className="round-arrow" to={`/projects/${project.id}`} aria-label={`View ${project.name} details`}><ArrowUpRight size={17}/></Link></div></article>)}</div><div className="work-footnote"><span>Every project starts with a good conversation.</span><a href="#contact">Have one with us <ArrowRight size={14}/></a></div></section>
      <section className="services-section section-pad" id="services"><div className="section-heading"><div><div className="section-overline"><span>03</span> WHAT WE CAN DO</div><h2>Small business, <em>big potential.</em></h2></div><p>Thoughtful digital tools that meet you where you are and grow alongside you.</p></div>{hasOffer&&<div className="current-offer"><div><strong>A little extra for your next project.</strong><p>Revisit our current promotion whenever you like.</p></div><button type="button" className="button button-dark" aria-haspopup="dialog" onClick={openOffer}>View current offer <ArrowUpRight size={16}/></button></div>}<div className="service-grid">{!services.length&&<div className="public-section-placeholder"><strong>Coming soon.</strong>Our services are being prepared. Get in touch to discuss your project.</div>}{services.map((service,index)=><article className={`service-card ${index===1?'service-featured':''}`} key={service.id}><div className="service-top"><span>{service.category||`0${index+1} / SERVICE`}</span>{index===1&&<span className="popular-tag">A favourite</span>}</div><h3>{service.name}</h3><p>{service.summary}</p><div className="service-price"><strong>{money(service.price,service.currency)}</strong>{service.original_price&&<del>{money(service.original_price,service.currency)}</del>}<small>{service.price?'starting price':'tailored to you'}</small></div><ul>{(service.features||[]).map(feature=><li key={feature}><Check size={15}/>{feature}</li>)}</ul>{[service.scope,service.revisions,service.third_party_costs,service.maintenance_terms,service.support_terms,service.payment_terms].some(Boolean)&&<details className="package-details"><summary>Scope &amp; ongoing costs</summary><dl>{[["Scope",service.scope],["Revisions",service.revisions],["Third-party costs",service.third_party_costs],["Maintenance",service.maintenance_terms],["After-launch support",service.support_terms],["Payment",service.payment_terms]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}<div className="service-bottom"><span>{service.timeline}</span><a href="#enquiry">Let’s talk <ArrowUpRight size={15}/></a></div></article>)}</div><p className="package-disclosure">Starting prices cover the listed scope. We confirm delivery dates, revision limits, hosting, domain, maintenance, and payment terms in your proposal before work begins.</p><div className="care-strip"><div className="care-lead"><span className="care-icon"><ShieldCheck/></span><div><b>Good work, with a little extra care.</b><p>SEO-ready foundations, maintenance, and after-launch support can be included in your project scope.</p></div></div><a href="#contact">Ask us what fits <ArrowRight size={15}/></a></div></section>
      <section className="process-section section-pad" id="process"><div className="section-heading"><div><div className="section-overline"><span>04</span> HOW WE WORK</div><h2>Clear steps. <em>Good momentum.</em></h2></div><p>Building something new should feel exciting, not confusing. Here’s what working together looks like.</p></div><div className="process-grid">{[['01','Listen first','We get to know your business, the people you serve, and what success looks like.'],['02','Shape the idea','We map the right scope and share a clear proposal before development begins.'],['03','Build with you','You see progress along the way and help guide the details that matter.'],['04','Launch & support','We launch together, then stay available for the next improvements.']].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
      <section className="team-section section-pad"><div className="team-heading"><div><div className="section-overline"><span>05</span> THE PEOPLE BEHIND IT</div><h2>Small by design.<br/><em>Here for the details.</em></h2></div><p>We’re a close-knit team of developers who care about making your online presence work as hard as you do.</p></div><div className="team-grid">{!team.length&&<div className="public-section-placeholder"><strong>Coming soon.</strong>Meet the people behind the studio soon.</div>}{team.map(member=><article className="team-card" key={member.id}><div className="team-photo"><SmartImage record={member} alt={member.name} sizes="(max-width:420px) 100vw, (max-width:760px) 40vw, 420px"/><span><ArrowUpRight size={17}/></span></div><div><h3>{member.name}</h3><span>{member.role}</span><p>{member.bio}</p><div className="social-row">{member.linkedin_url&&<a href={member.linkedin_url} target="_blank" rel="noreferrer" aria-label={`${member.name} LinkedIn`}><Linkedin size={14}/></a>}{member.github_url&&<a href={member.github_url} target="_blank" rel="noreferrer" aria-label={`${member.name} GitHub`}><Github size={14}/></a>}{member.website_url&&<a href={member.website_url} target="_blank" rel="noreferrer" aria-label={`${member.name} website`}><Globe2 size={14}/></a>}</div></div></article>)}</div></section>
      <Testimonials rows={data.testimonials||[]}/>
      <FeatureRequestForm options={data.feature_options||[]} />
      <section className="contact-section section-pad" id="contact"><div className="contact-card"><div className="contact-top"><div className="section-overline"><span>06</span> YOUR NEXT CHAPTER</div><div className="contact-star">✳</div></div><h2>Let’s make<br/>something <em>matter.</em></h2><p>Tell us a little about what you have in mind. We’ll take it from there, together.</p><div className="contact-links">{(content.contact_emails||[]).map((email,index)=>email.trim()&&<a key={email} href={`mailto:${email.trim()}`}><Mail size={17}/><span>Email address</span><b>{email.trim()}</b><ArrowUpRight size={16}/></a>)}{(content.contact_phones||[]).map(phone=>phone.trim()&&<a key={phone} href={`tel:${phone.trim().replace(/[^+\d]/g,'')}`}><Globe2 size={17}/><span>Call us</span><b>{phone.trim()}</b><ArrowUpRight size={16}/></a>)}{primaryPhone&&<a href={`https://wa.me/${primaryPhone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><Globe2 size={17}/><span>WhatsApp</span><b>{primaryPhone}</b><ArrowUpRight size={16}/></a>}</div><a className="button button-dark contact-meeting" href="#enquiry">Request a short meeting <ArrowRight size={15}/></a></div><div className="contact-aside"><span>GOOD THINGS<br/>ARE BUILT<br/><em>TOGETHER.</em></span><Layers3 size={34}/><small>MV STUDIO · MALAYSIA</small></div></section>
    </main>
    <SiteFooter projects={projects} content={content}/>
    {loading&&<div className="loading-pill"><span/>Connecting to studio</div>}
    <Promotion items={data.promotions} menuOpen={menuOpen} openRequest={offerRequest} onDismiss={restoreOfferFocus}/>
    {toast&&<div className="toast-message">{toast}</div>}
  </>;
}

function Testimonials({rows}){const published=sortRows(rows).filter(row=>row.permission_confirmed);if(!published.length)return null;return <section className="testimonials-section section-pad" id="feedback"><div className="section-heading"><div><div className="section-overline">CLIENT FEEDBACK</div><h2>In our clients’ <em>words.</em></h2></div></div><div className="testimonial-grid">{published.map(row=><figure className="testimonial-card" key={row.id}><blockquote>“{row.quote}”</blockquote><figcaption><b>{row.name}</b><span>{[row.role,row.company_name].filter(Boolean).join(' · ')}</span>{row.project_url&&<a href={publicHref(row.project_url)}>View the related project <ArrowUpRight size={14}/></a>}</figcaption></figure>)}</div></section>;}

function SiteFooter({projects,content}){
  const {pathname}=useLocation();
  const sectionLink=id=>pathname==='/'?`#${id}`:`/#${id}`;
  const footerProjects=projects.filter(project=>project.show_in_footer).slice(0,4);
  const emails=normalizeContactList(content.contact_emails),phones=normalizeContactList(content.contact_phones);
  return <footer className="site-footer site-footer-full">
    <div className="site-footer-main">
      <div className="site-footer-brand"><a className="brand" href={sectionLink('home')}><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></a><p>Independent by nature.<br/>Collaborative by choice.</p><a className="footer-contact-cta" href={sectionLink('enquiry')}>Start a project <ArrowUpRight size={15}/></a></div>
      <nav className="site-footer-column" aria-label="Explore the website"><h2>Explore</h2><a href={sectionLink('studio')}>Studio</a><a href={sectionLink('work')}>Selected work</a><a href={sectionLink('services')}>Services</a><a href={sectionLink('process')}>How we work</a><a href={sectionLink('contact')}>Contact us</a></nav>
      <div className="site-footer-column"><h2>Popular projects</h2>{footerProjects.length?footerProjects.map(project=><Link key={project.id} to={`/projects/${project.id}`}>{project.name}<ArrowUpRight size={13}/></Link>):<a href={sectionLink('work')}>Explore our work <ArrowUpRight size={13}/></a>}</div>
      <div className="site-footer-column footer-contact-column"><h2>Contact us</h2>{emails.map((email,index)=><a key={`${email}-${index}`} href={`mailto:${email}`}><Mail size={14}/>{email}</a>)}{phones.map((phone,index)=><a key={`${phone}-${index}`} href={`tel:${phone.replace(/[^+\d]/g,'')}`}><Globe2 size={14}/>{phone}</a>)}<a href={sectionLink('contact')}>Send an enquiry <ArrowRight size={14}/></a></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} MV Studio</span><a href={sectionLink('home')}>Back to top ↑</a><span>Made with care in Malaysia.</span></div>
  </footer>;
}

function ProjectDetails({data,loading,error}){
  const {id}=useParams();
  const project=(data.projects||[]).find(item=>item.id===id);
  const siteContent=normalizeSiteContent(data.site_content?.content||fallbackContent.site_content.content);
  useEffect(()=>{
    if(!project)return;
    const base=(import.meta.env.VITE_SITE_URL||window.location.origin).replace(/\/$/,'');
    const title=project.seo_title||`${project.name} | MV Studio Projects`;
    const description=project.seo_description||project.summary;
    const canonical=`${base}/projects/${encodeURIComponent(project.id)}`;
    document.title=title;
    const updateMeta=(selector,key,value)=>{let node=document.head.querySelector(selector);if(!node){node=document.createElement('meta');node.setAttribute('property',key);document.head.appendChild(node);}node.content=value||'';};
    let descriptionMeta=document.head.querySelector('meta[name="description"]');if(!descriptionMeta){descriptionMeta=document.createElement('meta');descriptionMeta.name='description';document.head.appendChild(descriptionMeta);}descriptionMeta.content=description;
    let robotsMeta=document.head.querySelector('meta[name="robots"]');if(robotsMeta)robotsMeta.content='index,follow,max-image-preview:large';
    updateMeta('meta[property="og:title"]','og:title',title);updateMeta('meta[property="og:description"]','og:description',description);updateMeta('meta[property="og:url"]','og:url',canonical);
    updateMeta('meta[property="og:image"]','og:image',project.image_url?new URL(project.image_url,`${base}/`).href:'');
    let link=document.head.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}link.href=canonical;
    const jsonLd={'@context':'https://schema.org','@type':'CreativeWork','name':project.name,'headline':title,'description':description,'url':canonical,'image':project.image_url?new URL(project.image_url,`${base}/`).href:undefined,'keywords':(project.tags||[]).join(', '),'creator':{'@type':'Organization','name':'MV Studio','url':`${base}/`}};
    let script=document.getElementById('mv-studio-jsonld');if(!script){script=document.createElement('script');script.id='mv-studio-jsonld';script.type='application/ld+json';document.head.appendChild(script);}script.textContent=JSON.stringify(jsonLd);
  },[project]);
  useEffect(()=>{if(!project&&!loading){document.title='Project not found | MV Studio';const robots=document.head.querySelector('meta[name="robots"]');if(robots)robots.content='noindex,follow';}},[project,loading]);
  if(loading&&!project)return <div className="admin-loading">Loading project…</div>;
  if(!project)return <NotFoundPage project/>;
  return <><header className="site-nav"><div className="nav-inner"><Link className="brand" to="/"><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link><Link className="admin-link" to="/#work">← All projects</Link><Link className="button button-dark nav-cta" to="/#contact">Start a project <ArrowUpRight size={15}/></Link></div></header><main className="project-detail"><div className="project-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/#work">Selected work</Link><span>/</span><span>{project.name}</span></div><div className="project-detail-head"><span className="section-overline">{project.category||'SELECTED PROJECT'}</span><h1>{project.name}</h1><p>{project.summary}</p><div className="tag-list">{(project.tags||[]).map(tag=><span key={tag}>{tag}</span>)}</div></div>{project.image_url&&<figure className="project-detail-image"><SmartImage record={project} alt={`${project.name} interface and project preview`} sizes="(max-width:1040px) 100vw, 1040px" priority/></figure>}<ProjectDemoVideo url={project.video_url || (youtubeEmbed(project.demo_url) ? project.demo_url : "")} /><div className="project-detail-lower"><div><span className="section-overline">ABOUT THIS PROJECT</span><h2>Digital work, built around a real need.</h2><p>{project.summary}</p>{[["The challenge",project.challenge],["Our approach",project.solution],["The outcome",project.outcome]].filter(([,text])=>text).map(([heading,text])=><section className="case-study-block" key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div><div className="project-detail-actions">{project.demo_url&&<a className="button button-dark" href={publicHref(project.demo_url)} target={project.demo_url.startsWith('http')?'_blank':undefined} rel="noreferrer">Visit the project <ArrowUpRight size={15}/></a>}<Link className="button button-light" to="/#contact">Build something similar <ArrowRight size={15}/></Link></div></div><div className="project-detail-footer"><Link to="/">MV Studio <ArrowUpRight size={14}/></Link><span>{siteContent.contact_emails?.[0]||''}</span></div></main><SiteFooter projects={sortRows(data.projects)} content={siteContent}/></>;
}

function FeatureRequestForm({options}){
  const emptyValues={name:'',company_name:'',phone:'',email:'',message:'',billing_period:'monthly',meeting_requested:false,preferred_meeting_at:'',website:''};
  const submissionRef=useRef(null);
  const [values,setValues]=useState(emptyValues),[selected,setSelected]=useState([]),[sending,setSending]=useState(false),[feedback,setFeedback]=useState(''),[feedbackError,setFeedbackError]=useState(false),[errors,setErrors]=useState({}),[touched,setTouched]=useState({}),[attempted,setAttempted]=useState(false);
  const active=(options||[]).filter(item=>item.active).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const chosen=active.filter(item=>selected.includes(item.id));
  const estimate=estimateFeatures(chosen);
  const recurring=chosen.filter(item=>item.billing_type==='monthly');
  const visibleError=key=>(attempted||touched[key])?errors[key]:'';
  const change=(key,value)=>{const next={...values,[key]:value};if(key==='meeting_requested'&&!value)next.preferred_meeting_at='';setValues(next);if(attempted||touched[key]||(key==='meeting_requested'&&touched.preferred_meeting_at))setErrors(validateContact(next));};
  const blur=key=>{setTouched(current=>({...current,[key]:true}));setErrors(current=>({...current,...validateContact(values)}));};
  const submit=async event=>{
    event.preventDefault();setAttempted(true);setTouched({name:true,company_name:true,phone:true,email:true,message:true,preferred_meeting_at:true});
    const nextErrors=validateContact(values);setErrors(nextErrors);
    if(Object.keys(nextErrors).length){document.getElementById(`enquiry-${Object.keys(nextErrors)[0]}`)?.focus();return;}
    setFeedback('');setFeedbackError(false);
    if(!isSupabaseConfigured){setFeedback('Coming soon. Please contact the team directly.');setFeedbackError(true);return;}
    setSending(true);
    try{
      const body={...values,name:values.name.trim(),company_name:values.company_name.trim(),phone:values.phone.trim(),email:values.email.trim(),preferred_meeting_at:values.preferred_meeting_at?new Date(values.preferred_meeting_at).toISOString():null,selected_feature_ids:[...selected].sort()};
      const signature=JSON.stringify(body);
      if(submissionRef.current?.signature!==signature)submissionRef.current={signature,id:crypto.randomUUID()};
      const result=await submitEnquiry({...body,request_id:submissionRef.current.id});
      if(!result?.ok)throw new Error('Enquiry confirmation was unavailable.');
      trackEvent('generate_lead',{method:'enquiry_form'});
      setFeedback('Thanks — your enquiry has been saved. We will contact you to confirm the scope and any meeting time.'+(result.id?' Reference: '+result.id:''));
      submissionRef.current=null;
      setValues(emptyValues);setSelected([]);setErrors({});setTouched({});setAttempted(false);
    }catch(error){if(error.fields){setErrors(error.fields);document.getElementById('enquiry-'+Object.keys(error.fields)[0])?.focus();}setFeedback(publicFailure(error).message);setFeedbackError(true);}
    finally{setSending(false);}
  };
  const fieldError=(key)=>visibleError(key)&&<InlineFieldError id={`enquiry-${key}-error`} message={visibleError(key)}/>;
  const fieldProps=key=>({id:`enquiry-${key}`,name:key,'aria-invalid':Boolean(visibleError(key)),'aria-describedby':visibleError(key)?`enquiry-${key}-error`:undefined,onBlur:()=>blur(key)});
  return <section className="enquiry-section section-pad" id="enquiry"><div className="enquiry-intro"><div className="section-overline"><span>06</span> PLAN A PROJECT</div><h2>Build the right<br/><em>things first.</em></h2><p>Choose the features you need. We’ll use this as a starting point for a tailored quote, not a final price.</p><div className="estimate-card"><span>STARTING ESTIMATE</span><dl className="estimate-lines"><div><dt>One-time work</dt><dd>{active.length?money(estimate.one_time_estimate):'To be confirmed'}</dd></div>{recurring.length>0&&<div><dt>{values.billing_period==='yearly'?'Annual services':'Monthly services'}</dt><dd>{money(values.billing_period==='yearly'?estimate.annual_estimate:estimate.monthly_estimate)} / {values.billing_period==='yearly'?'year':'month'}</dd></div>}</dl>{estimate.quoted.length>0&&<small>Quoted separately: {estimate.quoted.join(', ')}.</small>}<small>Final scope and third-party costs are confirmed with you.</small></div></div>
    <form className="enquiry-form" onSubmit={submit} noValidate>
      <div className="form-heading"><div><span className="section-overline">TELL US WHAT YOU NEED</span><h3>Project enquiry</h3></div><span className="required-note">* Required</span></div>
      <div className="enquiry-fields">
        <label>Your name *<input {...fieldProps('name')} autoComplete="name" maxLength="120" value={values.name} onChange={e=>change('name',e.target.value)}/>{fieldError('name')}</label>
        <label>Company name *<input {...fieldProps('company_name')} autoComplete="organization" maxLength="160" value={values.company_name} onChange={e=>change('company_name',e.target.value)}/>{fieldError('company_name')}</label>
        <label>Contact number *<input {...fieldProps('phone')} type="tel" inputMode="tel" autoComplete="tel" maxLength="40" value={values.phone} onChange={e=>change('phone',e.target.value)}/>{fieldError('phone')}</label>
        <label>Email address *<input {...fieldProps('email')} type="email" inputMode="email" autoComplete="email" maxLength="254" value={values.email} onChange={e=>change('email',e.target.value)}/>{fieldError('email')}</label>
      </div>
      <fieldset className="feature-picker"><legend>What should we help with?</legend>{active.length?active.map(item=><label className="feature-option" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))}/><span><b>{item.name}</b><small>{item.description}</small></span><em>{item.billing_type==='monthly'?`${money(item.price)}/mo`:item.billing_type==='one_time'?money(item.price):'Let’s scope it'}</em></label>):<p className="feature-empty">Coming soon. Feature options are being prepared. You can still send a project enquiry.</p>}</fieldset>
      <div className="billing-choice"><span>Recurring services</span><label><input type="radio" name="billing_period" checked={values.billing_period==='monthly'} onChange={()=>change('billing_period','monthly')}/> Monthly</label><label><input type="radio" name="billing_period" checked={values.billing_period==='yearly'} onChange={()=>change('billing_period','yearly')}/> Annual</label></div>{values.billing_period==='yearly'&&recurring.filter(item=>Number(item.annual_free_months)>0).map(item=><p className="annual-savings" key={item.id}>{item.name}: pay {12-Number(item.annual_free_months)} months for a year ({item.annual_free_months} free).</p>)}
      <label className="message-field">Anything else we should know?<textarea id="enquiry-message" rows="3" maxLength="3000" value={values.message} aria-invalid={Boolean(visibleError('message'))} aria-describedby={visibleError('message')?'enquiry-message-error':undefined} onBlur={()=>blur('message')} onChange={e=>change('message',e.target.value)}/>{fieldError('message')}</label>
      <label className="meeting-toggle"><input type="checkbox" checked={values.meeting_requested} onChange={e=>change('meeting_requested',e.target.checked)}/><span><b>Request a short meeting</b><small>We’ll contact you to agree a time. This is a request, not a confirmed booking.</small></span></label>
      {values.meeting_requested&&<label className="meeting-time">Preferred time (optional)<input {...fieldProps('preferred_meeting_at')} type="datetime-local" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={values.preferred_meeting_at} onChange={e=>change('preferred_meeting_at',e.target.value)}/>{fieldError('preferred_meeting_at')}</label>}
      <input className="honeypot" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" value={values.website} onChange={e=>change('website',e.target.value)}/>
      <button className="button button-dark" disabled={sending}>{sending?'Sending enquiry…':'Send project enquiry'} <ArrowUpRight size={15}/></button>
      {feedback&&<div className={`enquiry-feedback ${feedbackError?'public-service-notice':''}`} role="status">{feedback}{feedbackError&&<><br/><a href="#contact">Contact the team directly</a></>}</div>}
      <small className="privacy-note">Your details are used to respond to this enquiry and are visible only to our administrators.</small>
    </form>
  </section>;
}

export default App;
