import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import App from './App.jsx';
import ms from './i18n/ms.js';
import zh from './i18n/zh.js';
import {parseLocale} from './lib/locale.mjs';
import articles from './guides/articles.mjs';
import {setGuideContent} from './guides/store.mjs';

// Guide text is present for the whole prerender, so the HTML a search engine receives already contains it.
setGuideContent(articles);

const tables={ms,zh};

// A translated address (/ms, /zh) is rendered in that language, so the HTML a search engine
// receives is already in Bahasa Malaysia or Chinese.
export function renderPage(data,url){
  const {lang}=parseLocale(url);
  return renderToString(<StaticRouter location={url}><App initialData={data} initialLanguage={lang==='en'?undefined:{lang,table:tables[lang]}}/></StaticRouter>);
}
