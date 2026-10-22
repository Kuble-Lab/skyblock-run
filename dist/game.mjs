import * as THREE from './vendor/three.module.js';
import {createPlayer,resetPlayer,stepPlayer,isWithin,launchWind} from './physics.mjs';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const canvas=$('world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){$('error').classList.remove('hidden');throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
const scene=new THREE.Scene();scene.background=new THREE.Color('#a4dfe8');scene.fog=new THREE.Fog('#a4dfe8',85,230);
const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,400);
const hemi=new THREE.HemisphereLight('#ebffff','#7f7584',2.6);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff1cd',3.3);sun.position.set(-25,50,20);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:160});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight('#a2ddff',.5);fill.position.set(30,12,-50);scene.add(fill);
const materials=new Map();
function mat(color,opts={}){const key=color+JSON.stringify(opts);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,...opts}));return materials.get(key);}
const cubeGeo=new THREE.BoxGeometry(1,1,1);
function box(w,h,d,color,x=0,y=0,z=0,parent=scene,shadow=true){const obj=new THREE.Mesh(cubeGeo,typeof color==='string'?mat(color):color);obj.scale.set(w,h,d);obj.position.set(x,y,z);obj.castShadow=shadow;obj.receiveShadow=true;parent.add(obj);return obj;}
function mesh(geo,color,x,y,z,parent=scene,opts={}){const o=new THREE.Mesh(geo,mat(color,opts));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
let seed=89;function rnd(a=0,b=1){seed=(seed*16807)%2147483647;return a+(b-a)*(seed/2147483647);}
const platforms=[],pickable=[],islands=[],gems=[],checkpoints=[],waterfalls=[],clouds=[],spinners=[],particles=[],built=[];
const course=[
 {x:0,y:0,z:0,w:25,d:22,name:'Grüner Hafen',theme:'green'},
 {x:1,y:2,z:-32,w:14,d:13,name:'Windmühlenwiese',theme:'green'},
 {x:21,y:4,z:-51,w:15,d:14,name:'Kristallgarten',theme:'pink'},
 {x:-1,y:7,z:-76,w:17,d:14,name:'Sonnenruinen',theme:'sand'},
 {x:11,y:10,z:-106,w:21,d:18,name:'Himmelstor',theme:'green'}
];
function solid(x,y,z,w,d,h=1){const p={x,y,z,w,d,h};platforms.push(p);return p;}
function island(data,index,decorative=false){
 const {x,y,z,w,d,theme}=data;const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
 const top=theme==='secret'?'#655e98':theme==='storm'?'#8bddc8':theme==='pink'?'#b6a8de':theme==='sand'?'#e7d497':'#a2c95c';
 const soil=theme==='secret'?'#393357':theme==='storm'?'#466c78':theme==='pink'?'#8e80a7':'#b77e61';
 const m=box(w,.65,d,top,0,-.325,0,g);pickable.push(m);solid(x,y,z,w,d,.8);if(!decorative)islands.push({...data,g});
 box(w*.98,2,d*.98,soil,0,-1.6,0,g);
 box(w*.87,2.1,d*.86,theme==='secret'?'#28233f':theme==='storm'?'#35515f':theme==='pink'?'#71667f':'#926957',.2,-3.65,.1,g);
 box(w*.7,2.3,d*.7,'#786657',-.2,-5.85,-.3,g);
 box(w*.48,2.1,d*.52,'#6c6157',.4,-7.9,.5,g);
 const tip=mesh(new THREE.ConeGeometry(w*.28,5,4),'#685e56',0,-10.5,.3,g);tip.rotation.z=Math.PI;tip.rotation.y=Math.PI/4;
 for(let i=0;i<11;i++){const px=rnd(-w*.45,w*.45),pz=rnd(-d*.45,d*.45);box(rnd(.7,2),.035,rnd(.7,2),theme==='secret'?'#8978b8':theme==='pink'?'#d4bce5':theme==='sand'?'#f2dfa9':'#c1dc76',px,.015,pz,g,false);}
 if(!decorative){
   for(let i=0;i<5;i++){let tx=rnd(-w*.4,w*.4),tz=rnd(-d*.4,d*.4);if(Math.abs(tx)<3)tx=w*.36;if((index===4&&tx>1)||theme==='storm'||theme==='secret')continue;tree(g,tx,tz,theme==='pink',rnd(.8,1.25));}
   for(let i=0;i<(theme==='secret'?0:14);i++){const fx=rnd(-w*.44,w*.44),fz=rnd(-d*.44,d*.44);if(Math.abs(fx)<2)continue;flower(g,fx,fz,theme==='pink'?'#fff2a6':i%2?'#fff9dd':'#f2bbcd');}
 }
 return g;
}
function tree(parent,x,z,pink=false,s=1){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);
 box(.5,2.8,.5,'#92715a',0,1.3,0,g);box(2.9,1.4,2.5,pink?'#e7b5d7':'#448c68',0,3.2,0,g);
 box(2.2,1.1,2.1,pink?'#f3d1df':'#67ad76',-.1,4.3,0,g);box(1.4,.8,1.4,pink?'#ffe0e5':'#8cc37b',.15,5.2,0,g);
 box(1.6,1,1.6,pink?'#d7a0d6':'#529b69',1.15,3,.2,g);
}
function flower(parent,x,z,color){box(.06,.3,.06,'#548954',x,.15,z,parent,false);box(.32,.16,.32,color,x,.35,z,parent,false);}
const bonusIsland={x:63.5,y:10,z:-110,w:12,d:12,name:'Wolkenwarte',theme:'pink'};
const bonusCourse=[
 {x:130,y:14,z:-112,w:16,d:16,name:'Wolkenlauf · Start',theme:'pink'},
 {x:147,y:17,z:-135,w:13,d:12,name:'Lavendelstufen',theme:'pink'},
 {x:130,y:20,z:-158,w:14,d:13,name:'Sonnenbogen',theme:'sand'},
 {x:145,y:23,z:-182,w:18,d:16,name:'Wolkenkrone',theme:'pink'}
];
const stormCourse=[
 {x:-150,y:16,z:-30,w:18,d:18,name:'Sturmspitzen · Start',theme:'storm'},
 {x:-150,y:19,z:-66,w:16,d:16,name:'Windfänger',theme:'storm'},
 {x:-126,y:22,z:-101,w:16,d:16,name:'Wolkenschmiede',theme:'storm'},
 {x:-150,y:25,z:-138,w:20,d:18,name:'Auge des Sturms',theme:'storm'}
];
const secretGate={minX:22,maxX:110,minZ:-122,maxZ:-84,y:-3};
const secretCourse=[
 {x:280,y:-8,z:-30,w:18,d:18,name:'Sternengrotte · Pilzhain',theme:'secret'},
 {x:304,y:-8,z:-53,w:14,d:14,name:'Flüstergarten',theme:'secret'},
 {x:280,y:-8,z:-78,w:16,d:16,name:'Mondlichtbecken',theme:'secret'},
 {x:304,y:-8,z:-103,w:18,d:18,name:'Sternenschrein',theme:'secret'}
];
const finishIslands={
 main:{x:11,y:10,z:-155,w:16,d:16,name:'Baumeistertor',theme:'green'},
 bonus:{x:145,y:23,z:-230,w:16,d:16,name:'Wolkenwerk',theme:'pink'},
 storm:{x:-150,y:25,z:-197,w:16,d:16,name:'Sturmwerk',theme:'storm'},
 secret:{x:304,y:-8,z:-152,w:16,d:16,name:'Sternenwerk',theme:'secret'}
};
course.forEach((v,i)=>island(v,i));
island(bonusIsland,5);
bonusCourse.forEach((v,i)=>island(v,i));
stormCourse.forEach((v,i)=>island(v,i));
// A readable trail of short hops joins the five larger destinations.
const stones=[
 [0,.4,-13.7,4,3.5],[0,1,-19.6,4,3.6],[1,1.5,-24,4,3.5],
 [10,2.3,-36,4,4],[14.3,2.9,-40.5,4,4],[18.7,3.5,-44.7,4,4],
 [15,4.7,-60.5,4,4],[10,5.4,-64.8,4,4],[5,6.2,-68.8,4,4],
 [1,7.5,-85.8,4,4],[4,8.2,-91.3,4,4],[8,9,-96.7,4,4]
];
stones.forEach(([x,y,z,w,d],i)=>{const p=box(w,.8,d,i>5?'#d7b68d':'#9ebd73',x,y-.4,z);pickable.push(p);solid(x,y,z,w,d,.8);box(w*.75,1.4,d*.72,'#9c7e65',x,y-1.5,z);box(w*.45,1.4,d*.42,'#7f6b5d',x,y-2.9,z);for(const dx of [-1,1])box(.11,.05,.55,'#f3edb7',x+dx*.6,y+.03,z);});
// Starting dock, picnic details and a little arch facing the course.
box(5,.1,6,'#ead9ae',0,.055,2);box(1,4,.8,'#ffefd1',-2.7,2,-7);box(1,4,.8,'#ffefd1',2.7,2,-7);box(6.4,1,.9,'#ffefd1',0,4.2,-7);
for(const x of [-2.7,2.7])box(1.25,.22,1.05,'#c0d191',x,4.85,-7);
box(3,.22,1.2,'#f0bb75',-7,.9,4);for(const x of [-8,-6])box(.18,.8,.7,'#896c4f',x,.4,4);
const startRing=mesh(new THREE.TorusGeometry(1.45,.05,5,40),'#f9f4d0',0,.075,4);startRing.rotation.x=Math.PI/2;
function flag(x,y,z,color='#f2b355'){
 box(.13,4.4,.13,'#ffefd2',x,y+2.2,z);const f=box(1.5,.9,.09,color,x+.8,y+3.7,z);box(.4,.13,.4,'#ffefd2',x,y+.065,z);return f;
}
flag(-4,0,-5.5);flag(4,0,-5.5);
// Windmill with four rotating timber sails.
const mill=new THREE.Group();mill.position.set(-2.5,2,-34);scene.add(mill);
box(2.8,5.8,2.8,'#f5e4bd',0,2.9,0,mill);const roof=mesh(new THREE.ConeGeometry(2.4,2,4),'#b66450',0,6.7,0,mill);roof.rotation.y=Math.PI/4;
box(.8,1.6,.05,'#8c7a69',0,.8,1.42,mill);box(.7,.8,.05,'#779eac',.85,3,1.43,mill);
const sails=new THREE.Group();sails.position.set(0,4.8,1.6);mill.add(sails);spinners.push(sails);
for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/2;sails.add(blade);box(.16,3.9,.16,'#977d5a',0,1.7,0,blade);box(.75,2.1,.12,'#fff6d9',.34,2.35,.08,blade);for(let j=0;j<4;j++)box(.85,.06,.18,'#a48c68',.31,1.55+j*.53,.1,blade);}
mesh(new THREE.SphereGeometry(.3,8,8),'#f1cd77',0,4.8,1.8,mill);
// Crystal garden.
for(let i=0;i<8;i++){const g=new THREE.Group();g.position.set(21+rnd(-5,5),4,-51+rnd(-5,5));scene.add(g);if(Math.abs(g.position.x-21)<1.6)g.position.x+=3;for(let j=0;j<3;j++){const h=rnd(1,2.9);const c=mesh(new THREE.ConeGeometry(.5,h,5),j%2?'#bb9fe9':'#d0c4ff',rnd(-.5,.5),h/2,rnd(-.5,.5),g,{metalness:.1,roughness:.3});c.rotation.z=rnd(-.25,.25);}}
// Sun ruins: broken columns, low walls, and steps.
for(const [x,z,h] of [[-7,-79,3.4],[5,-79,4.6],[-6,-74,2.5],[5,-73,2]]){box(1.2,.35,1.2,'#f5e1b7',x,7.175,z);box(.85,h,.85,'#ead8b5',x,7+h/2,z);box(1.25,.35,1.25,'#fff0ce',x,7+h,z);}
box(8,.7,1,'#e7cfa4',-.8,11.4,-79);
// A block castle flanks the final portal.
for(const x of [3,19]){
 box(3.2,6,3.2,'#f2e8ce',x,13,-110);box(3.7,.5,3.7,'#fff3d6',x,16.1,-110);
 for(const dx of [-1.2,1.2])for(const dz of [-1.2,1.2])box(.9,1,.9,'#f2e8ce',x+dx,16.8,-110+dz);
 box(.8,1.6,.06,'#718c93',x,14.4,-108.36);flag(x,17,-110,'#e4aaaf');
}
function waterfall(x,y,z,w){
 const material=mat('#9eeafa',{transparent:true,opacity:.72,roughness:.15,emissive:'#47c3d4',emissiveIntensity:.2});
 const group=new THREE.Group();group.position.set(x,y,z);scene.add(group);
 box(w,19,.15,material,0,-9.6,0,group,false);
 for(let i=0;i<7;i++){const strand=box(.09,rnd(1,3),.03,'#dcfffa',rnd(-w*.45,w*.45),rnd(-18,0),.1,group,false);waterfalls.push(strand);}
 box(w+.2,.05,2.5,'#9eeafa',0,.04,-1.25,group,false);
}
waterfall(8,0,11.03,1.6);waterfall(-7,2,-26,1.1);waterfall(27,4,-44,1.6);waterfall(17,10,-97,2);
// Distant islands and slow square cloud banks create depth without obstructing play.
for(let i=0;i<11;i++){let x=i%2?rnd(-83,-38):rnd(42,95);const z=rnd(-150,25);if(x>21&&x<95&&z<-84&&z>-180)x+=85;const g=island({x,y:rnd(-10,6),z,w:rnd(8,17),d:rnd(8,14),theme:i%3?'green':'pink'},0,true);tree(g,0,0,i%3===0,.8);}
for(let i=0;i<28;i++){const g=new THREE.Group();g.position.set(rnd(-130,130),rnd(-22,-10),rnd(-160,70));scene.add(g);const s=rnd(2.5,5);for(let j=0;j<4;j++)box(s*rnd(1,2.5),s*rnd(.3,.8),s*rnd(1,2),'#edf6eb',j*s-s*1.5,rnd(-1,1),rnd(-s,s),g,false);clouds.push(g);}
const sea=mesh(new THREE.PlaneGeometry(1000,1000),'#8ed2dc',0,-36,0,scene,{roughness:.7});sea.rotation.x=-Math.PI/2;sea.receiveShadow=false;
// Collectables follow the main route and remain visible above the ground.
const gemLocations=[[0,1.6,-3],[0,2.6,-19.6],[3,3.6,-31],[14.3,4.5,-40.5],[21,5.6,-48],[15,6.3,-60.5],[10,7,-64.8],[-1,8.6,-72],[1,9.1,-85.8],[4,9.8,-91.3],[11,11.6,-101],[15,11.6,-106]];
gemLocations.forEach(([x,y,z],i)=>{const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);const shape=mesh(new THREE.OctahedronGeometry(.58,0),'#9b71f1',0,0,0,g,{metalness:.25,roughness:.2,emissive:'#7a42c3',emissiveIntensity:.18});shape.scale.y=1.4;const ring=mesh(new THREE.TorusGeometry(.9,.025,4,24),'#efe5ff',0,0,0,g);ring.rotation.x=Math.PI/2;gems.push({g,x,y,z,collected:false,i,level:'main'});});
course.forEach((v,i)=>{if(i===0)return;const pos={x:v.x,y:v.y,z:v.z+v.d*.27};const ring=mesh(new THREE.TorusGeometry(1,.095,6,32),'#f7edc0',pos.x,pos.y+.11,pos.z);ring.rotation.x=Math.PI/2;checkpoints.push({...pos,ring,index:i,active:false,level:'main'});flag(pos.x+2,pos.y,pos.z,'#e9cb8c');});
// Portal: segmented ivory arch with a translucent animated centre.
const portal=new THREE.Group();portal.position.set(finishIslands.main.x,finishIslands.main.y,finishIslands.main.z-3);scene.add(portal);
for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const s=box(.95,.95,.8,'#fff0d6',Math.cos(a)*2.5,3.1+Math.sin(a)*2.5,0,portal);s.rotation.z=a;}
box(6,.45,2,'#e6d8b3',0,.225,0,portal);
const portalSurface=mesh(new THREE.CircleGeometry(2.15,48),'#91ddd4',0,3.1,.05,portal,{transparent:true,opacity:.64,emissive:'#44abac',emissiveIntensity:.7,side:THREE.DoubleSide});
const portalRings=[];for(let i=0;i<3;i++){const r=mesh(new THREE.TorusGeometry(1.1+i*.42,.024,5,60),'#d8fff2',0,3.1,.12+i*.02,portal,{emissive:'#d8fff2',emissiveIntensity:1});r.rotation.z=i;portalRings.push(r);}
// A solid discovery island leads to a separate, replayable bonus course.
const bonusBeacon=mesh(new THREE.OctahedronGeometry(1.1,0),'#d7fa70',bonusIsland.x,13,-110,scene,{emissive:'#84b544',emissiveIntensity:.3});
flag(bonusIsland.x-3,10,-112,'#d7fa70');flag(bonusIsland.x+3,10,-112,'#d7fa70');
// The lime departure marking makes the bridge line visible from the Himmelstor.
box(2.3,.04,2.6,'#d7fa70',20.2,10.025,-106);
flag(20,10,-108,'#d7fa70');
// Each six-unit hop fits the same double-jump physics as the original course.
const bonusStones=[
 [136,14.7,-124],[141.5,15.5,-127.5],[146,16.2,-129],
 [143,17.7,-144],[137.5,18.5,-148],[131,19.2,-150.5],
 [133,20.7,-168],[138,21.5,-171.5],[143,22.2,-173.5]
];
bonusStones.forEach(([x,y,z])=>{const m=box(4,.8,4,'#d6b9e8',x,y-.4,z);pickable.push(m);solid(x,y,z,4,4,.8);box(2.7,2,2.7,'#88738f',x,y-1.8,z);});
const bonusGemLocations=[[130,15.6,-115],[136,16.3,-124],[147,18.6,-136],[137.5,20.1,-148],[130,21.6,-158],[133,22.3,-168],[143,23.8,-173.5],[145,24.6,-182]];
bonusGemLocations.forEach(([x,y,z],i)=>{const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);const m=mesh(new THREE.OctahedronGeometry(.65,0),'#efbe53',0,0,0,g,{metalness:.3,roughness:.2,emissive:'#c78a20',emissiveIntensity:.2});m.scale.y=1.4;gems.push({g,x,y,z,collected:false,i,level:'bonus'});});
bonusCourse.forEach((v,i)=>{if(!i)return;const pos={x:v.x,y:v.y,z:v.z+3};const ring=mesh(new THREE.TorusGeometry(1,.095,6,32),'#f7edc0',pos.x,pos.y+.11,pos.z);ring.rotation.x=Math.PI/2;checkpoints.push({...pos,ring,index:i,active:false,level:'bonus'});flag(pos.x+2,pos.y,pos.z,'#d5b3eb');});
const bonusPortal=portal.clone(true);bonusPortal.position.set(finishIslands.bonus.x,finishIslands.bonus.y,finishIslands.bonus.z-3);scene.add(bonusPortal);
const blockPickups=[];
function addBlockPack(v,i,level){const x=v.x+3,y=v.y+1,z=v.z+2;const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);box(1.25,1.25,1.25,'#dfbd8e',0,0,0,g);box(1.3,.2,1.3,'#fff0c9',0,0,0,g);box(.2,1.3,1.3,'#fff0c9',0,0,0,g);blockPickups.push({g,x,y,z,collected:false,i,level});}
course.slice(1).forEach((v,i)=>addBlockPack(v,i,'main'));
for(const [level,route] of [['bonus',bonusCourse],['storm',stormCourse],['secret',secretCourse]])[route[0],route.at(-1)].forEach((v,i)=>addBlockPack(v,i,level));
// Wind launchers make the wide gaps playable. Their arrows point at the next safe island.
const windPads=[],windRings=[];
stormCourse.slice(0,-1).forEach((from,i)=>{
 const to=stormCourse[i+1],length=Math.hypot(to.x-from.x,to.z-from.z),dx=(to.x-from.x)/length,dz=(to.z-from.z)/length;
 const x=from.x+dx*6.5,z=from.z+dz*6.5,y=from.y;
 const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
 mesh(new THREE.CylinderGeometry(1.7,1.9,.18,12),'#315c6a',0,.09,0,g);
 const ring=mesh(new THREE.TorusGeometry(1.45,.13,6,32),'#d7fa70',0,.21,0,g,{emissive:'#a7d95c',emissiveIntensity:.45});ring.rotation.x=Math.PI/2;
 const arrow=new THREE.Group();arrow.rotation.y=Math.atan2(dx,dz);g.add(arrow);
 box(.22,.05,1.55,'#fffce2',0,.23,0,arrow);
 for(const side of [-1,1]){const a=box(.18,.05,.8,'#fffce2',side*.23,.23,.55,arrow);a.rotation.y=side*-.65;}
 for(let j=0;j<3;j++){const r=mesh(new THREE.TorusGeometry(1.2-j*.12,.025,4,24),'#d6fff1',x,y+1+j*.75,z,scene,{transparent:true,opacity:.5,emissive:'#a2ffe7',emissiveIntensity:.5});r.rotation.x=Math.PI/2;windRings.push({mesh:r,base:y,phase:j/3});}
 windPads.push({x,y,z,dx,dz,index:i,armed:true});
});
const stormGemLocations=[[-154,17.6,-30],[-146,17.6,-32],[-153,20.6,-65],[-146,20.6,-67],[-130,23.6,-100],[-123,23.6,-103],[-155,26.6,-137],[-147,26.6,-139]];
stormGemLocations.forEach(([x,y,z],i)=>{const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);const m=mesh(new THREE.OctahedronGeometry(.68,0),'#45d8d0',0,0,0,g,{metalness:.25,roughness:.18,emissive:'#189eac',emissiveIntensity:.3});m.scale.y=1.4;gems.push({g,x,y,z,collected:false,i,level:'storm'});});
stormCourse.forEach((v,i)=>{
 // Upright ruins and weather vanes keep the landings easy to see from the air.
 for(const side of [-1,1]){box(.9,4.2,.9,'#edf5d6',v.x+side*(v.w/2-2),v.y+2.1,v.z+1);box(1.5,.3,1.5,'#315c6a',v.x+side*(v.w/2-2),v.y+4.35,v.z+1);}
 flag(v.x-v.w/2+2,v.y,v.z-3,'#d7fa70');
 if(!i)return;const pos={x:v.x,y:v.y,z:v.z+3};
 const ring=mesh(new THREE.TorusGeometry(1,.095,6,32),'#f7edc0',pos.x,pos.y+.11,pos.z);ring.rotation.x=Math.PI/2;
 checkpoints.push({...pos,ring,index:i,active:false,level:'storm'});
});
const stormPortal=portal.clone(true);stormPortal.position.set(finishIslands.storm.x,finishIslands.storm.y,finishIslands.storm.z-3);scene.add(stormPortal);
// A quiet trail drops below the right-hand edge by the Himmelstor waterfall.
const secretFallRing=mesh(new THREE.TorusGeometry(3,.09,6,48),'#d1b6ff',28,-3,-99,scene,{emissive:'#9278db',emissiveIntensity:.75});secretFallRing.rotation.x=Math.PI/2;
for(let i=0;i<8;i++)mesh(new THREE.OctahedronGeometry(.09,0),'#c8adff',21.5+i*.8,9-i*1.6,-99,scene,{emissive:'#b192eb',emissiveIntensity:.7});
// The hidden world is built last so the existing islands retain their seeded scenery.
secretCourse.forEach((v,i)=>island(v,i));
const secretStars=new THREE.Group();scene.add(secretStars);secretStars.visible=false;
for(let i=0;i<85;i++){const x=245+(i*43%100),y=13+(i*17%40),z=-140+(i*37%145);box(.1,.1,.1,'#c8c7f3',x,y,z,secretStars,false);}
function glowMushroom(x,y,z,color,size=1){
 const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(size);scene.add(g);
 box(.32,1.8,.32,'#afa2cd',0,.9,0,g);
 mesh(new THREE.CylinderGeometry(.45,1.65,.65,8),color,0,1.95,0,g,{emissive:color,emissiveIntensity:.5});
 for(const dx of [-.6,.6])box(.16,.05,.18,'#f2e7ff',dx,2.29,.22,g);
 const glow=mesh(new THREE.TorusGeometry(1.05,.04,4,24),color,0,1.68,0,g,{emissive:color,emissiveIntensity:1});glow.rotation.x=Math.PI/2;
}
secretCourse.forEach((v,i)=>{glowMushroom(v.x-v.w/2+2,v.y,v.z+1,'#bb8ce5',1.3);glowMushroom(v.x+v.w/2-2,v.y,v.z-2,'#66c5c1',1.6);glowMushroom(v.x-v.w/2+3,v.y,v.z-4,'#c3afe7',.7);});
const secretGemLocations=[[275,-6.4,-30],[284,-6.4,-32],[305,-6.4,-52],[279,-6.4,-77],[299,-6.4,-104],[308,-6.4,-103]];
secretGemLocations.forEach(([x,y,z],i)=>{const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);const star=mesh(new THREE.OctahedronGeometry(.6,0),'#f5b9e9',0,0,0,g,{metalness:.2,roughness:.15,emissive:'#d47dc0',emissiveIntensity:.6});star.rotation.z=Math.PI/4;gems.push({g,x,y,z,collected:false,i,level:'secret'});});
const secretRunes=[],secretBridgePieces=[];
secretCourse.slice(0,-1).forEach((from,i)=>{
 const to=secretCourse[i+1],length=Math.hypot(to.x-from.x,to.z-from.z),x=from.x+(to.x-from.x)/length*3,z=from.z+(to.z-from.z)/length*3,y=from.y;
 const ring=mesh(new THREE.TorusGeometry(1.1,.13,6,32),'#b295dc',x,y+.11,z,scene,{emissive:'#825db3',emissiveIntensity:.5});ring.rotation.x=Math.PI/2;
 const rune=box(.8,.06,.8,'#f5d2fc',x,y+.05,z);rune.rotation.y=Math.PI/4;
 secretRunes.push({x,y,z,ring,index:i,active:false});
});
secretCourse.forEach((v,i)=>{if(!i)return;const pos={x:v.x,y:v.y,z:v.z+3};const ring=mesh(new THREE.TorusGeometry(1,.095,6,32),'#f7edc0',pos.x,pos.y+.11,pos.z);ring.rotation.x=Math.PI/2;checkpoints.push({...pos,ring,index:i,active:false,level:'secret'});});
const secretPortal=portal.clone(true);secretPortal.position.set(finishIslands.secret.x,finishIslands.secret.y,finishIslands.secret.z-3);scene.add(secretPortal);
// Goal islands sit beyond genuine construction gaps. No invisible gate substitutes for a bridge.
Object.values(finishIslands).forEach(v=>island(v,6));
const constructionSites=[];
for(const [level,route] of [['main',course],['bonus',bonusCourse],['storm',stormCourse],['secret',secretCourse]]){
 const from=route.at(-1),to=finishIslands[level],startZ=from.z-from.d/2-1,endZ=to.z+to.d/2+1;
 const spots=[];for(let z=startZ;z>=endZ-.01;z-=2)spots.push({x:to.x,y:from.y-1,z});
 constructionSites.push({id:level+'-goal',level,label:'Zum Ziel bauen',from,to,spots});
 flag(to.x-3,from.y,startZ+2.4,'#eeb676');flag(to.x+3,from.y,startZ+2.4,'#eeb676');
 box(4,.04,1.4,'#f3c785',to.x,from.y+.025,startZ+2);
}
const sideSpots=[];for(let x=22.5;x<=56.5;x+=2)sideSpots.push({x,y:9,z:-106});
constructionSites.push({id:'wolkenwarte',level:'main',label:'Zur Wolkenwarte bauen',from:course[4],to:bonusIsland,spots:sideSpots});
// The avatar is assembled from simple toy-like blocks with independently animated limbs.
const avatar=new THREE.Group();scene.add(avatar);
const bodyMat=mat('#f29551');
box(.94,1.05,.52,bodyMat,0,1.24,0,avatar);box(.95,.14,.55,'#f9d47c',0,.83,0,avatar);
box(.72,.7,.69,'#ffe0a5',0,2.08,0,avatar);box(.8,.16,.76,'#5d5549',0,2.49,0,avatar);box(.18,.34,.73,'#5d5549',-.32,2.32,0,avatar);
box(.095,.1,.015,'#343a36',-.17,2.13,.352,avatar);box(.095,.1,.015,'#343a36',.17,2.13,.352,avatar);box(.2,.045,.02,'#a77651',0,1.96,.355,avatar);
box(.55,.7,.23,'#5e8e85',0,1.35,-.36,avatar);box(.35,.18,.26,'#81b3a1',0,1.75,-.36,avatar);
const limbs=[];
for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.25,.76,0);avatar.add(leg);box(.4,.62,.44,'#486b78',0,-.31,0,leg);box(.43,.19,.64,'#fff3d3',0,-.67,.08,leg);limbs.push(leg);const arm=new THREE.Group();arm.position.set(side*.68,1.66,0);avatar.add(arm);box(.35,.6,.45,bodyMat,0,-.25,0,arm);box(.32,.27,.4,'#ffe0a5',0,-.66,0,arm);limbs.push(arm);}
const glider=new THREE.Group();avatar.add(glider);glider.visible=false;
box(3.7,.1,1.25,'#d7fa70',0,2.9,-.2,glider);box(.17,.12,1.8,'#315c6a',0,2.88,-.2,glider);
for(const side of [-1,1]){const wing=box(1.3,.1,1.1,'#80ded0',side*2.15,2.72,-.2,glider);wing.rotation.z=side*-.24;box(.05,1.1,.05,'#fffce2',side*.65,2.36,-.12,glider);}
const shadow=mesh(new THREE.CircleGeometry(.67,24),'#274e45',0,.03,0,scene,{transparent:true,opacity:.15,depthWrite:false});shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
const player=createPlayer({x:0,y:0,z:4});let spawn={x:0,y:0,z:4},checkpointIndex=0;
let started=false,paused=false,won=false,building=false,elapsed=0,gemCount=0,fallCount=0,angle=0,elevation=.47,distance=12,walkTime=0,outfitIndex=0;
let currentLevel='main',bonusUnlocked=false,stormUnlocked=false,secretUnlocked=false,blocksCollected={main:0,bonus:0,storm:0,secret:0},mainSnapshot=null,bonusSnapshot=null,glideHeld=false;
try{
 bonusUnlocked=localStorage.getItem('skyblock-bonus-unlocked')==='1';
 secretUnlocked=localStorage.getItem('skyblock-secret-unlocked')==='1';
 const previousBest=localStorage.getItem('skyblock-bonus-best');
 stormUnlocked=localStorage.getItem('skyblock-storm-unlocked')==='1'||(previousBest!==null&&previousBest.trim()!==''&&Number.isFinite(Number(previousBest))&&Number(previousBest)>=0);
 if(stormUnlocked)bonusUnlocked=true;
}catch{}
const activeCourse=()=>currentLevel==='secret'?secretCourse:currentLevel==='storm'?stormCourse:currentLevel==='bonus'?bonusCourse:course;
const gemTarget=()=>currentLevel==='secret'?6:currentLevel==='main'?12:8;
const blocksLeft=()=>12+blocksCollected[currentLevel]-built.filter(b=>b.level===currentLevel).length;
const goalForLevel=(level=currentLevel)=>{const f=finishIslands[level];return {x:f.x,y:f.y,z:f.z-3};};
const worldRoute=()=>currentLevel==='main'?[...course,finishIslands.main,bonusIsland]:[...activeCourse(),finishIslands[currentLevel]];
const bestKey=()=>`skyblock-build-v1-${currentLevel}-best`;
function updateInventory(){$('blocks-left').textContent=String(blocksLeft());$('inventory-count').textContent=String(blocksLeft());}

let jumpQueued=false,audioEnabled=false,audioContext=null,lastTime=0,lastHud=0;
const keys=new Set(),joy={x:0,z:0},aim=new THREE.Vector2(0,0),raycaster=new THREE.Raycaster();
const cameraTarget=new THREE.Vector3(),cameraPos=new THREE.Vector3(),lookAt=new THREE.Vector3();
const ghost=box(2,2,2,mat('#d7fa70',{transparent:true,opacity:.4,depthWrite:false}),0,-100,0,scene,false);ghost.visible=false;
let buildSpot=null,drag=null;
const buildColors=['#dfbd8e','#b1cf70','#c3a5db','#8fced2'];
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
function sound(freq=600,duration=.12,type='sine',volume=.07){if(!audioEnabled)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.65,audioContext.currentTime+duration);gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);}catch{audioEnabled=false;}}
function sparkle(x,y,z,color='#c8a6ff',count=12){if(reduced)return;for(let i=0;i<count;i++){const m=box(.12,.12,.12,color,x,y,z,scene,false);particles.push({m,vx:rnd(-3,3),vy:rnd(1,5),vz:rnd(-3,3),life:rnd(.4,.9)});}}
function clearInput(){keys.clear();joy.x=joy.z=0;jumpQueued=false;glideHeld=false;drag=null;$('stick').style.transform='';}
function start(){started=true;paused=false;$('intro').classList.add('hidden');$('world-caption').classList.add('hidden');$('hud').classList.remove('hidden');canvas.focus({preventScroll:true});notify('Los geht’s! Mit zweimal Springen kommst du weiter.');sound(520,.2);}
$('start').onclick=start;
function updateMission(){
 $('gem-count').textContent=String(gemCount);$('gem-total').textContent=`/ ${gemTarget()}`;$('progress').style.width=`${gemCount/gemTarget()*100}%`;
 updateInventory();
 if(currentLevel==='secret')$('mission-text').textContent=gemCount===6&&secretRunes.every(r=>r.active)?'Alle Sternsplitter und Runen gefunden. Baue über die letzte Lücke zum Sternenwerk!':`Finde 6 Sternsplitter. Betritt die Runen, um Kristallbrücken zu wecken. Runen: ${secretRunes.filter(r=>r.active).length} / 3.`;
 else if(currentLevel==='storm')$('mission-text').textContent=gemCount===8?'Alle Sturmkristalle! Baue über die grosse Lücke zum Sturmwerk.':'Sammle 8 Sturmkristalle. Windkatapulte tragen dich zur nächsten Insel. Halte Springen zum Gleiten.';
 else if(currentLevel==='bonus')$('mission-text').textContent=gemCount===8?'Alle goldenen Kristalle! Baue deinen Weg zum Wolkenwerk.':'Wolkenlauf: Sammle 8 goldene Kristalle und erreiche das Portal.';
 else if(checkpointIndex===5)$('mission-text').textContent='Bonuslevel freigeschaltet! Starte den Wolkenlauf oder erkunde weiter.';
 else if(checkpointIndex>=4||won)$('mission-text').textContent='Das Ziel liegt hinter der grossen Lücke. Baue eine Brücke! Rechts erreichst du mit einer zweiten Brücke die Wolkenwarte.';
 else $('mission-text').textContent=gemCount===12?'Alle Kristalle gefunden. Baue beim Himmelstor weiter zum Baumeistertor!':'Sammle 12 Kristalle und Holzpakete. Vor dem Ziel musst du deine eigene Brücke bauen.';
 $('bonus-action').classList.toggle('hidden',!bonusUnlocked&&currentLevel==='main');
 $('bonus-action').textContent=currentLevel==='secret'?'Zurück zur Inselwelt':currentLevel==='storm'?'Zurück zum Wolkenlauf':currentLevel==='bonus'?'Zurück zur Inselwelt':'Bonuslevel starten';
 $('storm-action').classList.toggle('hidden',!stormUnlocked||currentLevel==='storm'||currentLevel==='secret');
 $('secret-action').classList.toggle('hidden',!secretUnlocked||currentLevel!=='main');
 $('intro-secret').classList.toggle('hidden',!secretUnlocked);
 applyEnvironment();
 $('intro-storm').classList.toggle('hidden',!stormUnlocked);
 $('flight-note').classList.toggle('hidden',currentLevel!=='storm');
 $('touch-jump').setAttribute('aria-label',currentLevel==='storm'?'Springen · halten zum Gleiten':'Springen');
 document.body.classList.toggle('storm-level',currentLevel==='storm');
 $('intro-bonus').classList.toggle('hidden',!bonusUnlocked);
}
function applyEnvironment(){
 const hiddenWorld=currentLevel==='secret';
 const sky=hiddenWorld?'#142038':'#a4dfe8';scene.background.set(sky);scene.fog.color.set(sky);scene.fog.near=hiddenWorld?50:85;scene.fog.far=hiddenWorld?150:230;
 hemi.color.set(hiddenWorld?'#c4c4ff':'#ebffff');hemi.groundColor.set(hiddenWorld?'#48416b':'#7f7584');
 sun.color.set(hiddenWorld?'#bdd2ff':'#fff1cd');sun.intensity=hiddenWorld?2:3.3;
 secretStars.visible=hiddenWorld;sea.visible=!hiddenWorld;document.body.classList.toggle('secret-level',hiddenWorld);
}
function resetRuneBridges(){
 for(const piece of secretBridgePieces){scene.remove(piece.mesh);platforms.splice(platforms.indexOf(piece.p),1);pickable.splice(pickable.indexOf(piece.mesh),1);}
 secretBridgePieces.length=0;
 secretRunes.forEach(r=>{r.active=false;r.ring.material=mat('#b295dc',{emissive:'#825db3',emissiveIntensity:.5});});
}
function activateRune(index){
 if(currentLevel!=='secret'||paused)return false;
 const rune=secretRunes[index];if(!rune||rune.active||!player.grounded||Math.abs(player.y-rune.y)>.2||Math.hypot(player.x-rune.x,player.z-rune.z)>1.55)return false;
 rune.active=true;rune.ring.material=mat('#abf2dd',{emissive:'#72cbb7',emissiveIntensity:.8});
 const from=secretCourse[index],to=secretCourse[index+1],count=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/2);
 for(let i=0;i<=count;i++){
  const t=i/count,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
  if(secretCourse.some(c=>Math.abs(x-c.x)<c.w/2-1.7&&Math.abs(z-c.z)<c.d/2-1.7))continue;
  const m=box(3.2,.55,3.2,mat('#9ddad8',{emissive:'#33747e',emissiveIntensity:.25}),x,from.y-.325,z);pickable.push(m);
  const p=solid(x,from.y,z,3.2,3.2,.6);secretBridgePieces.push({mesh:m,p,index});
 }
 sparkle(rune.x,rune.y+1,rune.z,'#e5c0ff',18);sound(850+index*150,.35);updateMission();notify('Rune erwacht · Eine Kristallbrücke erscheint');return true;
}
function startSecret(){
 if(!secretUnlocked||currentLevel!=='main')return;
 mainSnapshot={spawn:{...spawn},checkpointIndex,gemCount,elapsed,won,fallCount};
 closeDialogs();if(!started)start();currentLevel='secret';clearBuilt('secret');resetLevelProgress();
 notify('Sternengrotte · Folge dem Licht der Runen.');
}
function returnFromSecret(){
 if(currentLevel!=='secret')return;
 closeDialogs();clearBuilt('secret');resetRuneBridges();currentLevel='main';
 if(mainSnapshot){({spawn,checkpointIndex,gemCount,elapsed,won,fallCount}=mainSnapshot);spawn={...spawn};}
 else{spawn={x:11,y:10,z:-101};checkpointIndex=4;gemCount=0;elapsed=0;won=false;fallCount=0;}
 resetPlayer(player,spawn);paused=false;angle=0;snapCamera();clearInput();setBuild(false);
 $('checkpoint-label').textContent=checkpointIndex===5?'Wolkenwarte · Checkpoint':checkpointIndex?`Checkpoint ${checkpointIndex} / 4`:'Startinsel';updateMission();notify('Zurück an deinem sicheren Checkpoint.');
}
function checkSecretFall(previous){
 if(currentLevel!=='main'||player.grounded||player.vy>=0||previous.y<secretGate.y||player.y>secretGate.y||previous.y===player.y)return false;
 const t=(secretGate.y-previous.y)/(player.y-previous.y),x=previous.x+(player.x-previous.x)*t,z=previous.z+(player.z-previous.z)*t;
 if(x<secretGate.minX||x>secretGate.maxX||z<secretGate.minZ||z>secretGate.maxZ)return false;
 const discovered=!secretUnlocked;secretUnlocked=true;let saved=true;
 try{localStorage.setItem('skyblock-secret-unlocked','1');}catch{saved=false;}
 startSecret();
 if(discovered){paused=true;clearInput();$('secret-save-note').textContent=saved?'Entdeckt! Die Sternengrotte ist jetzt auch im Startmenü erreichbar.':'Für diesen Besuch entdeckt. Dein Browser konnte die Freischaltung nicht speichern.';$('secret-dialog').showModal();}
 return true;
}
function closeDialogs(){for(const id of ['help-dialog','win-dialog','bonus-dialog','secret-dialog'])if($(id).open)$(id).close();}
function unlockBonus(){
 bonusUnlocked=true;spawn={x:bonusIsland.x,y:10,z:-106};checkpointIndex=5;
 $('checkpoint-label').textContent='Wolkenwarte · Checkpoint';
 let saved=true;try{localStorage.setItem('skyblock-bonus-unlocked','1');}catch{saved=false;}
 $('bonus-save-note').textContent=saved?'Freigeschaltet — auch beim nächsten Besuch in diesem Browser.':'Für diesen Besuch freigeschaltet. Dein Browser konnte den Fortschritt nicht speichern.';
 updateMission();paused=true;clearInput();$('bonus-dialog').showModal();sound(1200,.5);sparkle(bonusIsland.x,12,-110,'#d7fa70',24);
}
function checkBonusIsland(){
 if(currentLevel!=='main'||!player.grounded||Math.abs(player.y-bonusIsland.y)>.05)return;
 if(Math.abs(player.x-bonusIsland.x)>bonusIsland.w/2-.5||Math.abs(player.z-bonusIsland.z)>bonusIsland.d/2-.5)return;
 if(checkpointIndex!==5)unlockBonus();
}
function clearBuilt(level){for(let i=built.length-1;i>=0;i--){const item=built[i];if(level&&item.level!==level)continue;scene.remove(item.mesh);platforms.splice(platforms.indexOf(item.p),1);pickable.splice(pickable.indexOf(item.mesh),1);built.splice(i,1);}}
function snapCamera(){
 camera.position.set(player.x+Math.sin(angle)*distance*Math.cos(elevation),player.y+1.6+Math.sin(elevation)*distance,player.z+Math.cos(angle)*distance*Math.cos(elevation));
 camera.userData.look=new THREE.Vector3(player.x,player.y+1.3,player.z);camera.lookAt(camera.userData.look);
}
function resetLevelProgress(){
 gemCount=0;elapsed=0;won=false;fallCount=0;checkpointIndex=0;
 for(const gem of gems)if(gem.level===currentLevel){gem.collected=false;gem.g.visible=true;}
 for(const cp of checkpoints)if(cp.level===currentLevel){cp.active=false;cp.ring.material=mat('#f7edc0');}
 blocksCollected[currentLevel]=0;blockPickups.filter(b=>b.level===currentLevel).forEach(b=>{b.collected=false;b.g.visible=true;});
 spawn=currentLevel==='secret'?{x:280,y:-8,z:-26}:currentLevel==='storm'?{x:-150,y:16,z:-26}:currentLevel==='bonus'?{x:130,y:14,z:-108}:{x:0,y:0,z:4};
 if(currentLevel==='secret')resetRuneBridges();
 if(currentLevel==='storm')windPads.forEach(p=>p.armed=true);
 resetPlayer(player,spawn);angle=0;elevation=.47;distance=12;snapCamera();
 $('checkpoint-label').textContent=currentLevel==='secret'?'Pilzhain · Start':currentLevel==='storm'?'Sturmspitzen · Start':currentLevel==='bonus'?'Wolkenlauf · Start':'Startinsel';
 paused=false;setBuild(false);clearInput();updateMission();
}
function startBonus(){
 if(!bonusUnlocked)return;
 if(currentLevel==='main')mainSnapshot={spawn:{...spawn},checkpointIndex,gemCount,elapsed,won,fallCount};
 closeDialogs();if(!started)start();currentLevel='bonus';clearBuilt('bonus');resetLevelProgress();
 notify('Wolkenlauf! 8 goldene Kristalle, ein neues Ziel.');
}
function unlockStorm(){stormUnlocked=true;bonusUnlocked=true;try{localStorage.setItem('skyblock-storm-unlocked','1');}catch{}updateMission();}
function startStorm(){
 if(!stormUnlocked)return;
 if(currentLevel==='main')mainSnapshot={spawn:{...spawn},checkpointIndex,gemCount,elapsed,won,fallCount};
 if(currentLevel==='bonus')bonusSnapshot={spawn:{...spawn},checkpointIndex,gemCount,elapsed,won,fallCount};
 closeDialogs();if(!started)start();currentLevel='storm';clearBuilt('storm');resetLevelProgress();
 notify('Sturmspitzen! Betritt ein Windkatapult. Halte Springen zum Gleiten.');
}
function returnToBonus(){
 if(currentLevel!=='storm')return;
 closeDialogs();clearBuilt('storm');currentLevel='bonus';
 if(bonusSnapshot){({spawn,checkpointIndex,gemCount,elapsed,won,fallCount}=bonusSnapshot);spawn={...spawn};resetPlayer(player,spawn);paused=false;angle=0;snapCamera();clearInput();setBuild(false);$('checkpoint-label').textContent=checkpointIndex?`Checkpoint ${checkpointIndex} / 3`:'Wolkenlauf · Start';updateMission();}
 else resetLevelProgress();
 notify('Zurück im Wolkenlauf.');
}
function updateWindPads(){
 if(currentLevel!=='storm')return false;
 for(const pad of windPads){
  const distance=Math.hypot(player.x-pad.x,player.z-pad.z);
  if(distance>2.4)pad.armed=true;
  if(pad.armed&&player.grounded&&distance<1.45&&Math.abs(player.y-pad.y)<.15){
   pad.armed=false;launchWind(player,pad.dx,pad.dz);jumpQueued=false;
   sparkle(pad.x,pad.y+1,pad.z,'#bdfff0',18);sound(400,.4,'triangle');notify('Aufwind! Halte Springen für die Gleitflügel.');return true;
  }
 }
 return false;
}
function returnToMain(){
 if(currentLevel!=='bonus')return;
 bonusSnapshot={spawn:{...spawn},checkpointIndex,gemCount,elapsed,won,fallCount};
 closeDialogs();clearBuilt('bonus');currentLevel='main';
 if(mainSnapshot){({spawn,checkpointIndex,gemCount,elapsed,won,fallCount}=mainSnapshot);spawn={...spawn};}else{spawn={x:11,y:10,z:-101};checkpointIndex=4;gemCount=0;elapsed=0;won=false;fallCount=0;}
 resetPlayer(player,spawn);paused=false;angle=0;snapCamera();clearInput();setBuild(false);
 $('checkpoint-label').textContent=checkpointIndex===5?'Wolkenwarte · Checkpoint':checkpointIndex?`Checkpoint ${checkpointIndex} / 4`:'Startinsel';updateMission();notify('Zurück im Wolkenarchipel.');
}
function restartLevel(){closeDialogs();clearBuilt(currentLevel);resetLevelProgress();notify('Ein frischer Lauf. Viel Spass!');}
$('bonus-action').onclick=()=>currentLevel==='secret'?returnFromSecret():currentLevel==='storm'?returnToBonus():currentLevel==='bonus'?returnToMain():startBonus();
$('storm-action').onclick=startStorm;$('intro-storm').onclick=startStorm;$('win-storm').onclick=startStorm;
$('intro-bonus').onclick=startBonus;$('start-bonus').onclick=startBonus;
$('bonus-later').onclick=()=>{closeDialogs();paused=false;clearInput();canvas.focus({preventScroll:true});};
$('bonus-dialog').addEventListener('cancel',()=>{paused=false;clearInput();});
$('return-main').onclick=()=>currentLevel==='secret'?returnFromSecret():currentLevel==='storm'?returnToBonus():returnToMain();
$('secret-action').onclick=startSecret;$('intro-secret').onclick=startSecret;
$('close-secret').onclick=()=>{$('secret-dialog').close();paused=false;clearInput();canvas.focus({preventScroll:true});};
$('secret-return').onclick=returnFromSecret;
$('secret-dialog').addEventListener('cancel',()=>{paused=false;clearInput();});
updateMission();
$('sound').onclick=()=>{audioEnabled=!audioEnabled;$('sound').setAttribute('aria-pressed',String(audioEnabled));$('sound').setAttribute('aria-label',audioEnabled?'Sound ausschalten':'Sound einschalten');$('sound').title=audioEnabled?'Sound ausschalten':'Sound einschalten';if(audioEnabled)sound(800,.12);};
function showHelp(){if($('help-dialog').open)return;paused=true;clearInput();$('help-dialog').showModal();}
function closeHelp(){$('help-dialog').close();paused=false;canvas.focus({preventScroll:true});}
$('help').onclick=showHelp;$('close-help').onclick=closeHelp;$('resume').onclick=closeHelp;
$('help-dialog').addEventListener('cancel',()=>{paused=false;clearInput();});
function respawn(){resetPlayer(player,spawn);fallCount++;clearInput();sparkle(spawn.x,spawn.y+1,spawn.z,'#f5e3a1');sound(220,.2);notify(checkpointIndex?'Zurück am Checkpoint. Nächster Versuch!':currentLevel==='secret'?'Zurück im Pilzhain. Folge den Runen!':currentLevel==='storm'?'Zurück am Start der Sturmspitzen. Weiter geht’s!':currentLevel==='bonus'?'Zurück am Start des Wolkenlaufs. Weiter geht’s!':'Zurück im Grünen Hafen. Weiter geht’s!');}
$('respawn').onclick=respawn;
function setBuild(value){building=value;document.body.classList.toggle('building',value);$('build').classList.toggle('selected',value);$('explore').classList.toggle('selected',!value);$('build').setAttribute('aria-pressed',String(value));$('explore').setAttribute('aria-pressed',String(!value));$('build-note').classList.toggle('hidden',!value);ghost.visible=false;canvas.focus({preventScroll:true});if(value)notify('Baue frei oder nutze die Bauhilfe. Geh auf deiner Brücke mit: Reichweite 6 Meter.');}
$('explore').onclick=()=>setBuild(false);$('build').onclick=()=>setBuild(!building);
function changeOutfit(){const colors=['#f29551','#7c8adb','#e28dab','#5db19e','#ddbd4f'];outfitIndex=(outfitIndex+1)%colors.length;bodyMat.color.set(colors[outfitIndex]);sparkle(player.x,player.y+1,player.z,colors[outfitIndex],8);sound(750,.08);canvas.focus({preventScroll:true});}
$('outfit').onclick=changeOutfit;
function formatTime(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;}
function win(){
 won=true;paused=true;clearInput();$('finish-time').textContent=formatTime(elapsed);
 let best;const key=bestKey();
 try{best=Number(localStorage.getItem(key))||Infinity;if(elapsed<best){best=elapsed;localStorage.setItem(key,String(elapsed));}}catch{best=elapsed;}
 $('best').textContent=`Beste Zeit: ${formatTime(best)} · ${fallCount} neue Anläufe`;
 $('win-title').textContent=currentLevel==='secret'?'Das Geheimnis der Sterne.':currentLevel==='storm'?'Den Sturm gemeistert!':currentLevel==='bonus'?'Wolkenlauf geschafft!':'Ganz oben.';
 $('win-description').textContent=currentLevel==='secret'?'Sechs Sternsplitter, drei erwachte Runen. Du hast die Sternengrotte gefunden und gemeistert.':currentLevel==='storm'?'Alle 8 Sturmkristalle. Du hast die Sturmspitzen gemeistert!':currentLevel==='bonus'?'Alle 8 goldenen Kristalle! Sturmspitzen ist freigeschaltet: Windkatapulte und Gleitflügel warten auf dich.':'12 Kristalle gesammelt! Rechts vom Himmelstor wartet noch die Bonusinsel. Baue eine Brücke dorthin.';
 if(currentLevel==='bonus')unlockStorm();
 $('win-storm').classList.toggle('hidden',!stormUnlocked||currentLevel==='storm'||currentLevel==='secret');$('return-main').textContent=currentLevel==='secret'?'Zurück zur Inselwelt':currentLevel==='storm'?'Zurück zum Wolkenlauf':'Zurück zur Inselwelt';
 $('return-main').classList.toggle('hidden',currentLevel==='main');$('win-dialog').showModal();sound(1100,.5);updateMission();
}
$('keep-playing').onclick=()=>{closeDialogs();paused=false;clearInput();canvas.focus({preventScroll:true});updateMission();};
$('win-dialog').addEventListener('cancel',()=>{paused=false;clearInput();});
$('restart').onclick=restartLevel;
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!paused)e.preventDefault();if(e.code==='Escape'){if(!$('help-dialog').open&&!$('win-dialog').open&&!$('bonus-dialog').open&&!$('secret-dialog').open)showHelp();return;}if(!started||paused)return;if(e.code==='Space'&&!e.repeat)jumpQueued=true;if(!e.repeat){if(e.code==='KeyR')respawn();if(e.code==='KeyB')setBuild(!building);if(e.code==='Digit1')setBuild(false);if(e.code==='Digit2')setBuild(true);if(e.code==='KeyC')changeOutfit();}keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{clearInput();if(started&&!paused)showHelp();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&!paused)showHelp();}});
function setAim(e){const r=canvas.getBoundingClientRect();aim.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);}
canvas.addEventListener('pointerdown',e=>{if(!started||paused)return;setAim(e);drag={x:e.clientX,y:e.clientY,total:0,id:e.pointerId,button:e.button};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{setAim(e);if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.total+=Math.abs(dx)+Math.abs(dy);angle-=dx*.006;elevation=THREE.MathUtils.clamp(elevation+dy*.004,.18,1.15);drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(drag&&drag.total<8&&building){updateBuildSpot();if(drag.button===2)removeBlock();else placeBlock();}drag=null;});
canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{if(started&&!paused){e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.012,6,25);}},{passive:false});
let joyId=null;
$('joystick').addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;$('joystick').setPointerCapture(e.pointerId);moveJoy(e);});
function moveJoy(e){if(joyId!==e.pointerId)return;const r=$('joystick').getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/36,z=(e.clientY-r.top-r.height/2)/36;const l=Math.max(1,Math.hypot(x,z));joy.x=x/l;joy.z=z/l;$('stick').style.transform=`translate(${joy.x*29}px,${joy.z*29}px)`;}
$('joystick').addEventListener('pointermove',moveJoy);
for(const event of ['pointerup','pointercancel'])$('joystick').addEventListener(event,()=>{joyId=null;joy.x=joy.z=0;$('stick').style.transform='';});
$('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!paused){jumpQueued=true;glideHeld=true;$('touch-jump').setPointerCapture(e.pointerId);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('touch-jump').addEventListener(event,()=>glideHeld=false);
if(coarse){$('build-note').querySelector('small').textContent='Tippen: Block setzen';const undo=document.createElement('button');undo.className='text-button';undo.textContent='Block zurück';undo.style.cssText='color:#fffef5;width:auto;padding:0;font-size:11px;pointer-events:auto';undo.onclick=()=>removeBlock(true);$('build-note').append(undo);}
function updateBuildSpot(){buildSpot=null;ghost.visible=false;if(!building||!started||paused)return;raycaster.setFromCamera(aim,camera);const hit=raycaster.intersectObjects(pickable,false)[0];if(!hit||hit.distance>60)return;
 const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const point=hit.point.clone().addScaledVector(normal,1.005);
 const x=Math.round(point.x/2)*2,z=Math.round(point.z/2)*2,y=normal.y>.5?hit.point.y+1:normal.y<-.5?hit.point.y-1:Math.round((point.y-1)/2)*2+1;
 if(Math.hypot(x-player.x,z-player.z)>18||y>player.y+8||y<player.y-8)return;
 if(Math.abs(x-player.x)<1.43&&Math.abs(z-player.z)<1.43&&player.y<y+1&&player.y+2.35>y-1)return;
 if(platforms.some(p=>Math.abs(x-p.x)<(p.w+2)/2-.05&&Math.abs(z-p.z)<(p.d+2)/2-.05&&y+1>p.y-(p.h??1)+.05&&y-1<p.y-.05))return;
 buildSpot={x,y,z};ghost.position.set(x,y,z);ghost.visible=blocksLeft()>0;
}
function addBuiltBlock(x,y,z){const m=box(2,2,2,buildColors[outfitIndex%4],x,y,z);m.userData.built=true;pickable.push(m);const p=solid(x,y+1,z,2,2,2);built.push({mesh:m,p,level:currentLevel});updateInventory();sparkle(x,y+1,z,'#e7eeb1',5);sound(350,.08,'triangle');}
function placeBlock(){if(!buildSpot||blocksLeft()<=0){notify(blocksLeft()<=0?'Keine Blöcke übrig. Sammle Holzpakete oder entferne eigene Blöcke.':'Wähle eine freie Stelle näher bei deiner Figur.');return;}const {x,y,z}=buildSpot;addBuiltBlock(x,y,z);}
const bridgeSpots=sideSpots;
const bridgeSupported=s=>platforms.some(p=>Math.abs(p.y-(s.y+1))<.05&&Math.abs(p.x-s.x)<=p.w/2-.9&&Math.abs(p.z-s.z)<=p.d/2-.9);
function currentBuildSite(){
 if(!started||!player.grounded)return null;
 let nearest=null,best=Infinity;
 for(const site of constructionSites){
  if(site.level!==currentLevel||Math.abs(player.y-site.from.y)>.25)continue;
  const a=site.spots[0],b=site.spots.at(-1),dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/(dx*dx+dz*dz)));
  const distance=Math.hypot(player.x-(a.x+t*dx),player.z-(a.z+t*dz));
  if(distance<7&&distance<best){nearest=site;best=distance;}
 }
 return nearest;
}
function nearBridge(){return !!currentBuildSite();}
function buildBridgeStep(){
 const site=currentBuildSite();if(!site||paused)return false;
 const spot=site.spots.find(s=>!bridgeSupported(s));if(!spot){notify('Deine Brücke steht. Weiter zum Ziel!');return false;}
 if(Math.hypot(spot.x-player.x,spot.z-player.z)>6.4){notify('Geh auf deiner Brücke weiter, um den nächsten Block zu setzen.');return false;}
 if(blocksLeft()<=0){notify('Sammle Holzpakete oder hole deine Bauten am Checkpoint zurück.');return false;}
 if(platforms.some(p=>Math.abs(spot.x-p.x)<(p.w+2)/2-.05&&Math.abs(spot.z-p.z)<(p.d+2)/2-.05&&spot.y+1>p.y-p.h+.05&&spot.y-1<p.y-.05)){notify('Hier steht schon etwas. Baue frei weiter oder entferne deinen Block.');return false;}
 addBuiltBlock(spot.x,spot.y,spot.z);notify('1 Block verbaut · Geh mit deiner Brücke weiter.');return true;
}
function reclaimBlocks(){
 if(!started||paused)return;
 resetPlayer(player,spawn);clearInput();clearBuilt(currentLevel);updateInventory();snapCamera();canvas.focus({preventScroll:true});
 notify('Bauten zurückgeholt. Alle Blöcke sind wieder da – du stehst am Checkpoint.');
}
$('bridge-action').onclick=buildBridgeStep;$('reclaim-blocks').onclick=reclaimBlocks;
function removeBlock(last=false){let index=built.length-1;if(!last){raycaster.setFromCamera(aim,camera);const hit=raycaster.intersectObjects(pickable,false)[0];index=hit?built.findIndex(b=>b.mesh===hit.object):-1;}if(index<0)return;const item=built[index];if(Math.hypot(item.p.x-player.x,item.p.z-player.z)>18)return;scene.remove(item.mesh);platforms.splice(platforms.indexOf(item.p),1);pickable.splice(pickable.indexOf(item.mesh),1);built.splice(index,1);updateInventory();sound(220,.08);}
const mini=$('minimap').getContext('2d');
function drawMap(){
 mini.clearRect(0,0,160,160);const route=worldRoute();
 const minX=Math.min(...route.map(c=>c.x-c.w/2))-5,maxX=Math.max(...route.map(c=>c.x+c.w/2))+5;
 const minZ=Math.min(...route.map(c=>c.z-c.d/2))-5,maxZ=Math.max(...route.map(c=>c.z+c.d/2))+5;
 const scale=Math.min(144/(maxX-minX),144/(maxZ-minZ));const px=x=>80+(x-(minX+maxX)/2)*scale,py=z=>80+(z-(minZ+maxZ)/2)*scale;
 mini.strokeStyle='#aebdb2';mini.lineWidth=1.2;mini.setLineDash([3,4]);mini.beginPath();route.forEach((c,i)=>{if(currentLevel==='main'&&c===bonusIsland)mini.moveTo(px(course[4].x),py(course[4].z));i?mini.lineTo(px(c.x),py(c.z)):mini.moveTo(px(c.x),py(c.z));});mini.stroke();mini.setLineDash([]);
 route.forEach(c=>{mini.fillStyle=c===bonusIsland?'#9f7ec5':c.theme==='secret'?'#8974ad':c.theme==='storm'?'#5ba99a':c.theme==='pink'?'#b5a6c9':c.theme==='sand'?'#d8c497':'#8fb377';mini.fillRect(px(c.x)-c.w*scale/2,py(c.z)-c.d*scale/2,c.w*scale,c.d*scale);});
 gems.filter(g=>g.level===currentLevel&&!g.collected).forEach(g=>{mini.fillStyle=currentLevel==='secret'?'#a85194':currentLevel==='storm'?'#168e92':currentLevel==='bonus'?'#ab7414':'#8061c4';mini.beginPath();mini.arc(px(g.x),py(g.z),2,0,Math.PI*2);mini.fill();});
 mini.fillStyle='#173e39';mini.strokeStyle='#fffef5';mini.lineWidth=2;mini.beginPath();mini.arc(px(player.x),py(player.z),4.5,0,Math.PI*2);mini.fill();mini.stroke();
}
function animate(now){requestAnimationFrame(animate);const t=now/1000,dt=Math.min((now-lastTime)/1000||0,.05);lastTime=now;
 if(started&&!paused){
  if(!won)elapsed+=dt;if(keys.has('KeyQ'))angle+=dt*1.7;if(keys.has('KeyE'))angle-=dt*1.7;
  let ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;
  let iz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joy.z;
  updateWindPads();
  const input={glide:currentLevel==='storm'&&(keys.has('Space')||glideHeld),x:ix*Math.cos(angle)+iz*Math.sin(angle),z:iz*Math.cos(angle)-ix*Math.sin(angle),jump:jumpQueued,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')};
  const previous={x:player.x,y:player.y,z:player.z};const oldVy=player.vy;stepPlayer(player,input,platforms,dt);jumpQueued=false;if(input.jump&&player.vy>oldVy+4){sound(player.jumpsLeft?380:560,.14,'triangle',.035);if(!player.jumpsLeft)sparkle(player.x,player.y+.2,player.z,'#fff2b6',7);}
  checkSecretFall(previous);
  if(player.y<-25)respawn();
  if(currentLevel==='secret'&&!paused)secretRunes.forEach(r=>activateRune(r.index));
  const speed=Math.hypot(player.vx,player.vz);walkTime+=speed*dt*1.5;
  if(speed>.15){const target=Math.atan2(player.vx,player.vz);avatar.rotation.y+=Math.atan2(Math.sin(target-avatar.rotation.y),Math.cos(target-avatar.rotation.y))*Math.min(1,dt*14);}
  limbs.forEach((limb,i)=>{limb.rotation.x=player.grounded?Math.sin(walkTime+(i===0||i===3?0:Math.PI))*.65*Math.min(speed/6,1):(i%2?-.7:.2);});
  for(const gem of gems){if(gem.level===currentLevel&&!gem.collected&&isWithin(player,gem,1.55)){gem.collected=true;gem.g.visible=false;gemCount++;sparkle(gem.x,gem.y,gem.z);sound(650+gemCount*55,.25);updateMission();if(gemCount===gemTarget())notify('Alle Kristalle! Jetzt baue deinen Weg über die letzte grosse Lücke.');}}
  for(const pack of blockPickups){if(pack.level===currentLevel&&!pack.collected&&isWithin(player,pack,1.8)){pack.collected=true;pack.g.visible=false;blocksCollected[currentLevel]+=8;updateMission();notify('+8 Baublöcke für deine Brücke');sound(480,.18);}}
  for(const cp of checkpoints){if(cp.level===currentLevel&&cp.index>checkpointIndex&&player.grounded&&((currentLevel==='storm'||currentLevel==='secret')?(Math.abs(player.x-activeCourse()[cp.index].x)<activeCourse()[cp.index].w/2&&Math.abs(player.z-activeCourse()[cp.index].z)<activeCourse()[cp.index].d/2):Math.hypot(player.x-cp.x,player.z-cp.z)<4)&&Math.abs(player.y-cp.y)<.4){checkpointIndex=cp.index;spawn={x:cp.x,y:cp.y,z:cp.z};cp.active=true;cp.ring.material=mat('#b4e782',{emissive:'#78a85c',emissiveIntensity:.25});$('checkpoint-label').textContent=`Checkpoint ${cp.index} / ${activeCourse().length-1}`;notify(`${activeCourse()[cp.index].name} · Checkpoint gespeichert`);sound(900,.3);updateMission();}}
  checkBonusIsland();
  const goal=goalForLevel();
  if(!paused&&!won&&gemCount===gemTarget()&&(currentLevel!=='secret'||secretRunes.every(r=>r.active))&&Math.abs(player.x-goal.x)<2.2&&Math.abs(player.z-goal.z)<1.7&&player.y>=goal.y&&player.y<goal.y+5)win();
  updateBuildSpot();
 }
 glider.visible=started&&currentLevel==='storm'&&!player.grounded&&(keys.has('Space')||glideHeld);
 const flightText=glider.visible?'Gleitflügel offen · lenke zur nächsten Insel':'Windkatapult betreten · Springen halten zum Gleiten';
 if($('flight-note').textContent!==flightText)$('flight-note').textContent=flightText;
 avatar.position.set(player.x,player.y,player.z);
 let floor=-36;for(const p of platforms){if(Math.abs(player.x-p.x)<p.w/2+.1&&Math.abs(player.z-p.z)<p.d/2+.1&&p.y<=player.y+.05)floor=Math.max(floor,p.y);}
 shadow.position.set(player.x,floor+.03,player.z);shadow.material.opacity=Math.max(0,.19-(player.y-floor)*.018);shadow.scale.setScalar(1+(player.y-floor)*.07);
 if(!paused){
  gems.forEach(g=>{if(!g.collected){g.g.rotation.y=reduced?0:t*1.2+g.i;g.g.position.y=g.y+(reduced?0:Math.sin(t*2+g.i)*.16);}});
  if(!reduced){windRings.forEach(r=>{r.mesh.position.y=r.base+.4+((t*.6+r.phase)%1)*3;r.mesh.material.opacity=.35;});spinners.forEach(s=>s.rotation.z=t*.28);waterfalls.forEach((s,i)=>s.position.y=-((t*5+i*2.5)%19));clouds.forEach((c,i)=>{c.position.x+=dt*.16;if(c.position.x>145)c.position.x=-145;});portalRings.forEach((r,i)=>{r.rotation.z=t*(i%2?-.25:.3);r.scale.setScalar(1+Math.sin(t*1.3+i)*.045);});}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.vy-=7*dt;p.m.scale.setScalar(Math.max(.02,p.life*.2));if(p.life<=0){scene.remove(p.m);particles.splice(i,1);}}
 }
 if(!started){
  const portrait=innerWidth<700;const orbit=reduced?0:Math.sin(t*.045)*6;
  cameraPos.set(portrait?68:56+orbit,portrait?53:45,portrait?61:52);lookAt.set(portrait?0:-10,portrait?0:1,portrait?-42:-30);
 }else{cameraTarget.set(player.x,player.y+1.3,player.z);cameraPos.set(player.x+Math.sin(angle)*distance*Math.cos(elevation),player.y+1.6+Math.sin(elevation)*distance,player.z+Math.cos(angle)*distance*Math.cos(elevation));lookAt.copy(cameraTarget);}
 const smooth=lastTime<100?1:1-Math.exp(-dt*(currentLevel==='storm'&&started?12:5));camera.position.lerp(cameraPos,smooth);camera.userData.look??=lookAt.clone();camera.userData.look.lerp(lookAt,smooth);camera.lookAt(camera.userData.look);
 sun.position.set(player.x-25,player.y+45,player.z+20);sun.target.position.set(player.x,player.y,player.z);
 portalSurface.material.opacity=.58+(reduced?0:Math.sin(t)*.1);portalSurface.material.color.set(gemCount===gemTarget()?'#b9f08a':'#91ddd4');
 if(now-lastHud>100){lastHud=now;$('timer').textContent=formatTime(elapsed);if(started){const site=currentBuildSite();$('bridge-action').classList.toggle('hidden',!site||site.spots.every(bridgeSupported));if(site)$('bridge-action').textContent=`${site.label} · 1 Block`;$('build-guidance').classList.toggle('hidden',!site);if(site)$('build-guidance').textContent=`${site.spots.filter(bridgeSupported).length} / ${site.spots.length} Brückenblöcke · Weitergehen und bauen`;let nearest=worldRoute().reduce((a,b)=>Math.hypot(player.x-a.x,player.z-a.z)<Math.hypot(player.x-b.x,player.z-b.z)?a:b);$('location').textContent=nearest.name;drawMap();}}
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('error').classList.remove('hidden');$('error-text').textContent='Die Grafikverbindung wurde unterbrochen. Lade die Welt neu, um weiterzuspielen.';});
window.addEventListener('error',()=>{$('error').classList.remove('hidden');});
camera.position.set(56,45,52);camera.lookAt(-10,1,-30);
$('start').disabled=false;$('start-label').textContent='Ab ins Abenteuer';
requestAnimationFrame(animate);
