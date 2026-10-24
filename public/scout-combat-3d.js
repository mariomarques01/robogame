// Progressive enhancement: render SCOUT-X as a real WebGL model and composite
// the transparent result into the existing 2D battle canvas.
// If WebGL/CDN fails, the original 2D sprite remains playable.
import * as THREE from 'https://esm.sh/three@0.180.0';
import { GLTFLoader } from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35,1,.1,20);
camera.position.set(2,1.7,3.6);
camera.lookAt(0,.75,0);
const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(160,160,false);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x263750,2.2));
const light = new THREE.DirectionalLight(0xffffff,2.5);
light.position.set(3,5,4);scene.add(light);
const root=new THREE.Group();scene.add(root);
const mat=(color,metalness=.3,emissiveIntensity=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.32,emissive:color,emissiveIntensity});
const white=mat(0xe4eef9),blue=mat(0x146ee8,.6),black=mat(0x06111f),dark=mat(0x23344b,.7),cyan=mat(0x12dfff,0,2),steel=mat(0x738396,.8);
const cube=(x,y,z,w,h,d,m,parent=root)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o};
const ball=(x,y,z,w,h,d,m,parent=root)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o)};
const arms=[], legs=[];
cube(0,.77,0,.39,.36,.28,white);cube(0,.81,.16,.26,.18,.045,blue);cube(0,.83,.19,.06,.07,.025,cyan);
cube(0,.54,0,.29,.15,.23,dark);cube(0,1.15,0,.65,.47,.41,white);
cube(0,1.17,.23,.56,.34,.05,blue);cube(0,1.17,.265,.48,.26,.038,black);
for(const sign of [-1,1]){
 ball(sign*.118,1.19,.296,.052,.047,.015,cyan);
 cube(sign*.33,1.15,0,.07,.18,.2,blue);
 ball(sign*.295,.87,0,.11,.11,.11,dark);
 cube(sign*.34,.9,0,.18,.18,.26,blue);
 const arm=new THREE.Group();arm.position.set(sign*.37,.79,0);root.add(arm);arms.push({arm,sign});
 cube(0,-.07,0,.14,.19,.16,white,arm);
 ball(0,-.18,0,.075,.075,.075,steel,arm);
 cube(sign*.03,-.29,0,.18,.19,.2,white,arm);
 cube(sign*.03,-.28,.115,.13,.10,.03,blue,arm);
 ball(sign*.03,-.42,0,.09,.08,.09,dark,arm);
 const leg=new THREE.Group();leg.position.set(sign*.15,.48,0);root.add(leg);legs.push({leg,sign});
 ball(0,0,0,.09,.08,.08,dark,leg);
 cube(0,-.11,0,.17,.23,.20,white,leg);
 cube(0,-.11,.116,.13,.15,.025,blue,leg);
 ball(0,-.232,0,.075,.07,.075,dark,leg);
 cube(0,-.324,0,.16,.18,.19,white,leg);
 cube(0,-.415,.085,.21,.115,.30,blue,leg);
}
let lastFrame=-1;
let mixer=null, loaded=null, previousTime=0;
const modelURL=new URL('./models/scout_x.glb',import.meta.url).href;
new GLTFLoader().load(modelURL,(gltf)=>{
  loaded=gltf.scene;
  root.visible=false;
  scene.add(loaded);
  mixer=new THREE.AnimationMixer(loaded);
  const walk=gltf.animations.find(a=>a.name==='Walk');
  if(walk) mixer.clipAction(walk).play();
},undefined,(err)=>console.warn('SCOUT-X GLB unavailable; procedural fallback active',err));
window.roboScout3D={
  draw(ctx,x,y,radius,time,enemy){
    // One render per animation frame, shared across all scout units.
    const frame=Math.floor(time/16);
    if(frame!==lastFrame){
      const phase=time*.009;
      root.rotation.y=Math.sin(time*.001)*.12;
      root.position.y=Math.abs(Math.sin(phase))*.025;
      if(mixer) mixer.update(Math.min(.05,Math.max(0,(time-previousTime)/1000)));
      previousTime=time;
      arms.forEach(({arm,sign})=>{arm.rotation.x=Math.sin(phase+sign*Math.PI/2)*.34;});
      legs.forEach(({leg,sign})=>{leg.rotation.x=-Math.sin(phase+sign*Math.PI/2)*.36;});
      renderer.render(scene,camera);
      lastFrame=frame;
    }
    const size=radius*2.7;
    ctx.drawImage(renderer.domElement,x-size/2,y-size*.66,size,size);
    if(enemy){ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#ef4444';ctx.fillRect(x-size*.33,y-size*.52,size*.66,size*.75);ctx.restore();}
  }
};
