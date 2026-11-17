import {Plus} from 'lucide-react';
import {groupFaqs} from '../lib/faq-groups.mjs';
import {useLanguage} from '../i18n/index.jsx';
import './faq.css';

const Item=({item})=><details className="faq-item"><summary><span>{item.title}</span><Plus size={20} aria-hidden="true"/></summary><div className="faq-answer"><p>{item.answer}</p></div></details>;

export default function Faq({rows=[]}) {
  const {t}=useLanguage();
  const {published,groups}=groupFaqs(rows);
  if(!published.length)return null;
  return <section className="faq-section section-pad" id="faq" aria-labelledby="faq-title">
    <div className="section-heading"><div><div className="section-overline">{t('BEFORE WE BUILD')}</div><h2 id="faq-title">{t('A few things,')}<br/><em>{t('made clear.')}</em></h2></div><p>{t('Understand the costs, content and ongoing support before starting your project.')}</p></div>
    {groups?groups.map(group=><div className="faq-group" key={group.key} role="group" aria-labelledby={`faq-group-${group.key}`}><h3 id={`faq-group-${group.key}`}>{t(group.label)}</h3><div className="faq-list">{group.items.map(item=><Item key={item.id} item={item}/>)}</div></div>):<div className="faq-list">{published.map(item=><Item key={item.id} item={item}/>)}</div>}
    <p className="faq-contact">{t('Have another question?')} <a href="#contact">{t('Talk to the team.')}</a></p>
  </section>;
}
