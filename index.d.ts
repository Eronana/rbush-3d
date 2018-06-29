interface BBox {
  minX:number;
  minY:number;
  minZ:number;
  maxX:number;
  maxY:number;
  maxZ:number;
}

type NodeChild = Node | BBox;

interface Node extends BBox {
  height:number;
  leaf:boolean;
  children:NodeChild[];
}

interface EqualsFn {
  (a:BBox, b:BBox):boolean;
}

interface compareFn {
  (a:BBox, b:BBox):number;
}

interface ToBBox {
  (item:any):BBox;
}

interface RBush3D {
  all():BBox[];
  search(bbox:any):any[];
  search(bbox:BBox):BBox[];
  collides(bbox:any):boolean;
  collides(bbox:BBox):boolean;
  raycastInv(ox:number, oy:number, oz:number, idx:number, idy:number, idz:number, length = Infinity):BBox|undefined;
  raycast(ox:number, oy:number, oz:number, dx:number, dy:number, dz:number, length = Infinity):BBox|undefined;
  load(data:any[]):this;
  load(data:BBox[]):this;
  insert(item:any):this;
  insert(item:BBox):this;
  clear():this;
  remove(item:BBox, equalsFn?:EqualsFn):this;
  toJSON():Node;
  fromJSON(data:Node):this;
  toBBox:ToBBox;
  compareMinX:compareFn;
  compareMinY:compareFn;
  compareMinZ:compareFn;
}

interface RBush3DConstructor {
  (maxEntries?:number, format?:string[]):RBush3D;
  new(maxEntries?:number, format?:string[]):RBush3D;
}

interface RBush3DExports extends RBush3DConstructor {
  default:RBush3DConstructor;
}

declare const rbush3d:RBush3DExports;
export = rbush3d;
