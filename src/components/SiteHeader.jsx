import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight,Menu,X} from 'lucide-react';
import {LanguageSwitch,useLanguage} from '../i18n/index.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// The full site menu for pages other than the home page (used by the guides). Every link leads back to
// a section of the home page, so a reader is never stranded. On phones it folds into a menu button.
// It reuses the home page's header classes, so both headers look and behave the same.
const links=[['Studio','/#studio'],['Work','/#work'],['Services','/#services'],['Contact','/#contact'],['Guides','/guides']];

export default function SiteHeader({current=''}){
  const {t,lp}=useLanguage(),{pathname}=useLocation(),[open,setOpen]=useState(false);
  // Close after moving to another page, and on Escape.
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{
    if(!open)return;
    const onKey=event=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[open]);
  return <header className="site-nav site-nav-sub"><div className="nav-inner">
    <Link className="brand" to={lp('/')}><span className="brand-symbol">m<span>v</span></span><span>MV<span className="brand-light">Studio</span></span></Link>
    <nav className={open?'nav-links open':'nav-links'} id="site-navigation" aria-label="Main navigation">
      {links.map(([label,href])=><Link key={href} to={lp(href)} aria-current={href===current?'page':undefined} onClick={()=>setOpen(false)}>{t(label)}</Link>)}
      <LanguageSwitch className="nav-language-mobile"/>
      <Link className="button button-dark nav-menu-cta" to={lp('/#enquiry')} onClick={()=>setOpen(false)}>{t('Start a project')} <ArrowUpRight size={15} aria-hidden="true"/></Link>
    </nav>
    <div className="nav-end"><LanguageSwitch className="nav-language"/><ThemeToggle/><Link className="button button-dark nav-cta" to={lp('/#enquiry')}>{t('Start a project')} <ArrowUpRight size={15} aria-hidden="true"/></Link><button type="button" className="icon-button mobile-menu" onClick={()=>setOpen(!open)} aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="site-navigation">{open?<X/>:<Menu/>}</button></div>
  </div></header>;
}
