import {useState} from 'react';
import {useDemo,values,scale,sum,arc,polar,money,hot,Svg,Grid,Legend} from './kit.jsx';

const SOURCES=['Google search','Referrals','Social media','Direct'];

function Pie({hole=0,label}){
  const {seed,say}=useDemo(),[focus,setFocus]=useState(null),data=values(seed*4,4,12,48).sort((a,b)=>b-a),total=sum(data);
  let from=0;
  return <><Svg h={176} label={label}>
    {data.map((v,i)=>{const start=from,end=from+v/total;from=end;const [lx,ly]=polar(160,88,80,(start+end)/2),text=`${SOURCES[i]}: ${v} enquiries (${Math.round(v/total*100)}%)`;
      return <g key={i} className={focus===null||focus===i?'':'wg-dim'} onPointerEnter={()=>{setFocus(i);say(text);}} onPointerLeave={()=>setFocus(null)} onClick={()=>say(text)}>
        <path className={`f${i+1} wg-gap`} d={arc(160,88,hole,66,start,end)}/>{v/total>.05&&<text className="wg-value" x={lx} y={ly+3.5} textAnchor="middle">{Math.round(v/total*100)}%</text>}</g>;})}
    {hole>0&&<><text className="wg-big" x="160" y="88" textAnchor="middle">{total}</text><text className="wg-label" x="160" y="103" textAnchor="middle">enquiries</text></>}
  </Svg><Legend items={SOURCES}/></>;
}

// Split the list in two near-equal halves along the longer side, and repeat.
function tiles(items,x,y,w,h,out=[]){
  if(items.length===1){out.push({...items[0],x,y,w,h});return out;}
  const total=sum(items.map(item=>item.value));let running=0,cut=1;
  for(let i=0;i<items.length-1;i++){running+=items[i].value;cut=i+1;if(running>=total/2)break;}
  const share=sum(items.slice(0,cut).map(item=>item.value))/total;
  if(w>=h){tiles(items.slice(0,cut),x,y,w*share,h,out);tiles(items.slice(cut),x+w*share,y,w*(1-share),h,out);}
  else{tiles(items.slice(0,cut),x,y,w,h*share,out);tiles(items.slice(cut),x,y+h*share,w,h*(1-share),out);}
  return out;
}
function Treemap(){
  const {seed,say}=useDemo(),names=['Online store','Company site','Web app','Landing page','Care plan','SEO','Hosting','Training'];
  const items=values(seed*5,8,6,60).map((value,i)=>({name:names[i],value})).sort((a,b)=>b.value-a.value),total=sum(items.map(item=>item.value));
  return <Svg h={184} label="Treemap of revenue by service">{tiles(items,4,4,312,176).map(tile=><g key={tile.name} {...hot(say,`${tile.name}: ${money(tile.value*1000)} (${Math.round(tile.value/total*100)}% of revenue)`)}>
    <rect className="f1" x={tile.x+1} y={tile.y+1} width={Math.max(1,tile.w-2)} height={Math.max(1,tile.h-2)} rx="3"/>
    {tile.w>40&&tile.h>30&&<><text className="wg-on" x={tile.x+8} y={tile.y+17}>{tile.w>70?tile.name:tile.name.split(' ')[0]}</text><text className="wg-on wg-soft" x={tile.x+8} y={tile.y+30}>{Math.round(tile.value/total*100)}%</text></>}</g>)}</Svg>;
}

function Sunburst(){
  const {seed,say}=useDemo(),groups=[['Websites',['Landing','Company','Blog']],['Stores',['Catalogue','Checkout']],['Systems',['Booking','Dashboard','Portal']]];
  const data=groups.map(([name,kids],g)=>({name,kids:kids.map((kid,k)=>({name:kid,value:values(seed*6+g*7+k,1,8,30)[0]}))})),total=sum(data.flatMap(group=>group.kids.map(kid=>kid.value)));
  let from=0;
  return <><Svg h={184} label="Sunburst chart of projects by category and type">{data.map((group,g)=>{const start=from,size=sum(group.kids.map(kid=>kid.value));let inner=start;from+=size/total;
    return <g key={group.name}><path className={`f${g+1} wg-gap`} d={arc(160,92,26,54,start,start+size/total)} {...hot(say,`${group.name}: ${size} projects (${Math.round(size/total*100)}%)`)}/>
      {group.kids.map(kid=>{const a=inner;inner+=kid.value/total;return <path key={kid.name} className={`f${g+1} wg-gap`} fillOpacity=".55" d={arc(160,92,56,84,a,inner)} {...hot(say,`${group.name} › ${kid.name}: ${kid.value} projects`)}/>;})}</g>;})}
  </Svg><Legend items={groups.map(group=>group[0])}/></>;
}

function Waffle(){
  const {say}=useDemo(),[percent,setPercent]=useState(64);
  return <div className="wg-row wg-center"><Svg w={150} h={150} label={`Waffle chart showing ${percent} percent`}>{Array.from({length:100},(_,i)=>{const col=i%10,row=9-Math.floor(i/10);return <rect key={i} className={i<percent?'f1':'fn'} fillOpacity={i<percent?1:.14} x={3+col*14.6} y={3+row*14.6} width="12.6" height="12.6" rx="2.5"/>;})}</Svg>
    <div className="wg-stack"><strong className="wg-hero">{percent}%</strong><span className="wg-muted">of this month’s target reached</span>
      <label className="wg-field">Set the value<input type="range" min="0" max="100" value={percent} onChange={event=>{setPercent(+event.target.value);say(`${event.target.value} of 100 squares filled`);}}/></label></div></div>;
}

function Funnel(){
  const {seed,say}=useDemo(),drops=values(seed*7,4,38,78),stages=['Visited site','Viewed pricing','Sent enquiry','Got a quote','Became a client'];
  const counts=[4200];drops.forEach(rate=>counts.push(Math.round(counts[counts.length-1]*rate/100)));
  const w=scale(0,counts[0],0,150);
  return <Svg h={180} label="Funnel chart of five stages from visit to client">{stages.map((name,i)=>{const half=Math.max(3,w(counts[i])/2),cy=20+i*35;
    return <g key={name} {...hot(say,i?`${name}: ${counts[i].toLocaleString()} (${Math.round(counts[i]/counts[i-1]*100)}% of the previous stage, ${(counts[i]/counts[0]*100).toFixed(1)}% overall)`:`${name}: ${counts[i].toLocaleString()} people`)}>
      <rect x="0" y={cy-16} width="320" height="33" fill="transparent"/><rect className="f1" x={214-half} width={half*2} y={cy-13} height="26" rx="4"/>
      <text className="wg-label" x="118" y={cy+3.5} textAnchor="end">{name}</text><text className="wg-value" x={214+half+6} y={cy+3.5}>{counts[i].toLocaleString()}</text></g>;})}</Svg>;
}

function Pyramid(){
  const {seed,say}=useDemo(),ages=['65+','50–64','35–49','25–34','18–24','Under 18'],base=[6,11,17,20,14,9];
  const left=base.map((v,i)=>v+values(seed*3+i,1,0,5)[0]),right=base.map((v,i)=>v+values(seed*3+i+20,1,0,5)[0]),w=scale(0,28,0,112);
  return <><Svg h={174} label="Population pyramid of customers by age and gender">{ages.map((age,i)=>{const cy=18+i*26;return <g key={age} {...hot(say,`${age}: women ${left[i]}%, men ${right[i]}%`)}>
    <rect x="0" y={cy-13} width="320" height="26" fill="transparent"/><text className="wg-label" x="160" y={cy+3.5} textAnchor="middle">{age}</text>
    <rect className="f1" x={132-w(left[i])} width={w(left[i])} y={cy-9} height="18" rx="3"/><rect className="f2" x="188" width={w(right[i])} y={cy-9} height="18" rx="3"/>
    <text className="wg-value" x={126-w(left[i])} y={cy+3.5} textAnchor="end">{left[i]}%</text><text className="wg-value" x={194+w(right[i])} y={cy+3.5}>{right[i]}%</text></g>;})}
  </Svg><Legend items={['Women','Men']}/></>;
}

function Waterfall(){
  const {seed,say}=useDemo(),v=values(seed*9,4,8,30),steps=[['Start',60,'total'],['New clients',v[0],'up'],['Upgrades',v[1],'up'],['Cancelled',-v[2],'down'],['Refunds',-Math.round(v[3]/2),'down']];
  let level=0;const bars=steps.map(([name,delta,kind])=>{const from=kind==='total'?0:level;level=kind==='total'?delta:level+delta;return {name,delta,kind,from,to:level};});
  bars.push({name:'End',delta:level,kind:'total',from:0,to:level});
  const max=Math.ceil(Math.max(...bars.map(bar=>Math.max(bar.from,bar.to)))*1.15/20)*20,y=scale(0,max,158,12),slot=278/bars.length,cx=i=>34+slot*(i+.5),tone={total:'fn',up:'f1',down:'f8'};
  return <><Svg label="Waterfall chart from starting to ending monthly revenue"><Grid max={max}/>
    {bars.map((bar,i)=>{const top=y(Math.max(bar.from,bar.to)),height=Math.max(2,Math.abs(y(bar.from)-y(bar.to)));return <g key={bar.name} {...hot(say,bar.kind==='total'?`${bar.name}: ${money(bar.to*1000)}`:`${bar.name}: ${bar.delta>0?'+':'−'}${money(Math.abs(bar.delta)*1000)}, running total ${money(bar.to*1000)}`)}>
      {i>0&&<line className="wg-guide" x1={cx(i-1)+slot*.3} x2={cx(i)-slot*.3} y1={y(bars[i-1].to)} y2={y(bars[i-1].to)}/>}
      <rect className={tone[bar.kind]} fillOpacity={bar.kind==='total'?.5:1} x={cx(i)-slot*.3} width={slot*.6} y={top} height={height} rx="3"/>
      <text className="wg-value" x={cx(i)} y={top-5} textAnchor="middle">{bar.kind==='total'?bar.to:`${bar.delta>0?'+':'−'}${Math.abs(bar.delta)}`}</text>
      <text className="wg-grid-text" x={cx(i)} y="174" textAnchor="middle">{bar.name.split(' ')[0]}</text></g>;})}
  </Svg><Legend items={['Increase','Decrease','Total']} tones={['b1','b8','bn']}/></>;
}

export default [
  {name:'Pie chart',use:'there are two to four parts and one clearly dominates, such as where enquiries come from.',data:true,Demo:()=><Pie label="Pie chart of enquiries by source"/>},
  {name:'Donut chart',use:'you want the same share view with the grand total shown in the middle.',data:true,Demo:()=><Pie hole={38} label="Donut chart of enquiries by source with the total in the centre"/>},
  {name:'Treemap',use:'there are many categories of very different sizes and you want the big ones to stand out at a glance.',data:true,Demo:Treemap},
  {name:'Sunburst chart',use:'the total breaks down in two levels, such as category and then type within it.',data:true,Demo:Sunburst},
  {name:'Waffle chart',use:'you want one percentage to feel tangible, such as progress to a target or survey agreement.',Demo:Waffle},
  {name:'Funnel chart',use:'people move through steps and drop out along the way, such as a sales pipeline or checkout.',data:true,Demo:Funnel},
  {name:'Pyramid chart',use:'you are comparing two groups across ordered bands, such as customers by age and gender.',data:true,Demo:Pyramid},
  {name:'Waterfall chart',use:'you need to explain how a starting figure became an ending figure through gains and losses.',data:true,Demo:Waterfall},
];
