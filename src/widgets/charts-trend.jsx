import {useState} from 'react';
import {useDemo,walk,random,MONTHS,SERVICES,scale,line,sum,clamp,hot,Svg,Grid,XLabels,Legend} from './kit.jsx';

const X0=34,X1=312,Y0=12,Y1=158;
const x=scale(0,11,X0+6,X1-6);
const indexAt=event=>{const box=event.currentTarget.getBoundingClientRect();return clamp(Math.round(((event.clientX-box.left)/box.width*320-X0-6)/((X1-X0-12)/11)),0,11);};

function Lines({count=1,area=false,step=false,label}){
  const {seed,say}=useDemo(),[at,setAt]=useState(null);
  const rows=Array.from({length:count},(_,k)=>walk(seed*7+k*13,12)),y=scale(0,100,Y1,Y0);
  const points=row=>row.map((v,i)=>[x(i),y(v)]);
  const shape=row=>step?points(row).map(([px,py],i)=>i?`H${px.toFixed(1)}V${py.toFixed(1)}`:`M${px.toFixed(1)},${py.toFixed(1)}`).join(''):line(points(row));
  const move=event=>{const i=indexAt(event);setAt(i);say(`${MONTHS[i]}: ${rows.map((row,k)=>count>1?`${SERVICES[k]} ${row[i]}`:`${row[i]} enquiries`).join(' · ')}`);};
  return <><Svg label={label} onPointerMove={move} onPointerDown={move} onPointerLeave={()=>setAt(null)}>
    <Grid/><XLabels labels={MONTHS} x={x} every={2}/>
    {rows.map((row,k)=><g key={k}>{area&&<path className={`f${k+1} wg-area`} d={`${shape(row)}V${Y1}H${x(0).toFixed(1)}Z`}/>}<path className={`s${k+1} wg-line`} d={shape(row)}/></g>)}
    {at!==null&&<><line className="wg-cross" x1={x(at)} x2={x(at)} y1={Y0} y2={Y1}/>{rows.map((row,k)=><circle key={k} className={`f${k+1} wg-ring`} cx={x(at)} cy={y(row[at])} r="4.5"/>)}</>}
  </Svg>{count>1&&<Legend items={SERVICES.slice(0,count)}/>}</>;
}

function Stack({stream=false,label}){
  const {seed,say}=useDemo(),[at,setAt]=useState(null);
  const rows=[0,1,2].map(k=>walk(seed*5+k*17,12,{lo:8,hi:30}));
  const totals=MONTHS.map((_,i)=>sum(rows.map(row=>row[i]))),max=Math.ceil(Math.max(...totals)*1.1/20)*20;
  const y=stream?scale(-max/2,max/2,Y1,Y0):scale(0,max,Y1,Y0);
  const bands=rows.map((row,k)=>{
    const low=MONTHS.map((_,i)=>(stream?-totals[i]/2:0)+sum(rows.slice(0,k).map(r=>r[i]))),top=low.map((v,i)=>v+row[i]);
    return `${line(top.map((v,i)=>[x(i),y(v)]))} ${line(low.map((v,i)=>[x(i),y(v)]).reverse()).replace('M','L')}Z`;
  });
  const move=event=>{const i=indexAt(event);setAt(i);say(`${MONTHS[i]}: ${rows.map((row,k)=>`${SERVICES[k]} ${row[i]}`).join(' · ')} · total ${totals[i]}`);};
  return <><Svg label={label} onPointerMove={move} onPointerDown={move} onPointerLeave={()=>setAt(null)}>
    {!stream&&<Grid max={max}/>}<XLabels labels={MONTHS} x={x} every={2}/>
    {bands.map((d,k)=><path key={k} className={`f${k+1} wg-gap`} d={d}/>)}
    {at!==null&&<line className="wg-cross" x1={x(at)} x2={x(at)} y1={Y0} y2={Y1}/>}
  </Svg><Legend items={SERVICES}/></>;
}

function Sparklines(){
  const {seed,say}=useDemo();
  const rows=['Visitors','Enquiries','Quotes sent','Projects won'].map((name,k)=>({name,data:walk(seed*3+k*11,16)}));
  return <div className="wg-scroll-x"><table className="wg-table wg-spark"><tbody>{rows.map(({name,data},k)=>{
    const lo=Math.min(...data),hi=Math.max(...data),sx=scale(0,15,2,98),sy=scale(lo,hi,24,4),change=Math.round((data[15]-data[0])/data[0]*100);
    return <tr key={name} {...hot(say,`${name}: ${data[0]} to ${data[15]} over 16 weeks`)}><th scope="row">{name}</th>
      <td><svg viewBox="0 0 100 28" className="wg-sparkline" aria-hidden="true"><path className={`s${k%2+1} wg-line`} d={line(data.map((v,i)=>[sx(i),sy(v)]))}/><circle className={`f${k%2+1}`} cx={sx(15)} cy={sy(data[15])} r="2.6"/></svg></td>
      <td className="wg-num">{data[15]}</td><td className={change<0?'wg-down':'wg-up'}>{change<0?'▼':'▲'} {Math.abs(change)}%</td></tr>;
  })}</tbody></table></div>;
}

function Candles(){
  const {seed,say}=useDemo(),r=random(seed*9);let price=50;
  const days=Array.from({length:16},(_,i)=>{const open=price,close=clamp(open+(r()-.48)*16,12,92);price=close;return {day:i+1,open,close,high:Math.max(open,close)+r()*6,low:Math.min(open,close)-r()*6};});
  const cx=scale(0,15,X0+10,X1-10),y=scale(0,100,Y1,Y0);
  return <><Svg label="Candlestick chart of a price over sixteen days"><Grid/>
    {days.map((d,i)=>{const up=d.close>=d.open,tone=up?'1':'8';return <g key={i} {...hot(say,`Day ${d.day}: open ${d.open.toFixed(1)}, high ${d.high.toFixed(1)}, low ${d.low.toFixed(1)}, close ${d.close.toFixed(1)}`)}>
      <rect x={cx(i)-8} y={Y0} width="16" height={Y1-Y0} fill="transparent"/>
      <line className={`s${tone}`} strokeWidth="1.5" x1={cx(i)} x2={cx(i)} y1={y(d.high)} y2={y(d.low)}/>
      <rect className={`f${tone}`} x={cx(i)-5} width="10" rx="2" y={y(Math.max(d.open,d.close))} height={Math.max(2,Math.abs(y(d.open)-y(d.close)))}/></g>;})}
    <XLabels labels={days.map(d=>d.day)} x={cx} every={3}/>
  </Svg><Legend items={['Closed higher','Closed lower']} tones={['b1','b8']}/></>;
}

export default [
  {name:'Line chart',use:'you want to show how one number moves over time, such as monthly enquiries or weekly sales.',data:true,Demo:()=><Lines label="Line chart of monthly enquiries"/>},
  {name:'Multi-line chart',use:'you need to compare a few things over the same period, such as three services or three branches. Keep it to four lines or fewer.',data:true,Demo:()=><Lines count={3} label="Line chart comparing three services by month"/>},
  {name:'Area chart',use:'the size of the number matters as much as its direction, such as total visitors or stock on hand.',data:true,Demo:()=><Lines area label="Area chart of monthly volume"/>},
  {name:'Stacked area chart',use:'you want the total and what it is made of in one view, such as revenue split by product line.',data:true,Demo:()=><Stack label="Stacked area chart of three services by month"/>},
  {name:'Step chart',use:'the value holds steady and then jumps, such as a price list, a subscription tier or a stock level between deliveries.',data:true,Demo:()=><Lines step label="Step chart of a value that changes in jumps"/>},
  {name:'Sparkline',use:'space is tight and the shape of the trend is enough, such as inside a table row or a summary card.',data:true,Demo:Sparklines},
  {name:'Candlestick chart',use:'each period has an opening, closing, highest and lowest value, such as share prices or daily exchange rates.',data:true,Demo:Candles},
  {name:'Stream graph',use:'you want to show how the mix shifts over time and exact totals matter less, such as topic or channel popularity.',data:true,Demo:()=><Stack stream label="Stream graph of three services by month"/>},
];
