// Shared helpers for the widget library. No chart library: every chart is plain SVG.
import {createContext,useContext,useEffect,useState} from 'react';

// seed: changes when "Shuffle data" is pressed. say: writes the readout line
// under a demo. toast: page-level message.
export const DemoContext=createContext({seed:1,say(){},toast(){}});
export const useDemo=()=>useContext(DemoContext);

// Seeded so a card shows the same data until it is shuffled.
export function random(seed){let s=(Math.abs(Math.floor(seed))*48271+12345)%2147483647||1;return()=>{s=s*48271%2147483647;return s/2147483647;};}
export function walk(seed,n,{lo=20,hi=90,step=.22}={}){const r=random(seed);let v=lo+(hi-lo)*(.3+r()*.4);return Array.from({length:n},()=>{v=Math.min(hi,Math.max(lo,v+(r()-.45)*(hi-lo)*step));return Math.round(v);});}
export function values(seed,n,lo=10,hi=100){const r=random(seed);return Array.from({length:n},()=>Math.round(lo+r()*(hi-lo)));}

export const MONTHS='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
export const DAYS='Mon Tue Wed Thu Fri Sat Sun'.split(' ');
export const SERVICES=['Website','Online store','Web app'];
export const scale=(d0,d1,r0,r1)=>v=>r0+(v-d0)/((d1-d0)||1)*(r1-r0);
export const line=points=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
export const money=v=>`RM ${Math.round(v).toLocaleString('en-MY')}`;
export const sum=list=>list.reduce((total,v)=>total+v,0);
export const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
// Hover on desktop, tap on touch: both update the readout.
export const hot=(say,text)=>({onPointerEnter:()=>say(text),onClick:()=>say(text)});
// Angles are turns (0 to 1) clockwise from the top.
export const polar=(cx,cy,r,turn)=>[cx+r*Math.sin(turn*2*Math.PI),cy-r*Math.cos(turn*2*Math.PI)];
export function arc(cx,cy,r0,r1,from,to){
  const end=Math.min(to,from+.9999),big=end-from>.5?1:0,f=n=>n.toFixed(2);
  const [x0,y0]=polar(cx,cy,r1,from),[x1,y1]=polar(cx,cy,r1,end);
  if(!r0)return `M${cx},${cy}L${f(x0)},${f(y0)}A${r1},${r1} 0 ${big} 1 ${f(x1)},${f(y1)}Z`;
  const [x2,y2]=polar(cx,cy,r0,end),[x3,y3]=polar(cx,cy,r0,from);
  return `M${f(x0)},${f(y0)}A${r1},${r1} 0 ${big} 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${r0},${r0} 0 ${big} 0 ${f(x3)},${f(y3)}Z`;
}

export function Svg({w=320,h=190,label,children,...rest}){return <svg className="wg-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} {...rest}>{children}</svg>;}
export function Grid({x0=34,x1=312,y0=12,y1=158,max=100,ticks=4,format=v=>v}){
  return <g className="wg-grid">{Array.from({length:ticks+1},(_,i)=>{const y=y1-(y1-y0)*i/ticks;return <g key={i}><line x1={x0} x2={x1} y1={y} y2={y}/><text x={x0-6} y={y+3.5} textAnchor="end">{format(Math.round(max/ticks*i))}</text></g>;})}</g>;
}
export function XLabels({labels,x,y=174,every=1}){return <g className="wg-grid">{labels.map((text,i)=>i%every?null:<text key={i} x={x(i)} y={y} textAnchor="middle">{text}</text>)}</g>;}
export function Legend({items,tones}){return <ul className="wg-legend">{items.map((text,i)=><li key={text}><i className={tones?tones[i]:`b${i+1}`}/>{text}</li>)}</ul>;}
export function Btn({className='',...rest}){return <button type="button" className={`wg-btn ${className}`} {...rest}/>;}

export function useTick(ms,active=true){
  const [count,setCount]=useState(0);
  useEffect(()=>{if(!active)return;const id=setInterval(()=>setCount(v=>v+1),ms);return()=>clearInterval(id);},[ms,active]);
  return count;
}
// Weeks of a month, Monday first, padded with nulls.
export function monthCells(year,month){
  const lead=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate();
  const cells=[...Array(lead).fill(null),...Array.from({length:total},(_,i)=>i+1)];
  while(cells.length%7)cells.push(null);
  return cells;
}
export const monthName=(year,month)=>new Date(year,month,1).toLocaleDateString('en-MY',{month:'long',year:'numeric'});
