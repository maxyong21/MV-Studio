import {Plus} from 'lucide-react';
import {sortRows} from '../lib/site.js';
import {useLanguage} from '../i18n/index.jsx';
import './faq.css';

export default function Faq({rows=[]}) {
  const {t}=useLanguage();
  const published=sortRows(rows).filter(row=>row.title?.trim()&&row.answer?.trim());
  if(!published.length)return null;
  return <section className="faq-section section-pad" id="faq" aria-labelledby="faq-title">
    <div className="section-heading"><div><div className="section-overline">{t('BEFORE WE BUILD')}</div><h2 id="faq-title">{t('A few things,')}<br/><em>{t('made clear.')}</em></h2></div><p>{t('Understand the costs, content and ongoing support before starting your project.')}</p></div>
    <div className="faq-list">{published.map(item=><details className="faq-item" key={item.id}><summary><span>{item.title}</span><Plus size={20} aria-hidden="true"/></summary><div className="faq-answer"><p>{item.answer}</p></div></details>)}</div>
    <p className="faq-contact">{t('Have another question?')} <a href="#contact">{t('Talk to the team.')}</a></p>
  </section>;
}
