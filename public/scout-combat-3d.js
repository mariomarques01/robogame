// Progressive enhancement: render SCOUT-X as a real WebGL model and composite
// the transparent result into the existing 2D battle canvas.
// If WebGL/CDN fails, the original 2D sprite remains playable.
import * as THREE from 'https://esm.sh/three@0.180.0';
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
const cube=(x,y,z,w,h,d,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);root.add(o);return o};
const ball=(x,y,z,w,h,d,m)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);o.position.set(x,y,z);o.scale.set(w,h,d);root.add(o)};
cube(0,.77,0,.39,.36,.28,white);cube(0,.81,.16,.26,.18,.045,blue);cube(0,.83,.19,.06,.07,.025,cyan);
cube(0,.54,0,.29,.15,.23,dark);cube(0,1.15,0,.65,.47,.41,white);
cube(0,1.17,.23,.56,.34,.05,blue);cube(0,1.17,.265,.48,.26,.038,black);
for(const sign of [-1,1]){
 ball(sign*.118,1.19,.296,.052,.047,.015,cyan);
 cube(sign*.33,1.15,0,.07,.18,.2,blue);
 ball(sign*.295,.87,0,.11,.11,.11,dark);
 cube(sign*.34,.9,0,.18,.18,.26,blue);
 cube(sign*.37,.72,0,.14,.19,.16,white);
 ball(sign*.38,.61,0,.075,.075,.075,steel);
 cube(sign*.40,.51,0,.18,.19,.2,white);
 cube(sign*.40,.52,.115,.13,.10,.03,blue);
 ball(sign*.40,.38,0,.09,.08,.09,dark);
 ball(sign*.15,.47,0,.09,.08,.08,dark);
 cube(sign*.15,.36,0,.17,.23,.20,white);
 cube(sign*.15,.365,.115,.12,.14,.027,blue);
 ball(sign*.15,.24,0,.075,.07,.075,dark);
 cube(sign*.15,.15,0,.16,.18,.19,white);
 cube(sign*.15,.055,.085,.21,.11,.30,blue);
}
let lastFrame=-1;
window.roboScout3D={
  draw(ctx,x,y,radius,time,enemy){
    // One render per animation frame, shared across all scout units.
    const frame=Math.floor(time/16);
    if(frame!==lastFrame){
      root.rotation.y=Math.sin(time*.001)*.12;
      root.position.y=Math.abs(Math.sin(time*.007))*.025;
      renderer.render(scene,camera);
      lastFrame=frame;
    }
    const size=radius*2.7;
    ctx.drawImage(renderer.domElement,x-size/2,y-size*.66,size,size);
    if(enemy){ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#ef4444';ctx.fillRect(x-size*.33,y-size*.52,size*.66,size*.75);ctx.restore();}
  }
};
