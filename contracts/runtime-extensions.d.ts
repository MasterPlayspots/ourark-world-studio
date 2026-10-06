/** DRAFT extension interfaces. No movement/physics/avatar runtime is implemented. */
import type {Id,JsonValue,Transform,Vec3} from './world-package-v2.js';

export type VehicleFamily='ground'|'water'|'underwater'|'air'|'space'|'rail'|'custom';
export interface Appearance {
  palette:Record<string,string>;
  variant?:string;
  attachments:{slot:string;assetId:Id;transform:Transform}[];
}
export interface Seat {
  id:Id;role:'driver'|'passenger';anchor:Transform;exit:Transform;
  rigProfileIds:Id[];
}
export interface VehicleComponent {
  family:VehicleFamily;profileId:Id;controllerId:Id;
  appearance:Appearance;seats:Seat[];
}
export interface VehicleProfile {
  id:Id;version:number;family:VehicleFamily;controllerId:Id;modelAssetId:Id;
  massKg:number;
  limits:{maxSpeedMps:number;maxAngularSpeedRadps:number};
  parameters:Record<string,JsonValue>;
  /** Parameters are checked against this controller-specific schema. */
  parameterSchemaId:Id;
}
export interface CharacterComponent {
  profileId:Id;rigProfileId:Id;animationProfileId:Id;locomotionControllerId:Id;
  appearance:Appearance;
  morphs:Record<string,number>;
  outfitSlots:Record<string,Id>;
}
export interface CharacterProfile {
  id:Id;version:number;modelAssetId:Id;rigProfileId:Id;
  supportedMorphs:Record<string,{min:number;max:number;default:number}>;
  outfitSlots:Record<string,{compatibleAssetIds:Id[]}>;
  animationProfileId:Id;
}
export interface AnimationProfile {
  id:Id;rigProfileId:Id;
  states:Record<string,{assetId:Id;clip:string;loop:boolean}>;
  transitions:{from:string;to:string;crossFadeSeconds:number}[];
}
export interface InputFrame {
  move:Vec3;look:[number,number];throttle:number;brake:number;steer:number;
  jump:boolean;interact:boolean;exit:boolean;
}
export interface BodyState {transform:Transform;linearVelocity:Vec3;angularVelocity:Vec3}
export interface RuntimeContext {
  entityId:Id;
  readBody(id:Id):BodyState;
  applyForce(id:Id,force:Vec3):void;
  applyTorque(id:Id,torque:Vec3):void;
  moveKinematic(id:Id,transform:Transform):void;
  /** Host supplies collision queries, never imported executable code. */
  raycast(origin:Vec3,direction:Vec3,maxDistance:number):{entityId:Id;point:Vec3;normal:Vec3}|null;
}
export interface VehicleController {
  readonly id:Id;readonly family:VehicleFamily;
  validate(profile:VehicleProfile):string[];
  attach(context:RuntimeContext,profile:VehicleProfile):void;
  step(fixedDeltaSeconds:number,input:InputFrame):void;
  reset(transform:Transform):void;
  detach():void;
}
export interface CharacterController {
  readonly id:Id;
  attach(context:RuntimeContext,profile:CharacterProfile):void;
  step(fixedDeltaSeconds:number,input:InputFrame):void;
  enterSeat(vehicleEntityId:Id,seatId:Id):boolean;
  exitSeat():boolean;
  detach():void;
}
export interface RuntimeSession {
  play():void;pause():void;stop():void;
  possess(entityId:Id):void;
  release():void;
  /** Explicit user action to turn a simulated pose into an undoable design edit. */
  capturePose(entityId:Id):Transform;
}
