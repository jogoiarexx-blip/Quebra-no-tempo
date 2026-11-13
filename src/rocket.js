import * as THREE from 'three';
import {raycast,solidOnly} from './physics.js';
export const ROCKET_RADIUS=3.2;
export function launchRocket(origin,direction){return {pos:origin.clone(),dir:direction.clone().normalize(),life:2.5,travelled:0};}
export function stepRocket(shot,dt,enemies){
 if(shot.life<=0||dt<=0)return null;
 const distance=Math.min(32*dt,80-shot.travelled),eps=1e-5,origin=shot.pos.clone().addScaledVector(shot.dir,-eps);let best=raycast(origin.x,origin.y,origin.z,shot.dir.x,shot.dir.y,shot.dir.z,distance+2*eps,solidOnly);if(best)best.t=Math.max(0,best.t-eps);
 const enemy=enemies?.rayHit?.(shot.pos,shot.dir,best?best.t:distance);
 if(enemy)best={t:enemy.t,enemy};
 if(best){shot.pos.addScaledVector(shot.dir,best.t);shot.life=0;return {...best,point:shot.pos.clone()};}
 shot.pos.addScaledVector(shot.dir,distance);shot.travelled+=distance;shot.life-=dt;if(shot.travelled>=80)shot.life=0;return null;
}
export function rocketSelfDamage(distance){return Math.max(0,55*(1-distance/ROCKET_RADIUS));}
