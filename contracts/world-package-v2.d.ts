/** DRAFT. Not consumed by the current motionspec.world.v1 editor/importer. */
import type {VehicleComponent,CharacterComponent} from './runtime-extensions.js';

export type Id=string;
export type Vec3=[number,number,number];
export type Quaternion=[number,number,number,number];
export type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};
export interface Transform {position:Vec3;rotation:Quaternion;scale:Vec3}
export interface PayloadFile {path:string;bytes:number;sha256:string;mediaType:string}
export interface WorldPackageManifest {
  schema:'motionspec.world-package.v2';version:2;
  world:{id:Id;name:string;revision:number};
  coordinates:{units:'meters';up:'+Y';forward:'-Z';handedness:'right'};
  entry:{world:string;data?:string[];vehiclePresets?:string;characterPresets?:string};
  requires:{runtime:string;capabilities:string[]};
  files:PayloadFile[];
}
export interface Asset {
  id:Id;path:string;kind:'model'|'texture'|'audio'|'animation'|'rig'|'document';
  dependencyIds:Id[];licensePath?:string;metadata?:Record<string,JsonValue>;
}
export interface RenderComponent {
  model?:{assetId:Id;node?:string};
  procedural?:{generator:string;version:string;parameters:Record<string,JsonValue>};
  materialOverrides?:Record<string,{color?:string;textureAssetId?:Id;roughness?:number;metalness?:number}>;
}
export interface PhysicsComponent {
  body:'static'|'kinematic'|'dynamic';
  collider:{kind:'box'|'sphere'|'capsule'|'convex'|'mesh';assetId?:Id;dimensions?:Vec3};
  massKg?:number;collisionLayer:string;
}
export interface DestinationComponent {title:string;body:string;order:number;dataResourceId?:Id}
export interface WorldEntity {
  id:Id;parentId:Id|null;name:string;transform:Transform;visible:boolean;locked:boolean;
  components:{render?:RenderComponent;physics?:PhysicsComponent;destination?:DestinationComponent;
    vehicle?:VehicleComponent;character?:CharacterComponent;dataBindings?:Record<string,{resourceId:Id;field:string}>};
  metadata?:Record<string,JsonValue>;
}
export interface DataResource {
  id:Id;path:string;schemaPath?:string;format:'json'|'csv';
  scope:'world';description?:string;
}
export interface SpawnPoint {id:Id;entityId:Id|null;transform:Transform;allowedKinds:('character'|'vehicle')[]}
export interface WorldDocumentV2 {
  schema:'motionspec.world.v2';id:Id;revision:number;name:string;
  environment:{backgroundAssetId?:Id;groundEntityId?:Id;exposure:number;gravity:Vec3};
  entities:WorldEntity[];assets:Asset[];dataResources:DataResource[];spawnPoints:SpawnPoint[];
  editor:{selection:Id[];grid:boolean};
}
