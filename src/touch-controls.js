import {laneAtPoint,mobileLaneRegion} from './rhythm.js?v=52a31721d8bc6d';
export class TouchControls {
 constructor(root,{active,lanes,onPress,onRelease}){this.active=active;this.lanes=lanes;this.onPress=onPress;this.onRelease=onRelease;this.pointers=new Map();this.lanesDirty=true;this.surface=document.createElement('div');this.surface.id='touch-lanes';this.surface.hidden=true;this.surface.setAttribute('aria-label','Swipe note lanes');root.append(this.surface);
  this.surface.addEventListener('pointerdown',e=>{if(!this.active())return;e.preventDefault();this.surface.setPointerCapture(e.pointerId);this.move(e,true);});
  this.surface.addEventListener('pointermove',e=>{if(this.pointers.has(e.pointerId)){e.preventDefault();this.move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.surface.addEventListener(type,e=>this.release(e.pointerId,e.timeStamp));
  window.addEventListener('blur',()=>this.clear());
 }
 move(event,first=false){const r=this.surface.getBoundingClientRect(),count=this.lanes(),region=mobileLaneRegion(count),next=laneAtPoint(event.clientX,r.left+r.width*region.left/1280,r.width*region.width/1280,count),before=this.pointers.get(event.pointerId);if(before===next&&!first)return;if(before!==undefined){this.pointers.delete(event.pointerId);if(![...this.pointers.values()].includes(before))this.onRelease(before,event.timeStamp);}this.pointers.set(event.pointerId,next);this.lanesDirty=true;this.surface.dataset.lastLane=next;this.surface.dataset.presses=Number(this.surface.dataset.presses||0)+1;if(before!==undefined)this.surface.dataset.swipes=Number(this.surface.dataset.swipes||0)+1;this.surface.dataset.activePointers=this.pointers.size;this.onPress(next,event.timeStamp);}
 release(id,eventAt){const lane=this.pointers.get(id);if(lane===undefined)return;this.pointers.delete(id);this.lanesDirty=true;this.surface.dataset.activePointers=this.pointers.size;if(![...this.pointers.values()].includes(lane))this.onRelease(lane,eventAt);}
 clear(){for(const id of [...this.pointers.keys()])this.release(id);}
 update(enabled,count){
  if(this.surface.hidden===enabled)this.surface.hidden=!enabled;
  if(!enabled&&this.pointers.size)this.clear();
  if(this.surface.dataset.lanes!==String(count)){
    this.surface.dataset.lanes=count;
    const {left,stride}=mobileLaneRegion(count);
    const widths=Array.from({length:count},(_,i)=>`${(stride+(i===0||i===count-1?left:0))/12.8}%`);
    this.surface.style.gridTemplateColumns=widths.join(' ');
    this.surface.innerHTML=Array.from({length:count},(_,i)=>`<span aria-hidden="true" data-lane="${i}"></span>`).join('');
    this.lanesDirty=true;
  }
  if(!this.lanesDirty)return;
  this.lanesDirty=false;
  const held=new Set(this.pointers.values());
  for(const lane of this.surface.children)lane.classList.toggle('held',held.has(Number(lane.dataset.lane)));
 }
}
