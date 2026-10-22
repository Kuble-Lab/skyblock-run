import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,resetPlayer,stepPlayer,isWithin} from '../dist/physics.mjs';
import * as physics from '../dist/physics.mjs';
const floor=[{x:0,y:0,z:0,w:30,d:30,h:2}];
const idle={x:0,z:0};
const tick=(p,input=idle,plats=floor,n=60)=>{for(let i=0;i<n;i++)stepPlayer(p,input,plats,1/60);return p;};
test('fall lands exactly and remains stable',()=>{const p=createPlayer({y:8});tick(p,idle,floor,180);assert.equal(p.y,0);assert.equal(p.vy,0);assert.equal(p.grounded,true);assert.equal(p.jumpsLeft,2);});
test('walking and sprinting accelerate; diagonal input is normalised',()=>{const a=createPlayer(),b=createPlayer(),c=createPlayer();tick(a,{x:1,z:0});tick(b,{x:1,z:0,sprint:true});tick(c,{x:1,z:1});assert(a.x>6&&a.x<8);assert(b.x>a.x*1.4);assert(Math.abs(Math.hypot(c.x,c.z)-a.x)<.01);});
test('double jump allowed, third jump refused, landing replenishes',()=>{const p=createPlayer();tick(p,idle,floor,2);stepPlayer(p,{jump:true},floor,1/60);assert.equal(p.jumpsLeft,1);tick(p,idle,floor,16);const before=p.vy;stepPlayer(p,{jump:true},floor,1/60);assert(p.vy>before);assert.equal(p.jumpsLeft,0);tick(p,idle,floor,3);const vy=p.vy;stepPlayer(p,{jump:true},floor,1/60);assert(p.vy<vy);tick(p,idle,floor,150);assert.equal(p.jumpsLeft,2);assert.equal(p.y,0);});
test('walking off a ledge falls, with one air jump after coyote time',()=>{const p=createPlayer();tick(p,idle,floor,2);tick(p,{x:1},[{x:0,y:0,z:0,w:2,d:2,h:1}],60);assert(p.y<0);assert.equal(p.grounded,false);assert.equal(p.jumpsLeft,1);});
test('side and underside collisions block motion',()=>{const wall={x:3,y:5,z:0,w:2,d:10,h:5};const p=createPlayer();tick(p,{x:1},[...floor,wall],90);assert(p.x<=1.58);const q=createPlayer();tick(q,idle,floor,2);const ceiling={x:0,y:4,z:0,w:8,d:8,h:1};tick(q,{jump:true},[...floor,ceiling],10);assert(q.y+2.35<=3.01);});
test('large timesteps cannot tunnel through a platform',()=>{const p=createPlayer({y:2});p.vy=-60;stepPlayer(p,idle,floor,.1);assert.equal(p.y,0);assert.equal(p.grounded,true);});
test('reset clears motion; collectable proximity uses avatar centre',()=>{const p=createPlayer({y:9});p.vx=10;p.vy=-20;resetPlayer(p,{x:4,y:2,z:7});assert.equal(p.vx,0);assert.equal(p.vy,0);assert.equal(p.jumpsLeft,2);assert(isWithin(p,{x:4,y:3,z:7}));assert(!isWithin(p,{x:10,y:3,z:7}));});
test('a six-unit ascending hop can be landed without sprint',()=>{const plats=[{x:0,y:0,z:0,w:4,d:4,h:1},{x:6,y:1,z:0,w:4,d:4,h:1}];const p=createPlayer();tick(p,idle,plats,2);let landed=false;for(let i=0;i<150;i++){const input={x:p.x<5.8?1:0,jump:i===1||i===25};stepPlayer(p,input,plats,1/60);if(p.grounded&&p.y===1){landed=true;break;}}assert(landed);});


test('wind launch is directional, finite, and reset clears its impulse',()=>{
 const p=createPlayer();
 physics.launchWind(p,3,-4);
 assert(p.vy>10.8);
 assert(Math.abs(Math.hypot(p.windX,p.windZ)-1)<.001);
 assert(p.windX>0&&p.windZ<0);
 assert(p.windTime>0);
 tick(p,{},[],120);
 assert(p.x>0&&p.z<0);
 assert(p.windTime<=0);
 resetPlayer(p,{x:0,y:0,z:0});
 assert.equal(p.windTime,0);
 tick(p,{},floor,60);
 assert.equal(p.x,0);
 assert.equal(p.z,0);
 assert.equal(p.grounded,true);
});

test('gliding limits falling speed and permits directional control',()=>{
 const gliding=createPlayer({y:100}),falling=createPlayer({y:100});
 tick(gliding,{x:1,z:0,glide:true},[],90);
 tick(falling,{x:1,z:0},[],90);
 assert(gliding.vy>=-3.5-.001&&gliding.vy<0);
 assert(gliding.y>falling.y+10);
 assert(gliding.x>falling.x);
 tick(gliding,{},[],30);
 assert(gliding.vy<-3.5,'releasing glide resumes ordinary gravity');
});

test('wind flight can land once and remains grounded without another launch',()=>{
 const p=createPlayer();
 physics.launchWind(p,1,0);
 const broadFloor=[{x:0,y:0,z:0,w:300,d:300,h:2}];
 tick(p,{glide:true},broadFloor,600);
 assert.equal(p.grounded,true);
 assert.equal(p.y,0);
 assert.equal(p.vy,0);
 assert.equal(p.windTime,0);
 tick(p,{},broadFloor,120);
 assert.equal(p.grounded,true);
 assert.equal(p.y,0);
});

test('holding jump does not truncate an active wind launch',()=>{
 const idleWind=createPlayer(),heldJump=createPlayer();
 physics.launchWind(idleWind,0,-1);
 physics.launchWind(heldJump,0,-1);
 tick(idleWind,{},[],30);
 tick(heldJump,{jump:true},[],30);
 assert.equal(heldJump.y,idleWind.y);
 assert.equal(heldJump.vy,idleWind.vy);
 assert.equal(heldJump.z,idleWind.z);
});
