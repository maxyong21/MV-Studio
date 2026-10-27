import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './app.css';
import './footer.css';
import './responsive.css';
import './studio.css';
import './refinements.css';
import App from './App.jsx';
import {emptyPublicContent,recordDiagnostic} from './lib/availability.mjs';

const container=document.getElementById('root');
const snapshot=document.getElementById('mv-initial-data');
let initialData;
try{initialData=snapshot?JSON.parse(snapshot.textContent):undefined;}catch(error){recordDiagnostic('Initial website content',error);initialData={...emptyPublicContent(),__availability:'maintenance'};delete container.dataset.route;}
const tree=(
  <React.StrictMode>
    <BrowserRouter><App initialData={initialData}/></BrowserRouter>
  </React.StrictMode>
);
if(container.dataset.route===window.location.pathname&&container.hasChildNodes())hydrateRoot(container,tree);
else createRoot(container).render(tree);
