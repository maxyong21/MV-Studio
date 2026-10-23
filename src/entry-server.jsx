import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import App from './App.jsx';

export function renderPage(data,url){
  return renderToString(<StaticRouter location={url}><App initialData={data}/></StaticRouter>);
}
