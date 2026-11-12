import {useRef,useState} from 'react';
import {useDemo,random,values,DAYS,MONTHS,scale,line,sum,clamp,polar,arc,hot,Svg,Grid,XLabels,Legend} from './kit.jsx';

const X0=34,X1=312,Y0=12,Y1=158;
// Roughly bell-shaped samples: the mean of three uniform draws.
const bell=(seed,n,centre=50,spread=40)=>{const r=random(seed);return Array.from({length:n},()=>clamp(centre+((r()+r()+r())/3-.5)*spread*2.4,2,98));};
const quantile=(sorted,q)=>{const at=(sorted.length-1)*q,lo=Math.floor(at);return sorted[lo]+(sorted[Math.min(sorted.length-1,lo+1)]-sorted[lo])*(at-lo);};

function Scatter({bubble=false}){
  const {seed,say}=useDemo(),r=random(seed*11),x=scale(0,100,X0,X1),y=scale(0,100,Y1,Y0);
  const points=Array.from({length:bubble?14:44},(_,i)=>{const px=8+r()*84,group=bubble?0:i%2;return {px,py:clamp(px*(group?.45:.8)+(r()-.5)*42+(group?30:6),4,96),size:4+r()*14,group};});
  return <><Svg label={bubble?'Bubble chart of spend, sales and order size':'Scatter plot of page speed against conversion for two groups'}><Grid/>
    <g className="wg-grid">{[0,25,50,75,100].map(t=><text key={t} x={x(t)} y="174" textAnchor="middle">{t}</text>)}</g>
    {points.map((p,i)=><circle key={i} className={`f${p.group+1} wg-ring`} fillOpacity={bubble?.6:.9} cx={x(p.px)} cy={y(p.py)} r={bubble?p.size:4.5}
      {...hot(say,bubble?`Campaign ${i+1}: spend ${Math.round(p.px)}, sales ${Math.round(p.py)}, average order RM ${Math.round(p.size*12)}`:`${p.group?'Mobile':'Desktop'} page: speed score ${Math.round(p.px)}, conversion ${(p.py/10).toFixed(1)}%`)}/>)}
  </Svg>{bubble?<p className="wg-caption">Across: ad spend · Up: sales · Bubble size: average order</p>:<Legend items={['Desktop','Mobile']}/>}</>;
}

function Histogram(){
  const {seed,say}=useDemo(),samples=bell(seed*13,240,48,34),bins=Array.from({length:12},(_,i)=>samples.filter(v=>v>=i*100/12&&v<(i+1)*100/12).length);
  const max=Math.ceil(Math.max(...bins)*1.1/10)*10,y=scale(0,max,Y1,Y0),slot=(X1-X0)/12;
  return <Svg label="Histogram of order values in twelve ranges"><Grid max={max}/>
    {bins.map((count,i)=><rect key={i} className="f1" x={X0+slot*i+1} width={slot-2} y={y(count)} height={Y1-y(count)} rx="2" {...hot(say,`RM ${Math.round(i*100/12)*10}–${Math.round((i+1)*100/12)*10}: ${count} orders`)}/>)}
    <g className="wg-grid">{[0,3,6,9,12].map(i=><text key={i} x={X0+slot*i} y="174" textAnchor="middle">{Math.round(i*100/12)*10}</text>)}</g></Svg>;
}

const TEAMS=['Design','Build','Support','Sales'];
function Box(){
  const {seed,say}=useDemo(),y=scale(0,100,Y1,Y0),slot=(X1-X0)/4;
  return <Svg label="Box plot of response times for four teams"><Grid/><XLabels labels={TEAMS} x={i=>X0+slot*(i+.5)}/>
    {TEAMS.map((team,i)=>{const data=bell(seed*5+i*31,60,35+i*9,22+i*4).sort((a,b)=>a-b),[q1,median,q3]=[.25,.5,.75].map(q=>quantile(data,q)),reach=(q3-q1)*1.5;
      const low=data.find(v=>v>=q1-reach),high=[...data].reverse().find(v=>v<=q3+reach),outliers=data.filter(v=>v<low||v>high),cx=X0+slot*(i+.5);
      return <g key={team} {...hot(say,`${team}: median ${Math.round(median)} min, middle half ${Math.round(q1)}–${Math.round(q3)} min, range ${Math.round(low)}–${Math.round(high)} min${outliers.length?`, ${outliers.length} outlier${outliers.length>1?'s':''}`:''}`)}>
        <rect x={cx-slot/2} y={Y0} width={slot} height={Y1-Y0} fill="transparent"/>
        <line className="s1" strokeWidth="1.5" x1={cx} x2={cx} y1={y(high)} y2={y(low)}/><line className="s1" strokeWidth="1.5" x1={cx-8} x2={cx+8} y1={y(high)} y2={y(high)}/><line className="s1" strokeWidth="1.5" x1={cx-8} x2={cx+8} y1={y(low)} y2={y(low)}/>
        <rect className="f1 s1 wg-shape" fillOpacity=".3" x={cx-17} width="34" y={y(q3)} height={y(q1)-y(q3)} rx="3"/><line className="s1" strokeWidth="3" x1={cx-17} x2={cx+17} y1={y(median)} y2={y(median)}/>
        {outliers.map((v,k)=><circle key={k} className="f1" cx={cx} cy={y(v)} r="2.5"/>)}</g>;})}</Svg>;
}

function Violin(){
  const {seed,say}=useDemo(),y=scale(0,100,Y1,Y0),names=['Basic','Standard','Premium'],slot=(X1-X0)/3;
  return <><Svg label="Violin plot of satisfaction scores for three plans"><Grid/><XLabels labels={names} x={i=>X0+slot*(i+.5)}/>
    {names.map((name,i)=>{const data=bell(seed*7+i*23,90,40+i*14,26-i*4),levels=Array.from({length:26},(_,k)=>k*4),density=levels.map(level=>sum(data.map(v=>Math.exp(-(((level-v)/7)**2)/2))));
      const peak=Math.max(...density),half=d=>d/peak*34,cx=X0+slot*(i+.5),median=quantile([...data].sort((a,b)=>a-b),.5);
      const right=levels.map((level,k)=>[cx+half(density[k]),y(level)]),left=levels.map((level,k)=>[cx-half(density[k]),y(level)]).reverse();
      return <g key={name} {...hot(say,`${name}: scores centre on ${Math.round(median)}; the widest part is where most customers sit`)}>
        <path className={`f${i+1} s${i+1} wg-shape`} fillOpacity=".3" d={`${line(right)} ${line(left).replace('M','L')}Z`}/><circle className="fi" cx={cx} cy={y(median)} r="3.5"/></g>;})}
  </Svg><p className="wg-caption">Dot marks the median score.</p></>;
}

function SeqLegend(){return <div className="wg-seq"><span>Less</span>{[.12,.3,.5,.7,.9].map(o=><svg key={o} viewBox="0 0 12 12" aria-hidden="true"><rect className="fq" fillOpacity={o} width="12" height="12" rx="2.5"/></svg>)}<span>More</span></div>;}

function Heatmap(){
  const {seed,say}=useDemo(),r=random(seed*17),hours=['8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'];
  const cell=(d,h)=>Math.round(clamp((d<5?70:40)*(1-Math.abs(h-(d<5?3:4.5))/6)+r()*30,2,99));
  return <><Svg h={184} label="Heatmap of website visits by weekday and time of day">
    <g className="wg-grid">{hours.map((hour,h)=><text key={hour} x={62+h*32} y="12" textAnchor="middle">{hour}</text>)}{DAYS.map((day,d)=><text key={day} x="38" y={33+d*23} textAnchor="end">{day}</text>)}</g>
    {DAYS.map((day,d)=>hours.map((hour,h)=>{const v=cell(d,h);return <rect key={`${d}-${h}`} className="fq" fillOpacity={.08+v/100*.86} x={47+h*32} y={19+d*23} width="30" height="21" rx="3" {...hot(say,`${day} ${hour}: ${v*4} visits`)}/>;}))}
  </Svg><SeqLegend/></>;
}

function CalendarHeat(){
  const {seed,say}=useDemo(),r=random(seed*19),start=new Date(2026,5,29);
  return <><Svg h={132} label="Calendar heatmap of daily activity over twenty weeks">
    <g className="wg-grid">{['Mon','Wed','Fri'].map((day,i)=><text key={day} x="26" y={31+i*28} textAnchor="end">{day}</text>)}</g>
    {Array.from({length:20},(_,week)=>Array.from({length:7},(_,day)=>{const date=new Date(start);date.setDate(start.getDate()+week*7+day);const busy=r()>(day>4?.6:.15),count=busy?Math.round(r()*r()*12)+1:0;
      return <g key={`${week}-${day}`}>{day===0&&date.getDate()<=7&&<text className="wg-grid-text" x={32+week*14} y="12">{MONTHS[date.getMonth()]}</text>}
        <rect className={count?'fq':'fn'} fillOpacity={count?.18+Math.min(1,count/10)*.78:.1} x={32+week*14} y={20+day*14} width="12" height="12" rx="2.5" {...hot(say,`${date.toLocaleDateString('en-MY',{weekday:'short',day:'numeric',month:'short'})}: ${count?`${count} order${count>1?'s':''}`:'no orders'}`)}/></g>;}))}
  </Svg><SeqLegend/></>;
}

function Sankey(){
  const {seed,say}=useDemo(),[focus,setFocus]=useState(null),from=['Search','Social','Referral'],to=['Enquired','Browsed only','Left'];
  const flows=from.map((_,i)=>values(seed*5+i*9,3,6,34)),total=sum(flows.flat()),k=140/total,gap=12;
  const leftTop=[],rightTop=[];let cursor=14;from.forEach((_,i)=>{leftTop[i]=cursor;cursor+=sum(flows[i])*k+gap;});
  cursor=14;to.forEach((_,j)=>{rightTop[j]=cursor;cursor+=sum(flows.map(row=>row[j]))*k+gap;});
  const leftUsed=[0,0,0],rightUsed=[0,0,0],links=[];
  flows.forEach((row,i)=>row.forEach((v,j)=>{const w=v*k,y0=leftTop[i]+leftUsed[i]+w/2,y1=rightTop[j]+rightUsed[j]+w/2;leftUsed[i]+=w;rightUsed[j]+=w;links.push({i,j,v,w,d:`M84,${y0.toFixed(1)} C160,${y0.toFixed(1)} 160,${y1.toFixed(1)} 236,${y1.toFixed(1)}`});}));
  return <Svg h={196} label="Sankey diagram of visitors flowing from three sources to three outcomes">
    {links.map((link,n)=><path key={n} className={`s${link.i+1} wg-flow ${focus===null||focus===n?'':'wg-dim'}`} strokeWidth={Math.max(1,link.w-1)} d={link.d} onPointerEnter={()=>{setFocus(n);say(`${from[link.i]} → ${to[link.j]}: ${link.v*10} visitors (${Math.round(link.v/total*100)}% of all)`);}} onPointerLeave={()=>setFocus(null)} onClick={()=>say(`${from[link.i]} → ${to[link.j]}: ${link.v*10} visitors`)}/>)}
    {from.map((name,i)=><g key={name}><rect className={`f${i+1}`} x="74" width="10" rx="2" y={leftTop[i]} height={sum(flows[i])*k}/><text className="wg-label" x="68" y={leftTop[i]+sum(flows[i])*k/2+3.5} textAnchor="end">{name}</text></g>)}
    {to.map((name,j)=>{const size=sum(flows.map(row=>row[j]))*k;return <g key={name}><rect className="fn" fillOpacity=".55" x="236" width="10" rx="2" y={rightTop[j]} height={size}/><text className="wg-label" x="252" y={rightTop[j]+size/2+3.5}>{name}</text></g>;})}
  </Svg>;
}

function Chord(){
  const {seed,say}=useDemo(),[focus,setFocus]=useState(null),names=['Design','Build','Sales','Support'],r=random(seed*23);
  const m=names.map(()=>names.map(()=>0));for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)m[i][j]=m[j][i]=Math.round(4+r()*20);
  const total=sum(m.flat()),pad=.02,unit=(1-pad*4)/total,spans=[];let cursor=0;
  names.forEach((_,i)=>{let inner=cursor;spans[i]={from:cursor,parts:[]};m[i].forEach((v,j)=>{spans[i].parts[j]=[inner,inner+v*unit];inner+=v*unit;});spans[i].to=inner;cursor=inner+pad;});
  const point=turn=>polar(160,96,66,turn).map(n=>n.toFixed(1)).join(','),ribbons=[];
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const [a0,a1]=spans[i].parts[j],[b0,b1]=spans[j].parts[i];ribbons.push({i,j,d:`M${point(a0)} A66,66 0 0 1 ${point(a1)} Q160,96 ${point(b0)} A66,66 0 0 1 ${point(b1)} Q160,96 ${point(a0)}Z`});}
  return <><Svg h={196} label="Chord diagram of handovers between four teams">
    {ribbons.map((ribbon,n)=><path key={n} className={`f${ribbon.i+1} wg-ribbon ${focus===null||focus===n?'':'wg-dim'}`} d={ribbon.d} onPointerEnter={()=>{setFocus(n);say(`${names[ribbon.i]} ↔ ${names[ribbon.j]}: ${m[ribbon.i][ribbon.j]} handovers this month`);}} onPointerLeave={()=>setFocus(null)} onClick={()=>say(`${names[ribbon.i]} ↔ ${names[ribbon.j]}: ${m[ribbon.i][ribbon.j]} handovers`)}/>)}
    {names.map((name,i)=><path key={name} className={`f${i+1}`} d={arc(160,96,69,78,spans[i].from,spans[i].to)} {...hot(say,`${name}: ${sum(m[i])} handovers in total`)}/>)}
  </Svg><Legend items={names}/></>;
}

const NODES=[['Website',160,96],['Enquiry form',84,52],['Chatbot',236,48],['WhatsApp',262,128],['Email',70,138],['Admin',160,168],['Database',160,26],['Analytics',36,92]];
const EDGES=[[0,1],[0,2],[0,7],[1,6],[2,6],[1,4],[2,3],[5,6],[5,4],[0,5]];
function Network(){
  const {say}=useDemo(),[nodes,setNodes]=useState(NODES),[focus,setFocus]=useState(null),svg=useRef(null),drag=useRef(null);
  const linked=i=>focus===null||focus===i||EDGES.some(([a,b])=>(a===focus&&b===i)||(b===focus&&a===i));
  const move=event=>{if(drag.current===null)return;const box=svg.current.getBoundingClientRect(),x=clamp((event.clientX-box.left)/box.width*320,14,306),y=clamp((event.clientY-box.top)/box.height*196,14,182);setNodes(list=>list.map((node,i)=>i===drag.current?[node[0],x,y]:node));};
  const describe=i=>{setFocus(i);say(`${nodes[i][0]} connects to ${EDGES.filter(edge=>edge.includes(i)).map(([a,b])=>nodes[a===i?b:a][0]).join(', ')}. Drag to rearrange.`);};
  return <Svg h={196} label="Network graph of how parts of a website system connect" ref={svg} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerLeave={()=>{drag.current=null;setFocus(null);}}>
    {EDGES.map(([a,b],n)=><line key={n} className={`wg-link ${focus===null||focus===a||focus===b?'':'wg-dim'}`} x1={nodes[a][1]} y1={nodes[a][2]} x2={nodes[b][1]} y2={nodes[b][2]}/>)}
    {nodes.map(([name,x,y],i)=><g key={name} className={`wg-node ${linked(i)?'':'wg-dim'}`} onPointerDown={event=>{event.preventDefault();drag.current=i;describe(i);}} onPointerEnter={()=>describe(i)}>
      <circle className={`f${i===0?2:1} wg-ring`} cx={x} cy={y} r={i===0?11:8}/><text className="wg-label" x={x} y={y-(i===0?15:12)} textAnchor="middle">{name}</text></g>)}
  </Svg>;
}

export default [
  {name:'Scatter plot',use:'you want to see whether two measures move together, such as page speed and conversion rate.',data:true,Demo:()=><Scatter/>},
  {name:'Bubble chart',use:'a third measure matters too, such as spend, sales and average order size per campaign.',data:true,Demo:()=><Scatter bubble/>},
  {name:'Histogram',use:'you want to know what is typical and how spread out the values are, such as order values or delivery times.',data:true,Demo:Histogram},
  {name:'Box plot',use:'you are comparing the spread of several groups and want outliers to show, such as response times per team.',data:true,Demo:Box},
  {name:'Violin plot',use:'the shape of each group matters, for example when scores cluster in two places that a box plot would hide.',data:true,Demo:Violin},
  {name:'Heatmap',use:'you are looking for hot spots across two dimensions, such as busiest day and time.',data:true,Demo:Heatmap},
  {name:'Calendar heatmap',use:'you want to see daily habits and gaps over months, such as orders, logins or bookings per day.',data:true,Demo:CalendarHeat},
  {name:'Sankey diagram',use:'you need to show where a quantity goes, such as how visitors from each source end up.',data:true,Demo:Sankey},
  {name:'Chord diagram',use:'groups exchange with each other in both directions, such as handovers between teams.',data:true,Demo:Chord},
  {name:'Network graph',use:'the connections are the point, such as how systems, people or pages link together.',Demo:Network},
];
