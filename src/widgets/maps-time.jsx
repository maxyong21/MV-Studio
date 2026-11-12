import {useState} from 'react';
import {useDemo,values,random,DAYS,hot,Svg,Btn,useTick,monthCells,monthName} from './kit.jsx';

// The maps are schematic on purpose: no map tiles or outside services are
// loaded. A real project would use proper boundaries.
const WEST='40,16 58,12 70,28 84,50 94,84 98,112 86,130 68,120 56,94 46,64 36,38',EAST='148,120 174,106 204,98 226,74 250,46 276,34 298,52 288,76 262,86 244,106 216,122 184,134 158,136';
const CITIES=[['George Town',44,40],['Kuala Lumpur',62,86],['Johor Bahru',86,122],['Kuantan',88,80],['Kuching',164,124],['Miri',224,82],['Kota Kinabalu',262,54]];
function Land({children,label,h=160}){return <Svg h={h} label={label}><polygon className="wg-land" points={WEST}/><polygon className="wg-land" points={EAST}/>{children}</Svg>;}
const Schematic=()=><p className="wg-caption">Schematic map of Malaysia, not to scale.</p>;

const STATES=[['PLS','Perlis',0,0],['KDH','Kedah',0,1],['KTN','Kelantan',2,1],['PNG','Penang',0,2],['PRK','Perak',1,2],['TRG','Terengganu',2,2],['SGR','Selangor',1,3],['PHG','Pahang',2,3],['KUL','Kuala Lumpur',0,4],['NSN','Negeri Sembilan',1,4],['MLK','Melaka',1,5],['JHR','Johor',2,5],['SBH','Sabah',7,2],['LBN','Labuan',6,3],['SWK','Sarawak',5,4],['PJY','Putrajaya',0,5]];
function Choropleth(){
  const {seed,say}=useDemo(),data=values(seed*29,STATES.length,4,100);
  return <><Svg h={186} label="Tile map of Malaysian states shaded by number of customers">{STATES.map(([code,name,col,row],i)=><g key={code} {...hot(say,`${name}: ${data[i]*3} customers`)}>
    <rect className="fq" fillOpacity={.1+data[i]/100*.7} x={46+col*31} y={4+row*30} width="28" height="27" rx="4"/><text className="wg-label wg-tiny" x={60+col*31} y={21+row*30} textAnchor="middle">{code}</text></g>)}
  </Svg><p className="wg-caption">Each tile is one state or territory. Darker means more customers.</p></>;
}

function Pins(){
  const {say}=useDemo(),[picked,setPicked]=useState(1),notes=['2 clients · café and bookshop','7 clients · head office','3 clients · retail','1 client · resort','2 clients · tours','1 client · print shop','2 clients · clinic and spa'];
  return <><Land label="Map with a pin for each city where we have clients">{CITIES.map(([name,x,y],i)=><g key={name} className="wg-pin" onClick={()=>{setPicked(i);say(`${name}: ${notes[i]}`);}} onPointerEnter={()=>say(`${name}: ${notes[i]}`)}>
    <circle cx={x} cy={y} r="12" fill="transparent"/><path className={picked===i?'f2':'f1'} d={`M${x},${y} l-5.5,-9 a6.4,6.4 0 1 1 11,0 Z`}/><circle className="wg-pin-hole" cx={x} cy={y-12} r="2.2"/></g>)}</Land>
    <p className="wg-caption"><b>{CITIES[picked][0]}</b> · {notes[picked]}. Click another pin.</p></>;
}

function BubbleMap(){
  const {seed,say}=useDemo(),data=values(seed*33,CITIES.length,3,40);
  return <><Land label="Map with a bubble per city sized by sales">{CITIES.map(([name,x,y],i)=><circle key={name} className="f1 wg-ring" fillOpacity=".6" cx={x} cy={y} r={4+Math.sqrt(data[i])*2.4} {...hot(say,`${name}: RM ${data[i]}k in sales`)}/>)}</Land><Schematic/></>;
}

function HeatOverlay(){
  const {seed,say}=useDemo(),r=random(seed*39),spots=CITIES.map(([name,x,y])=>({name,x,y,heat:.25+r()*.75}));
  return <><Land label="Map with a density overlay of delivery requests"><defs><radialGradient id="wg-heat"><stop offset="0" className="wg-heat-in"/><stop offset="1" className="wg-heat-out"/></radialGradient></defs>
    {spots.map(spot=><circle key={spot.name} fill="url(#wg-heat)" fillOpacity={spot.heat} cx={spot.x} cy={spot.y} r={14+spot.heat*22} {...hot(say,`${spot.name}: ${spot.heat>.7?'very high':spot.heat>.45?'moderate':'low'} demand (${Math.round(spot.heat*100)} of 100)`)}/>)}</Land><Schematic/></>;
}

function Routes(){
  const {say}=useDemo(),[picked,setPicked]=useState(0),routes=[[1,0,'4 hours by road',38],[1,2,'4 hours by road',52],[1,4,'1 h 45 min flight',21],[1,6,'2 h 35 min flight',17]];
  return <><Land label="Map of delivery routes out of Kuala Lumpur">{routes.map(([a,b,time,loads],i)=>{const [,x0,y0]=CITIES[a],[,x1,y1]=CITIES[b],d=`M${x0},${y0} Q${(x0+x1)/2},${Math.min(y0,y1)-34} ${x1},${y1}`,text=`${CITIES[a][0]} → ${CITIES[b][0]}: ${loads} deliveries a month, ${time}`;
    return <g key={b} onClick={()=>{setPicked(i);say(text);}} onPointerEnter={()=>{setPicked(i);say(text);}}><path d={d} fill="none" stroke="transparent" strokeWidth="14"/><path className={`wg-route ${picked===i?'s2 is-on':'s1'}`} d={d} strokeWidth={1.5+loads/22}/></g>;})}
    {CITIES.map(([name,x,y],i)=><circle key={name} className={`${i===1?'f2':'fi'} wg-ring`} cx={x} cy={y} r={i===1?5.5:3.5}/>)}</Land>
    <p className="wg-caption">Line thickness shows deliveries a month. Hover or tap a route.</p></>;
}

const TODAY=new Date();
function Calendar(){
  const {say}=useDemo(),[view,setView]=useState([TODAY.getFullYear(),TODAY.getMonth()]),[picked,setPicked]=useState(TODAY.getDate()),[year,month]=view;
  const r=random(year*12+month+3),events={};[['Client call','10:00'],['Design review','14:30'],['Site launch','09:00'],['Invoice due','All day'],['Team stand-up','09:30']].forEach(event=>{const day=1+Math.floor(r()*27);(events[day]||(events[day]=[])).push(event);});
  const step=by=>{const next=new Date(year,month+by,1);setView([next.getFullYear(),next.getMonth()]);setPicked(null);};
  return <div className="wg-stack"><div className="wg-row wg-between"><Btn aria-label="Previous month" onClick={()=>step(-1)}>←</Btn><b aria-live="polite">{monthName(year,month)}</b><Btn aria-label="Next month" onClick={()=>step(1)}>→</Btn></div>
    <div className="wg-cal">{DAYS.map(day=><span key={day} className="wg-cal-head">{day.slice(0,2)}</span>)}{monthCells(year,month).map((day,i)=>day?<button type="button" key={i} className={`${picked===day?'is-picked':''} ${year===TODAY.getFullYear()&&month===TODAY.getMonth()&&day===TODAY.getDate()?'is-today':''}`} aria-pressed={picked===day} aria-label={`${day} ${monthName(year,month)}${events[day]?`, ${events[day].length} event${events[day].length>1?'s':''}`:''}`} onClick={()=>{setPicked(day);say(events[day]?`${events[day].length} event(s) on the ${day}`:`Nothing booked on the ${day}`);}}>{day}{events[day]&&<i aria-hidden="true"/>}</button>:<span key={i}/>)}</div>
    <ul className="wg-list">{picked&&events[picked]?events[picked].map(([title,time])=><li key={title} className="wg-row wg-between"><b>{title}</b><span className="wg-muted">{time}</span></li>):<li className="wg-muted">{picked?'Nothing booked on this day. Days with a dot have events.':'Pick a day. Days with a dot have events.'}</li>}</ul></div>;
}

function Gantt(){
  const {say}=useDemo(),[picked,setPicked]=useState(2),tasks=[['Discovery',0,1.5,100],['Design',1,2.5,100],['Build',3,3,45],['Content',4,2,20],['Testing & launch',6,2,0]],now=4.3,x=week=>96+week*27;
  return <><Svg h={170} label="Gantt chart of five project phases across eight weeks"><g className="wg-grid">{Array.from({length:9},(_,week)=><g key={week}><line x1={x(week)} x2={x(week)} y1="16" y2="158"/>{week<8&&<text x={x(week)+13.5} y="11" textAnchor="middle">W{week+1}</text>}</g>)}</g>
    {tasks.map(([name,start,length,done],i)=>{const cy=34+i*27;return <g key={name} className="wg-pin" onClick={()=>{setPicked(i);say(`${name}: week ${Math.floor(start)+1} to week ${Math.ceil(start+length)}, ${done}% complete`);}} onPointerEnter={()=>say(`${name}: week ${Math.floor(start)+1} to week ${Math.ceil(start+length)}, ${done}% complete`)}>
      <text className="wg-label" x="90" y={cy+3.5} textAnchor="end">{name}</text><rect className="f1" fillOpacity=".3" x={x(start)} width={length*27} y={cy-8} height="16" rx="4"/><rect className="f1" x={x(start)} width={length*27*done/100} y={cy-8} height="16" rx="4"/>
      {picked===i&&<rect className="wg-outline" x={x(start)-2} width={length*27+4} y={cy-10} height="20" rx="5"/>}</g>;})}
    <line className="wg-today" x1={x(now)} x2={x(now)} y1="16" y2="158"/><text className="wg-value" x={x(now)} y="168" textAnchor="middle">Today</text></Svg>
    <p className="wg-caption"><b>{tasks[picked][0]}</b> · weeks {Math.floor(tasks[picked][1])+1}–{Math.ceil(tasks[picked][1]+tasks[picked][2])} · {tasks[picked][3]}% complete. Solid fill is work done.</p></>;
}

function RangePicker(){
  const {say}=useDemo(),year=TODAY.getFullYear(),month=TODAY.getMonth(),last=new Date(year,month+1,0).getDate(),[range,setRange]=useState([3,9]),[from,to]=range;
  const pick=day=>{const next=to!==null||day<from?[day,null]:[from,day];setRange(next);say(next[1]===null?`Start: ${day}. Now pick the end date.`:`${next[1]-next[0]+1} days selected`);};
  const label=to===null?`From ${from} — pick an end date`:`${from} – ${to} ${monthName(year,month)} · ${to-from+1} day${to-from?'s':''}`;
  return <div className="wg-stack"><div className="wg-row">{[['First week',[1,7]],['Mid-month',[10,20]],['Whole month',[1,last]]].map(([name,preset])=><Btn key={name} onClick={()=>{setRange(preset);say(`${name}: ${preset[1]-preset[0]+1} days`);}}>{name}</Btn>)}</div>
    <div className="wg-cal">{DAYS.map(day=><span key={day} className="wg-cal-head">{day.slice(0,2)}</span>)}{monthCells(year,month).map((day,i)=>day?<button type="button" key={i} aria-pressed={day===from||day===to} aria-label={`${day} ${monthName(year,month)}`} className={`${day===from||day===to?'is-picked':''} ${to!==null&&day>from&&day<to?'is-between':''}`} onClick={()=>pick(day)}>{day}</button>:<span key={i}/>)}</div>
    <b aria-live="polite">{label}</b></div>;
}

function Clocks(){
  const [h12,setH12]=useState(true);useTick(1000);const now=new Date();
  const zones=[['Kuala Lumpur','Asia/Kuala_Lumpur'],['London','Europe/London'],['New York','America/New_York'],['Tokyo','Asia/Tokyo']];
  return <div className="wg-stack"><ul className="wg-list">{zones.map(([city,zone])=>{const hour=+now.toLocaleString('en-GB',{timeZone:zone,hour:'2-digit',hour12:false}),open=hour>=9&&hour<18;
    return <li key={city} className="wg-row wg-between"><span><b>{city}</b> <small className="wg-muted">{now.toLocaleDateString('en-MY',{timeZone:zone,weekday:'short'})} · {open?'Office hours':'Closed'}</small></span><span className="wg-num wg-time">{now.toLocaleTimeString('en-MY',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:h12})}</span></li>;})}</ul>
    <Btn onClick={()=>setH12(!h12)}>Switch to {h12?'24-hour':'12-hour'} time</Btn></div>;
}

export default [
  {name:'Choropleth map',use:'you are comparing regions, such as customers or sales per state.',data:true,Demo:Choropleth},
  {name:'Pin map',use:'each location is worth pointing at, such as branches, clients or delivery points.',Demo:Pins},
  {name:'Bubble map',use:'you want both where and how much, such as sales per city.',data:true,Demo:BubbleMap},
  {name:'Heat map overlay',use:'there are too many points to plot one by one and you want to see where activity concentrates.',data:true,Demo:HeatOverlay},
  {name:'Route (flow) map',use:'movement between places is the subject, such as deliveries, shipments or travel.',Demo:Routes},
  {name:'Calendar',use:'people plan around dates, such as appointments, bookings or content schedules.',Demo:Calendar},
  {name:'Gantt chart',use:'a project has overlapping phases and you need to see what runs when and what is behind.',wide:true,Demo:Gantt},
  {name:'Date range picker',use:'the whole dashboard should answer for a period the viewer chooses.',Demo:RangePicker},
  {name:'Clock (world clock)',use:'the team or its customers are spread across time zones.',Demo:Clocks},
];
