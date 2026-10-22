export const RADIUS=.43, HEIGHT=2.35;
export function createPlayer(p={}){return {x:p.x??0,y:p.y??0,z:p.z??0,vx:0,vy:0,vz:0,grounded:false,jumpsLeft:2,coyote:0,windTime:0,windX:0,windZ:0};}
export function resetPlayer(p,position){Object.assign(p,createPlayer(position));return p;}
export function launchWind(p,dx,dz){
 const length=Math.hypot(dx,dz);if(!length)return false;
 p.windX=dx/length;p.windZ=dz/length;p.windTime=1.65;
 p.vx=p.windX*18;p.vz=p.windZ*18;p.vy=23;p.grounded=false;p.coyote=0;p.jumpsLeft=1;
 return true;
}
export function isWithin(p,q,r=1.5){return Math.hypot(p.x-q.x,p.y+1-q.y,p.z-q.z)<r;}
const overlap=(p,b)=>Math.abs(p.x-b.x)<b.w/2+RADIUS&&Math.abs(p.z-b.z)<b.d/2+RADIUS;
export function stepPlayer(p,input,platforms,delta){
 const dt=Math.min(Math.max(delta,0),.1), steps=Math.max(1,Math.ceil(dt/(1/120))), h=dt/steps;
 if(input.jump&&!(p.windTime>0)&&(p.grounded||p.coyote>0||p.jumpsLeft>0)){
   p.vy=10.8;p.jumpsLeft=(p.grounded||p.coyote>0)?1:p.jumpsLeft-1;p.grounded=false;p.coyote=0;
 }
 let ix=input.x||0,iz=input.z||0;const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
 for(let s=0;s<steps;s++){
   const inWind=p.windTime>0,gliding=!!input.glide&&!p.grounded&&p.vy<=0;
   const accel=p.grounded?16:9,speed=input.sprint?11:gliding?9:7.5,blend=1-Math.exp(-accel*h);
   const targetX=inWind?p.windX*18+ix*3:ix*speed,targetZ=inWind?p.windZ*18+iz*3:iz*speed;
   p.vx+=(targetX-p.vx)*blend;p.vz+=(targetZ-p.vz)*blend;
   p.windTime=Math.max(0,p.windTime-h);
   p.coyote=Math.max(0,p.coyote-h);
   for(const axis of ['x','z']){
     p[axis]+=p[axis==='x'?'vx':'vz']*h;
     for(const b of platforms){if(p.y>=b.y-.015||p.y+HEIGHT<=b.y-(b.h??1)+.015||!overlap(p,b))continue;
       const half=(axis==='x'?b.w:b.d)/2+RADIUS;
       p[axis]=b[axis]+(p[axis]<b[axis]?-half:half);p[axis==='x'?'vx':'vz']=0;
     }
   }
   const oldY=p.y;p.vy-=(gliding?8:26)*h;if(gliding)p.vy=Math.max(p.vy,-3.5);p.y+=p.vy*h;let onFloor=false;
   for(const b of platforms){if(!overlap(p,b))continue;
     if(p.vy<=0&&oldY>=b.y-.02&&p.y<=b.y){p.y=b.y;p.vy=0;onFloor=true;p.jumpsLeft=2;p.coyote=.1;p.windTime=0;}
     const bottom=b.y-(b.h??1);
     if(p.vy>0&&oldY+HEIGHT<=bottom+.01&&p.y+HEIGHT>=bottom){p.y=bottom-HEIGHT;p.vy=0;}
   }
   if(p.grounded&&!onFloor&&p.vy<=0)p.jumpsLeft=Math.min(p.jumpsLeft,1);
   p.grounded=onFloor;
 }
 return p;
}
