import {laneAtPoint} from './rhythm.js';
export class TouchControls {
 constructor(root,{active,lanes,onPress,onRelease}){this.active=active;this.lanes=lanes;this.onPress=onPress;this.onRelease=onRelease;this.pointers=new Map();this.surface=document.createElement('div');this.surface.id='touch-lanes';this.surface.hidden=true;this.surface.setAttribute('aria-label','Swipe note lanes');root.append(this.surface);
  this.surface.addEventListener('pointerdown',e=>{if(!this.active())return;e.preventDefault();this.surface.setPointerCapture(e.pointerId);this.move(e,true);});
  this.surface.addEventListener('pointermove',e=>{if(this.pointers.has(e.pointerId)){e.preventDefault();this.move(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.surface.addEventListener(type,e=>this.release(e.pointerId));
  window.addEventListener('blur',()=>this.clear());
 }
 move(event,first=false){const r=this.surface.getBoundingClientRect(),next=laneAtPoint(event.clientX,r.left,r.width,this.lanes()),before=this.pointers.get(event.pointerId);if(before===next&&!first)return;if(before!==undefined){this.pointers.delete(event.pointerId);if(![...this.pointers.values()].includes(before))this.onRelease(before);}this.pointers.set(event.pointerId,next);this.surface.dataset.lastLane=next;this.surface.dataset.presses=Number(this.surface.dataset.presses||0)+1;if(before!==undefined)this.surface.dataset.swipes=Number(this.surface.dataset.swipes||0)+1;this.surface.dataset.activePointers=this.pointers.size;this.onPress(next);}
 release(id){const lane=this.pointers.get(id);if(lane===undefined)return;this.pointers.delete(id);this.surface.dataset.activePointers=this.pointers.size;if(![...this.pointers.values()].includes(lane))this.onRelease(lane);}
 clear(){for(const id of [...this.pointers.keys()])this.release(id);}
 update(enabled,count){this.surface.hidden=!enabled;if(!enabled)this.clear();if(this.surface.dataset.lanes!==String(count)){this.surface.dataset.lanes=count;this.surface.style.setProperty('--touch-count',count);this.surface.innerHTML=Array.from({length:count},(_,i)=>`<span aria-hidden="true" data-lane="${i}"></span>`).join('');}for(const el of this.surface.children)el.classList.toggle('held',[...this.pointers.values()].includes(Number(el.dataset.lane)));}
}
