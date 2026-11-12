import {useState} from 'react';
import {useDemo,values,walk,MONTHS,SERVICES,scale,line,sum,polar,hot,Svg,Grid,XLabels,Legend} from './kit.jsx';

const CATS=['Landing page','Company site','Online store','Web app','Care plan'];
const X0=34,X1=312,Y0=12,Y1=158;

// Horizontal family: bar, lollipop, dot plot and dumbbell share one layout.
function Rows({mode,label}){
  const {seed,say}=useDemo(),now=values(seed*3,5,25,95),before=values(seed*3+7,5,15,80);
  const order=CATS.map((name,i)=>({name,now:now[i],before:before[i]})).sort((a,b)=>b.now-a.now);
  const x=scale(0,100,84,296),band=30;
  return <><Svg h={178} label={label}>
    <g className="wg-grid">{[0,25,50,75,100].map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="6" y2="156"/><text x={x(t)} y="172" textAnchor="middle">{t}</text></g>)}</g>
    {order.map((row,i)=>{const cy=21+i*band,lo=Math.min(row.now,row.before),hi=Math.max(row.now,row.before);
      const text=mode==='dumbbell'?`${row.name}: ${row.before} last year, ${row.now} this year (${row.now>=row.before?'+':''}${row.now-row.before})`:`${row.name}: ${row.now} projects`;
      return <g key={row.name} {...hot(say,text)}>
        <rect x="0" y={cy-band/2} width="320" height={band} fill="transparent"/>
        <text className="wg-label" x="78" y={cy+3.5} textAnchor="end">{row.name}</text>
        {mode==='bar'&&<><rect className="f1" x={x(0)} y={cy-8} width={x(row.now)-x(0)} height="16" rx="4"/><text className="wg-value" x={x(row.now)+6} y={cy+3.5}>{row.now}</text></>}
        {mode==='lollipop'&&<><line className="s1" strokeWidth="2" x1={x(0)} x2={x(row.now)} y1={cy} y2={cy}/><circle className="f1 wg-ring" cx={x(row.now)} cy={cy} r="6"/><text className="wg-value" x={x(row.now)+11} y={cy+3.5}>{row.now}</text></>}
        {mode==='dot'&&<><line className="wg-guide" x1={x(0)} x2={x(100)} y1={cy} y2={cy}/><circle className="f1 wg-ring" cx={x(row.now)} cy={cy} r="6"/></>}
        {mode==='dumbbell'&&<><line className="wg-link" x1={x(lo)} x2={x(hi)} y1={cy} y2={cy}/><circle className="f2 wg-ring" cx={x(row.before)} cy={cy} r="5.5"/><circle className="f1 wg-ring" cx={x(row.now)} cy={cy} r="5.5"/></>}
      </g>;})}
  </Svg>{mode==='dumbbell'&&<Legend items={['This year','Last year']}/>}</>;
}

// Vertical family: column, grouped, stacked and 100% stacked.
function Columns({mode,label}){
  const {seed,say}=useDemo(),single=mode==='column';
  const groups=single?MONTHS.slice(0,8):['Q1','Q2','Q3','Q4'],count=single?1:3;
  const data=groups.map((_,g)=>values(seed*4+g*5,count,single?20:12,single?95:mode==='grouped'?90:38));
  const max=mode==='stacked'?Math.ceil(Math.max(...data.map(sum))*1.1/20)*20:100,y=scale(0,max,Y1,Y0);
  const slot=(X1-X0)/groups.length,cx=i=>X0+slot*(i+.5);
  return <><Svg label={label}><Grid max={max} format={v=>mode==='percent'?`${v}%`:v}/><XLabels labels={groups} x={cx}/>
    {data.map((row,g)=>{const total=sum(row);let base=0;
      return row.map((raw,k)=>{
        const v=mode==='percent'?raw/total*100:raw,name=single?groups[g]:`${groups[g]} ${SERVICES[k]}`;
        const text=mode==='percent'?`${name}: ${Math.round(v)}% of the quarter`:`${name}: ${raw}${mode==='stacked'?` of ${total}`:''}`;
        if(mode==='column'||mode==='grouped'){const w=single?slot*.56:slot*.24,left=single?cx(g)-w/2:cx(g)-w*1.5-2+k*(w+2);
          return <rect key={`${g}-${k}`} className={`f${k+1}`} x={left} width={w} y={y(v)} height={Y1-y(v)} rx="3" {...hot(say,text)}/>;}
        const top=y(base+v),height=y(base)-top;base+=v;
        return <rect key={`${g}-${k}`} className={`f${k+1}`} x={cx(g)-slot*.28} width={slot*.56} y={top+1} height={Math.max(1,height-2)} rx="2" {...hot(say,text)}/>;
      });})}
  </Svg>{!single&&<Legend items={SERVICES}/>}</>;
}

function Bullet(){
  const {seed,say}=useDemo(),actual=values(seed*6,3,35,96),target=values(seed*6+3,3,55,90),x=scale(0,100,84,306);
  return <Svg h={150} label="Bullet chart comparing three measures against their targets">
    {['Revenue','New leads','Satisfaction'].map((name,i)=>{const cy=28+i*44;return <g key={name} {...hot(say,`${name}: ${actual[i]}% of plan against a target of ${target[i]}% (${actual[i]>=target[i]?'on target':'below target'})`)}>
      <text className="wg-label" x="78" y={cy+3.5} textAnchor="end">{name}</text>
      {[[0,50,.1],[50,75,.18],[75,100,.28]].map(([from,to,opacity])=><rect key={from} className="fn" fillOpacity={opacity} x={x(from)} width={x(to)-x(from)-1} y={cy-13} height="26"/>)}
      <rect className="f1" x={x(0)} width={x(actual[i])-x(0)} y={cy-5} height="10" rx="3"/>
      <rect className="fi" x={x(target[i])-1.5} width="3" y={cy-11} height="22"/></g>;})}
    <g className="wg-grid">{[0,50,75,100].map(t=><text key={t} x={x(t)} y="146" textAnchor="middle">{t}%</text>)}</g>
  </Svg>;
}

function Radar(){
  const {seed,say}=useDemo(),axes=['Speed','Design','SEO','Support','Price','Scale'],sets=[values(seed*8,6,45,95),values(seed*8+9,6,35,90)];
  const at=(i,v)=>polar(160,92,v/100*70,i/6);
  return <><Svg label="Radar chart comparing two packages on six measures">
    {[.25,.5,.75,1].map(k=><polygon key={k} className="wg-web" points={axes.map((_,i)=>polar(160,92,70*k,i/6).join(',')).join(' ')}/>)}
    {axes.map((name,i)=>{const [lx,ly]=polar(160,92,84,i/6);return <g key={name}><line className="wg-web" x1="160" y1="92" x2={polar(160,92,70,i/6)[0]} y2={polar(160,92,70,i/6)[1]}/><text className="wg-label" x={lx} y={ly+3.5} textAnchor="middle">{name}</text></g>;})}
    {sets.map((set,k)=><g key={k}><polygon className={`f${k+1} s${k+1} wg-shape wg-faint`} points={set.map((v,i)=>at(i,v).join(',')).join(' ')}/>
      {set.map((v,i)=><circle key={i} className={`f${k+1} wg-ring`} cx={at(i,v)[0]} cy={at(i,v)[1]} r="4.5" {...hot(say,`${axes[i]}: Standard ${sets[0][i]}, Premium ${sets[1][i]}`)}/>)}</g>)}
  </Svg><Legend items={['Standard package','Premium package']}/></>;
}

function Slope(){
  const {seed,say}=useDemo(),[focus,setFocus]=useState(null),a=values(seed*5,5,20,90),b=values(seed*5+4,5,20,90),y=scale(0,100,160,16);
  // Labels keep at least 11px apart so close values stay readable.
  const spread=list=>{const out=[];let last=-99;list.map((v,i)=>[y(v),i]).sort((p,q)=>p[0]-q[0]).forEach(([py,i])=>{last=Math.max(py,last+11);out[i]=last;});return out;},la=spread(a),lb=spread(b);
  return <Svg label="Slope chart of five services between two years">
    <g className="wg-grid"><line x1="110" x2="110" y1="10" y2="166"/><line x1="210" x2="210" y1="10" y2="166"/><text x="110" y="184" textAnchor="middle">2025</text><text x="210" y="184" textAnchor="middle">2026</text></g>
    {CATS.map((name,i)=><g key={name} className={focus===null||focus===i?'':'wg-dim'} onPointerEnter={()=>{setFocus(i);say(`${name}: ${a[i]} in 2025 to ${b[i]} in 2026 (${b[i]>=a[i]?'+':''}${b[i]-a[i]})`);}} onPointerLeave={()=>setFocus(null)} onClick={()=>say(`${name}: ${a[i]} in 2025 to ${b[i]} in 2026`)}>
      <line className={`s${b[i]>=a[i]?1:8}`} strokeWidth="2" x1="110" x2="210" y1={y(a[i])} y2={y(b[i])}/><line stroke="transparent" strokeWidth="14" x1="110" x2="210" y1={y(a[i])} y2={y(b[i])}/>
      <circle className={`f${b[i]>=a[i]?1:8} wg-ring`} cx="110" cy={y(a[i])} r="4.5"/><circle className={`f${b[i]>=a[i]?1:8} wg-ring`} cx="210" cy={y(b[i])} r="4.5"/>
      <text className="wg-label" x="102" y={la[i]+3.5} textAnchor="end">{name} {a[i]}</text><text className="wg-label" x="218" y={lb[i]+3.5}>{b[i]} {name}</text></g>)}
  </Svg>;
}

function Bump(){
  const {seed,say}=useDemo(),[focus,setFocus]=useState(null),teams=['North','Central','South','East'],months=MONTHS.slice(0,6);
  const scores=teams.map((_,k)=>walk(seed*6+k*19,6,{lo:10,hi:95,step:.5}));
  const ranks=teams.map((_,k)=>months.map((_,m)=>1+scores.filter((other,j)=>other[m]>scores[k][m]||(other[m]===scores[k][m]&&j<k)).length));
  const x=scale(0,5,52,268),y=scale(1,4,26,146);
  return <Svg label="Bump chart of four branch rankings over six months">
    <g className="wg-grid">{[1,2,3,4].map(rank=><text key={rank} x="30" y={y(rank)+3.5} textAnchor="end">#{rank}</text>)}</g><XLabels labels={months} x={x}/>
    {teams.map((name,k)=><g key={name} className={focus===null||focus===k?'':'wg-dim'} onPointerEnter={()=>{setFocus(k);say(`${name}: rank ${ranks[k].join(' → ')}`);}} onPointerLeave={()=>setFocus(null)} onClick={()=>say(`${name}: rank ${ranks[k].join(' → ')}`)}>
      <path className={`s${k+1} wg-line wg-thick`} d={line(ranks[k].map((rank,m)=>[x(m),y(rank)]))}/>
      {ranks[k].map((rank,m)=><circle key={m} className={`f${k+1} wg-ring`} cx={x(m)} cy={y(rank)} r="5.5"/>)}
      <text className="wg-label" x={x(5)+10} y={y(ranks[k][5])+3.5}>{name}</text></g>)}
  </Svg>;
}

export default [
  {name:'Bar chart',use:'you are ranking categories with long names, such as best-selling services or top referral sources.',data:true,Demo:()=><Rows mode="bar" label="Bar chart ranking five services"/>},
  {name:'Column chart',use:'you are comparing a handful of periods or categories side by side, such as sales per month.',data:true,Demo:()=><Columns mode="column" label="Column chart of eight months"/>},
  {name:'Grouped bar chart',use:'each category has two or three sub-groups to compare directly, such as each quarter by service.',data:true,Demo:()=><Columns mode="grouped" label="Grouped bar chart of three services by quarter"/>},
  {name:'Stacked bar chart',use:'you want the total for each period and a sense of what it is made of.',data:true,Demo:()=><Columns mode="stacked" label="Stacked bar chart of three services by quarter"/>},
  {name:'100% stacked bar',use:'only the mix matters, not the totals, such as how the share of each service changes by quarter.',data:true,Demo:()=><Columns mode="percent" label="Hundred percent stacked bar chart by quarter"/>},
  {name:'Lollipop chart',use:'a bar chart feels heavy because there are many categories or the values are all high.',data:true,Demo:()=><Rows mode="lollipop" label="Lollipop chart ranking five services"/>},
  {name:'Dot plot',use:'precise position matters more than length, and you want the least ink possible on screen.',data:true,Demo:()=><Rows mode="dot" label="Dot plot of five services"/>},
  {name:'Dumbbell chart',use:'the gap between two values is the story, such as this year against last year, or before and after a change.',data:true,Demo:()=><Rows mode="dumbbell" label="Dumbbell chart comparing two years for five services"/>},
  {name:'Bullet chart',use:'you need actual against target with a sense of poor, fair and good, in very little space.',data:true,Demo:Bullet},
  {name:'Radar (spider) chart',use:'you are comparing two or three options across the same set of qualities, such as packages or suppliers.',data:true,Demo:Radar},
  {name:'Slope chart',use:'you want to show who rose and who fell between exactly two points in time.',data:true,Demo:Slope},
  {name:'Bump chart',use:'the ranking matters more than the value, such as branch or product league positions each month.',data:true,Demo:Bump},
];
