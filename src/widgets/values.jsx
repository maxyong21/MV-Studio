import {useEffect,useState} from 'react';
import {useDemo,walk,values,scale,line,arc,polar,money,clamp,Svg,Btn,useTick} from './kit.jsx';

function Kpi(){
  const {seed}=useDemo(),[range,setRange]=useState('month'),value=values(seed*31,1,18,60)[0]*({week:1,month:4,year:48})[range];
  return <div className="wg-stat"><span className="wg-eyebrow">New enquiries</span><strong className="wg-hero">{value.toLocaleString()}</strong>
    <div className="wg-seg" role="group" aria-label="Period">{['week','month','year'].map(key=><button type="button" key={key} aria-pressed={range===key} onClick={()=>setRange(key)}>This {key}</button>)}</div></div>;
}

function TrendCard(){
  const {seed,say}=useDemo(),data=walk(seed*37,14,{lo:30,hi:95}),change=Math.round((data[13]-data[6])/data[6]*100),sx=scale(0,13,2,198),sy=scale(Math.min(...data),Math.max(...data),40,6);
  return <div className="wg-stat" onPointerEnter={()=>say(`Last 14 days: from ${money(data[0]*120)} to ${money(data[13]*120)}`)}><span className="wg-eyebrow">Revenue this week</span>
    <div className="wg-row wg-baseline"><strong className="wg-hero">{money(data[13]*120)}</strong><span className={change<0?'wg-down':'wg-up'}>{change<0?'▼':'▲'} {Math.abs(change)}% vs last week</span></div>
    <svg className="wg-sparkline wg-wide" viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true"><path className="f1 wg-area" d={`${line(data.map((v,i)=>[sx(i),sy(v)]))}V46H2Z`}/><path className="s1 wg-line" d={line(data.map((v,i)=>[sx(i),sy(v)]))}/></svg></div>;
}

function Comparison(){
  const {seed}=useDemo(),[now,before]=values(seed*41,2,40,95),diff=now-before,max=Math.max(now,before);
  return <div className="wg-stat"><span className="wg-eyebrow">Projects delivered</span>
    {[['This quarter',now,'b1'],['Last quarter',before,'bn']].map(([label,v,tone])=><div className="wg-compare" key={label}><span>{label}</span><div className="wg-track"><i className={tone} ref={node=>node?.style.setProperty('--w',`${v/max*100}%`)}/></div><b>{v}</b></div>)}
    <span className={diff<0?'wg-down':'wg-up'}>{diff<0?'▼':'▲'} {Math.abs(diff)} {diff<0?'fewer':'more'} than last quarter ({Math.round(Math.abs(diff)/before*100)}%)</span></div>;
}

function Gauge(){
  const {say}=useDemo(),[value,setValue]=useState(68),turn=v=>-.25+v/200,[nx,ny]=polar(110,104,62,turn(value)),state=value<50?'Needs attention':value<80?'Fair':'Good';
  return <div className="wg-stack wg-center"><Svg w={220} h={124} label={`Gauge reading ${value} out of 100, ${state}`}>
    <path className="fn" fillOpacity=".16" d={arc(110,104,70,90,-.25,.25)}/><path className="f1" d={arc(110,104,70,90,-.25,Math.max(-.2499,turn(value)))}/>
    {[50,80].map(mark=>{const [ax,ay]=polar(110,104,66,turn(mark)),[bx,by]=polar(110,104,94,turn(mark));return <line key={mark} className="wg-tick" x1={ax} y1={ay} x2={bx} y2={by}/>;})}
    <line className="wg-needle" x1="110" y1="104" x2={nx} y2={ny}/><circle className="fi" cx="110" cy="104" r="5"/>
    </Svg>
    <strong className="wg-hero">{value}</strong><span className="wg-muted">Site health score · {state}</span>
    <label className="wg-field">Move the needle<input type="range" min="0" max="100" value={value} onChange={event=>{setValue(+event.target.value);say(`Score ${event.target.value}: marks at 50 and 80 separate poor, fair and good`);}}/></label></div>;
}

function Ring(){
  const [value,setValue]=useState(72),size=2*Math.PI*42;
  return <div className="wg-row wg-center"><Svg w={110} h={110} label={`${value} percent complete`}><circle className="wg-ring-track" cx="55" cy="55" r="42"/><circle className="wg-ring-value s1" cx="55" cy="55" r="42" strokeDasharray={`${size*value/100} ${size}`} transform="rotate(-90 55 55)"/><text className="wg-big" x="55" y="61" textAnchor="middle">{value}%</text></Svg>
    <div className="wg-stack"><b>Profile complete</b><span className="wg-muted">{value>=100?'All done.':`${Math.ceil((100-value)/14)} steps to go`}</span><div className="wg-row"><Btn onClick={()=>setValue(v=>clamp(v-14,0,100))}>− Step</Btn><Btn onClick={()=>setValue(v=>clamp(v+14,0,100))}>+ Step</Btn></div></div></div>;
}

function Progress(){
  const [value,setValue]=useState(35),[running,setRunning]=useState(false),tick=useTick(120,running);
  useEffect(()=>{if(running)setValue(v=>{if(v>=100){setRunning(false);return 100;}return Math.min(100,v+2);});},[tick,running]);
  return <div className="wg-stack"><div className="wg-row wg-between"><b>{value>=100?'Upload complete':running?'Uploading product photos…':'Upload paused'}</b><span className="wg-num">{value}%</span></div>
    <div className="wg-track wg-tall" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={value} aria-label="Upload progress"><i className="b1" ref={node=>node?.style.setProperty('--w',`${value}%`)}/></div>
    <div className="wg-row"><Btn className="wg-primary" onClick={()=>{if(value>=100)setValue(0);setRunning(!running);}}>{running?'Pause':value>=100?'Run again':'Start'}</Btn><Btn onClick={()=>{setRunning(false);setValue(0);}}>Reset</Btn></div></div>;
}

function Segmented(){
  const {say}=useDemo(),[parts,setParts]=useState([['Photos',42,'b1'],['Documents',23,'b2'],['Backups',15,'b3']]),used=parts.reduce((total,part)=>total+part[1],0);
  return <div className="wg-stack"><div className="wg-row wg-between"><b>Storage used</b><span className="wg-num">{used} of 100 GB</span></div>
    <div className="wg-track wg-tall wg-split">{parts.map(([name,size,tone])=><i key={name} className={tone} ref={node=>node?.style.setProperty('--w',`${size}%`)} onPointerEnter={()=>say(`${name}: ${size} GB`)}/>)}</div>
    <ul className="wg-legend">{parts.map(([name,size,tone])=><li key={name}><i className={tone}/>{name} {size} GB</li>)}</ul>
    <div className="wg-row"><Btn onClick={()=>setParts(list=>list.map((part,i)=>i===0&&used<96?[part[0],part[1]+4,part[2]]:part))}>Add photos</Btn><Btn onClick={()=>setParts(list=>list.map((part,i)=>i===2?[part[0],Math.max(1,part[1]-4),part[2]]:part))}>Clear backups</Btn></div></div>;
}

function Meter(){
  const [value,setValue]=useState(62),state=value>=90?['Critical','wg-s-critical','✕']:value>=70?['Getting full','wg-s-warning','!']:['Healthy','wg-s-good','✓'];
  return <div className="wg-stack"><div className="wg-row wg-between"><b>Monthly email quota</b><span className={`wg-status ${state[1]}`}><i aria-hidden="true">{state[2]}</i>{state[0]}</span></div>
    <div className="wg-track wg-tall wg-zones"><i className="b1" ref={node=>node?.style.setProperty('--w',`${value}%`)}/><span className="wg-mark wg-m70"/><span className="wg-mark wg-m90"/></div>
    <span className="wg-muted">{value*50} of 5,000 emails sent. Warnings start at 70% and 90%.</span>
    <label className="wg-field">Emails sent<input type="range" min="0" max="100" value={value} onChange={event=>setValue(+event.target.value)}/></label></div>;
}

function Countdown(){
  const [end,setEnd]=useState(()=>Date.now()+150000);useTick(1000);
  const left=Math.max(0,Math.round((end-Date.now())/1000)),parts=[['Hours',Math.floor(left/3600)],['Minutes',Math.floor(left%3600/60)],['Seconds',left%60]];
  return <div className="wg-stack wg-center"><span className="wg-eyebrow">{left?'Flash sale ends in':'Sale has ended'}</span>
    <div className="wg-row wg-clock" role="timer" aria-label={`${parts.map(([label,v])=>`${v} ${label}`).join(', ')} left`}>{parts.map(([label,v])=><div key={label}><strong className="wg-hero">{String(v).padStart(2,'0')}</strong><small>{label}</small></div>)}</div>
    <div className="wg-row"><Btn onClick={()=>setEnd(Date.now()+150000)}>Restart</Btn><Btn onClick={()=>setEnd(Date.now()+10000)}>Jump to last 10 seconds</Btn></div></div>;
}

function Counter(){
  const [run,setRun]=useState(0),[shown,setShown]=useState([0,0,0]),targets=[1284,96,37];
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(targets);return;}
    let frame;const start=performance.now(),step=now=>{const t=Math.min(1,(now-start)/1100),eased=1-(1-t)**3;setShown(targets.map(target=>Math.round(target*eased)));if(t<1)frame=requestAnimationFrame(step);};
    frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);
  },[run]);
  return <div className="wg-stack"><div className="wg-row wg-counters">{[['Orders shipped',''],['On-time delivery','%'],['Active clients','']].map(([label,unit],i)=><div key={label}><strong className="wg-hero">{shown[i].toLocaleString()}{unit}</strong><small>{label}</small></div>)}</div><Btn onClick={()=>setRun(v=>v+1)}>Replay count-up</Btn></div>;
}

const STATES=[['Operational','wg-s-good','✓'],['Degraded','wg-s-warning','!'],['Partial outage','wg-s-serious','▲'],['Down','wg-s-critical','✕']];
function Status(){
  const [levels,setLevels]=useState([0,0,1,0]);
  return <ul className="wg-list">{['Website','Checkout','Email delivery','Admin panel'].map((name,i)=>{const state=STATES[levels[i]];return <li key={name} className="wg-row wg-between"><span>{name}</span>
    <button type="button" className={`wg-status wg-press ${state[1]}`} onClick={()=>setLevels(list=>list.map((v,k)=>k===i?(v+1)%4:v))} aria-label={`${name}: ${state[0]}. Change status`}><i aria-hidden="true">{state[2]}</i>{state[0]}</button></li>;})}
    <li className="wg-muted">Click a status to cycle through the four states. Each has an icon as well as a colour.</li></ul>;
}

function Scorecard(){
  const {seed,say}=useDemo(),actual=values(seed*43,4,55,118);
  const rows=[['Revenue','RM 80k',actual[0]],['New clients','12',actual[1]],['On-time delivery','95%',actual[2]],['Satisfaction','4.5 / 5',actual[3]]];
  return <div className="wg-scroll-x"><table className="wg-table"><thead><tr><th scope="col">Measure</th><th scope="col">Target</th><th scope="col">Achieved</th><th scope="col">Grade</th></tr></thead>
    <tbody>{rows.map(([name,target,percent])=>{const state=percent>=100?STATES[0]:percent>=80?STATES[1]:STATES[3],grade=percent>=100?'On target':percent>=80?'Close':'Behind';
      return <tr key={name} onPointerEnter={()=>say(`${name}: ${percent}% of the ${target} target`)}><th scope="row">{name}</th><td>{target}</td><td className="wg-num">{percent}%</td><td><span className={`wg-status ${state[1]}`}><i aria-hidden="true">{state[2]}</i>{grade}</span></td></tr>;})}</tbody></table></div>;
}

function Goal(){
  const {toast}=useDemo(),[raised,setRaised]=useState(6400),goal=10000,percent=Math.min(100,Math.round(raised/goal*100));
  return <div className="wg-stack"><div className="wg-row wg-between"><b>December sales goal</b><span className="wg-muted">19 days left</span></div>
    <div className="wg-row wg-baseline"><strong className="wg-hero">{money(raised)}</strong><span className="wg-muted">of {money(goal)}</span></div>
    <div className="wg-track wg-tall" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-label="Goal progress"><i className={percent>=100?'b3':'b1'} ref={node=>node?.style.setProperty('--w',`${percent}%`)}/></div>
    <span className="wg-muted">{percent>=100?'Goal reached. Well done.':`${money(Math.ceil((goal-raised)/19))} a day needed to get there.`}</span>
    <div className="wg-row"><Btn className="wg-primary" onClick={()=>{setRaised(v=>v+800);if(raised+800>=goal&&raised<goal)toast('Goal reached');}}>Record a RM 800 sale</Btn><Btn onClick={()=>setRaised(6400)}>Reset</Btn></div></div>;
}

export default [
  {name:'KPI card (stat tile)',use:'one number answers the question, such as enquiries this month. Put the few that matter most at the top of the page.',data:true,Demo:Kpi},
  {name:'Trend card',use:'the number needs context: is it up or down, and what has it been doing lately?',data:true,Demo:TrendCard},
  {name:'Comparison card',use:'you are judging this period against the last one and want the difference spelled out.',data:true,Demo:Comparison},
  {name:'Gauge (speedometer)',use:'a single reading sits on a known scale with good and bad zones, such as a health or performance score.',Demo:Gauge},
  {name:'Radial progress ring',use:'you want a compact, friendly way to show completion, such as profile setup or a daily target.',Demo:Ring},
  {name:'Progress bar',use:'something is underway and people need to know how far along it is, such as an upload or an import.',Demo:Progress},
  {name:'Segmented progress bar',use:'the bar should also show what the used part is made of, such as storage by file type.',Demo:Segmented},
  {name:'Meter',use:'you are showing a level against a fixed limit with warning thresholds, such as quota, stock or capacity.',Demo:Meter},
  {name:'Countdown timer',use:'there is a deadline people should feel, such as a sale ending, a launch or a booking hold.',Demo:Countdown},
  {name:'Counter (animated number)',use:'you want headline figures to land with a little energy, usually on a summary or landing section.',Demo:Counter},
  {name:'Status indicator',use:'people need to see at a glance what is working and what is not, such as system or order status.',Demo:Status},
  {name:'Scorecard',use:'management wants several measures graded against targets in one compact table.',data:true,Demo:Scorecard},
  {name:'Goal tracker',use:'a team is working toward a target with a deadline and you want the pace needed to be obvious.',Demo:Goal},
];
