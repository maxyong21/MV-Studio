import {Moon,Sun} from 'lucide-react';
import {useTheme} from '../lib/theme.js';

// One toggle for the public site, legal pages and admin, so the stored
// preference and the reveal behave the same everywhere.
export default function ThemeToggle({className='theme-button',size=17}){
  const [dark,toggle,switched]=useTheme();
  return <button type="button" className={`icon-button ${className}`} aria-label="Toggle colour theme" data-switched={switched?'':undefined} onClick={toggle}>
    <span className="theme-icon" key={dark?'sun':'moon'}>{dark?<Sun size={size}/>:<Moon size={size}/>}</span>
  </button>;
}
