export function storageReadout(areas,formatValue,locale) {
  const values=areas.map(area=>({...area,amount:Number.isFinite(area.bytes)&&area.bytes>0?area.bytes:0}));
  const total=values.reduce((sum,area)=>sum+area.amount,0);
  const percent=new Intl.NumberFormat(locale,{style:'percent',maximumSignificantDigits:2});
  return values.map(area=>{
    const share=total>0?area.amount/total:0;
    return {...area,share,readout:`${area.label}: ${formatValue(area.amount)}, ${percent.format(share)}`};
  });
}

// Source StackedMeter: keep true shares; never enlarge a tiny category to make
// it appear visible. One-pixel seams belong to the following visible segment.
export function storageMeterGeometry(entries,width,height=8) {
  let largest=-1,offset=0;
  const segments=[];
  for(let index=0;index<entries.length;index++) {
    const share=entries[index].share;
    if(!(share>0))continue;
    if(largest<0||share>entries[largest].share)largest=index;
    const seam=segments.length?1:0;
    if(share*width-seam>=1)segments.push({index,start:offset,share,seam,startRadius:segments.length?Math.min(4,height/4):height/2,endRadius:Math.min(4,height/4)});
    offset+=share;
  }
  if(largest<0)return {kind:'empty',segments:[]};
  const first=segments[0],last=segments.at(-1);
  if(!first||!last||(last.start+last.share-first.start)*width<height)return {kind:'dot',index:largest,segments:[]};
  last.endRadius=height/2;
  return {kind:'segments',segments};
}
export const storagePercent=value=>Number((value*100).toFixed(3));

// c71860c77-B72Ova_w X (et=[1,.72,.5,.32,.2]): an area's kinds with bytes. Counted kinds take the area
// colour on the opacity ramp in order; muted and outside kinds take the muted colour at full opacity. The
// 4px bar holds only the counted kinds, each as its share of their total.
export const KIND_OPACITY_RAMP=Object.freeze([1,.72,.5,.32,.2]);
// A kind the core can't measure per session (unmeasured: its sessions sit in one database) is listed with no bytes.
export function storageKinds(items,{color,mutedColor}) {
  const painted=items.filter(item=>item.bytes>0||item.unmeasured===true).reduce((list,item)=>{
    const rank=list.filter(other=>!other.muted&&!other.outside).length;
    list.push({...item,paint:item.muted||item.outside?{backgroundColor:mutedColor,opacity:1}:{backgroundColor:color,opacity:KIND_OPACITY_RAMP[Math.min(rank,KIND_OPACITY_RAMP.length-1)]}});
    return list;
  },[]);
  const counted=painted.filter(item=>!item.outside&&item.unmeasured!==true),total=counted.reduce((sum,item)=>sum+item.bytes,0);
  return {items:painted,bar:counted.map(item=>({...item,width:total>0?item.bytes/total*100:0})),total};
}
