const quickselect = require('quickselect');

export interface GNode<T, L extends boolean> {
  children:L extends true ? T[] : Node<T>[];
  height:number;
  leaf:L;
  minX:number;
  minY:number;
  minZ:number;
  maxX:number;
  maxY:number;
  maxZ:number;
}

export type LeafNode<T> = GNode<T, true>;
export type NonLeafNode<T> = GNode<T, false>;
export type Node<T> = LeafNode<T> | NonLeafNode<T>;
export type NullableNode<T> = Node<T> | undefined;
export type DetermineNode<T, L extends boolean> = L extends true ? LeafNode<T> : NonLeafNode<T>;
export type DetermineLeaf<T, L extends boolean> = L extends true ? T : Node<T>;

export interface BBox {
  minX:number;
  minY:number;
  minZ:number;
  maxX:number;
  maxY:number;
  maxZ:number;
}

export interface ToBBox<T> {
  (a:T):BBox;
}

export interface CompareAxis<T> {
  (a:T, b:T):number;
}

export interface CompareEqual<T> {
  (a:T, b:T):boolean;
}

export interface DistNode<T> {
  dist:number;
  node:T;
}

const nodePool:Node<any>[] = [];
const freeNode = <T>(node:Node<T>) => nodePool.push(node);
const freeAllNode = <T>(node:Node<T>) => {
  if (node) {
    freeNode(node);
    if (!isLeaf(node)) {
      node.children.forEach(freeAllNode);
    }
  }
};

const allowNode = <T, L extends boolean = true>(children:DetermineLeaf<T, L>[]) => {
  let node = nodePool.pop() as DetermineNode<T, L>;
  if (node) {
    node.children = children as any;
    node.height = 1;
    node.leaf = true;
    node.minX = Infinity;
    node.minY = Infinity;
    node.minZ = Infinity;
    node.maxX = -Infinity;
    node.maxY = -Infinity;
    node.maxZ = -Infinity;
  } else {
    node = {
      children: children,
      height: 1,
      leaf: true,
      minX: Infinity,
      minY: Infinity,
      minZ: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      maxZ: -Infinity,
    } as typeof node;
  }
  return node;
};

const distNodePool:DistNode<any>[] = [];
const freeDistNode = <T>(node:DistNode<T>) => distNodePool.push(node);
const allowDistNode = <T>(dist:number, node:T) => {
  let heapNode = distNodePool.pop();
  if (heapNode) {
    heapNode.dist = dist;
    heapNode.node = node;
  } else {
    heapNode = { dist, node };
  }
  return heapNode;
};

const isLeaf = <T>(node:Node<T>):node is LeafNode<T> => {
  return node.leaf;
};

const isLeafChild = <T>(node:Node<T>, child?:T | Node<T>):child is T => {
  return node.leaf;
};

const findItem = <T>(item:T, items:T[], equalsFn?:CompareEqual<T>) => {
  if (!equalsFn) return items.indexOf(item);

  for (let i = 0; i < items.length; i++) {
    if (equalsFn(item, items[i])) return i;
  }
  return -1;
};

// calculate node's bbox from bboxes of its children
const calcBBox = <T>(node:Node<T>, toBBox:ToBBox<T>) => {
  distBBox(node, 0, node.children.length, toBBox, node);
};

// min bounding rectangle of node children from k to p-1
const distBBox = <T>(node:Node<T>, k:number, p:number, toBBox:ToBBox<T>, destNode?:Node<T>) => {
  let dNode = destNode;
  if (dNode) {
    dNode.minX = Infinity;
    dNode.minY = Infinity;
    dNode.minZ = Infinity;
    dNode.maxX = -Infinity;
    dNode.maxY = -Infinity;
    dNode.maxZ = -Infinity;
  } else {
    dNode = allowNode([]) as Node<T>;
  }

  for (let i = k, child:typeof node.children[0]; i < p; i++) {
    child = node.children[i];
    extend(dNode, isLeafChild(node, child) ? toBBox(child) : child);
  }
  return dNode;
};

const extend = (a:BBox, b:BBox) => {
  a.minX = Math.min(a.minX, b.minX);
  a.minY = Math.min(a.minY, b.minY);
  a.minZ = Math.min(a.minZ, b.minZ);
  a.maxX = Math.max(a.maxX, b.maxX);
  a.maxY = Math.max(a.maxY, b.maxY);
  a.maxZ = Math.max(a.maxZ, b.maxZ);
  return a;
};

const bboxVolume = (a:BBox) =>
  (a.maxX - a.minX) *
  (a.maxY - a.minY) *
  (a.maxZ - a.minZ);

const bboxMargin = (a:BBox) =>
  (a.maxX - a.minX) +
  (a.maxY - a.minY) +
  (a.maxZ - a.minZ);

const enlargedVolume = (a:BBox, b:BBox) => {
  const minX = Math.min(a.minX, b.minX),
    minY = Math.min(a.minY, b.minY),
    minZ = Math.min(a.minZ, b.minZ),
    maxX = Math.max(a.maxX, b.maxX),
    maxY = Math.max(a.maxY, b.maxY),
    maxZ = Math.max(a.maxZ, b.maxZ);

  return (maxX - minX) *
    (maxY - minY) *
    (maxZ - minZ);
};

const intersectionVolume = (a:BBox, b:BBox) => {
  const minX = Math.max(a.minX, b.minX),
    minY = Math.max(a.minY, b.minY),
    minZ = Math.max(a.minZ, b.minZ),
    maxX = Math.min(a.maxX, b.maxX),
    maxY = Math.min(a.maxY, b.maxY),
    maxZ = Math.min(a.maxZ, b.maxZ);

  return Math.max(0, maxX - minX) *
    Math.max(0, maxY - minY) *
    Math.max(0, maxZ - minZ);
};

const contains = (a:BBox, b:BBox) =>
  a.minX <= b.minX &&
  a.minY <= b.minY &&
  a.minZ <= b.minZ &&
  b.maxX <= a.maxX &&
  b.maxY <= a.maxY &&
  b.maxZ <= a.maxZ;

export const intersects = (a:BBox, b:BBox) =>
  b.minX <= a.maxX &&
  b.minY <= a.maxY &&
  b.minZ <= a.maxZ &&
  b.maxX >= a.minX &&
  b.maxY >= a.minY &&
  b.maxZ >= a.minZ;

export const boxRayIntersects = (box:BBox, ox:number, oy:number, oz:number, idx:number, idy:number, idz:number) => {
  const tx0 = (box.minX - ox) * idx;
  const tx1 = (box.maxX - ox) * idx;
  const ty0 = (box.minY - oy) * idy;
  const ty1 = (box.maxY - oy) * idy;
  const tz0 = (box.minZ - oz) * idz;
  const tz1 = (box.maxZ - oz) * idz;

  const z0 = Math.min(tz0, tz1);
  const z1 = Math.max(tz0, tz1);
  const y0 = Math.min(ty0, ty1);
  const y1 = Math.max(ty0, ty1);
  const x0 = Math.min(tx0, tx1);
  const x1 = Math.max(tx0, tx1);

  const tmin = Math.max(0, x0, y0, z0);
  const tmax = Math.min(x1, y1, z1);
  return tmax >= tmin ? tmin : Infinity;
};

// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
// combines selection algorithm with binary divide & conquer approach

const multiSelect = <T>(arr:T[], left:number, right:number, n:number, compare:CompareAxis<T>) => {
  const stack = [left, right];
  var mid;
  while (stack.length) {
    right = stack.pop()!;
    left = stack.pop()!;

    if (right - left <= n) continue;

    mid = left + Math.ceil((right - left) / n / 2) * n;
    quickselect(arr, mid, left, right, compare);

    stack.push(left, mid, mid, right);
  }
};

const compareBBoxMinX:Function = (a:any, b:any) => a.minX - b.minX;
const compareBBoxMinY:Function = (a:any, b:any) => a.minY - b.minY;
const compareBBoxMinZ:Function = (a:any, b:any) => a.minZ - b.minZ;

const toBBox = (x:any) => x;

export class RBush3D<K extends string = keyof BBox, T = { [k in K]:number } & {[k:string]:any}> {
  private data:Node<T>;
  private maxEntries:number;
  private minEntries:number;
  public compareMinX:CompareAxis<T> = compareBBoxMinX as any;
  public compareMinY:CompareAxis<T> = compareBBoxMinY as any;
  public compareMinZ:CompareAxis<T> = compareBBoxMinZ as any;
  public toBBox:ToBBox<T> = toBBox;
  private static pool:RBush3D[] = [];

  public static alloc() {
    return this.pool.pop() || new this();
  }

  public static free(rbush:RBush3D) {
    rbush.clear();
    this.pool.push(rbush);
  }

  constructor(maxEntries = 16, format?:K[]) {
    this.maxEntries = Math.max(maxEntries, 8);
    this.minEntries = Math.max(4, Math.ceil(this.maxEntries * 0.4));
    if (format) {
      this.initFormat(format);
    }
    this.clear();
  }

  // data format (minX, minY, minZ, maxX, maxY, maxZ accessors)

  // uses eval-type function compilation instead of just accepting a toBBox function
  // because the algorithms are very sensitive to sorting functions performance,
  // so they should be dead simple and without inner calls
  private initFormat(format:K[]) {
    const compareArr = ['return a.', ' - b.', ';'];

    ['compareMinX', 'compareMinY', 'compareMinZ'].forEach((c, i) => {
      (this as any)[c] = <CompareAxis<T>>new Function('a', 'b', compareArr.join(format[i]));
    });

    this.toBBox = <ToBBox<T>>new Function('a',
      'return {minX: a.' + format[0] +
      ', minY: a.' + format[1] +
      ', minZ: a.' + format[2] +
      ', maxX: a.' + format[3] +
      ', maxY: a.' + format[4] +
      ', maxZ: a.' + format[5] + '};');
  }

  public search(bbox:BBox) {
    let node:NullableNode<T> = this.data;
    const result:T[] = [],
      toBBox = this.toBBox;

    if (!intersects(bbox, node)) return result;

    const nodesToSearch:Node<T>[] = [];
    while (node) {
      for (let i = 0, len = node.children.length; i < len; i++) {
        // FIXME: remove ':any' when ts fix the bug
        const child:any = node.children[i];
        const childBBox = isLeafChild(node, child) ? toBBox(child) : <Node<T>>child;
        if (intersects(bbox, childBBox)) {
          if (isLeafChild(node, child)) result.push(child);
          else if (contains(bbox, childBBox)) this._all(child, result);
          else nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }
    return result;
  }

  public collides(bbox:BBox) {
    let node:NullableNode<T> = this.data;
    const toBBox = this.toBBox;
    if (!intersects(bbox, node)) return false;
    const nodesToSearch:Node<T>[] = [];
    while (node) {
      for (let i = 0, len = node.children.length; i < len; i++) {
        // FIXME: remove ':any' when ts fix the bug
        const child:any = node.children[i];
        const childBBox = isLeafChild(node, child) ? toBBox(child) : <Node<T>>child;

        if (intersects(bbox, childBBox)) {
          if (isLeafChild(node, child) || contains(bbox, childBBox)) return true;
          nodesToSearch.push(child);
        }
      }
      node = nodesToSearch.pop();
    }
    return false;
  }

  public raycastInv(ox:number, oy:number, oz:number, idx:number, idy:number, idz:number, maxLen = Infinity):DistNode<T|undefined> {
    let node = this.data;
    const toBBox = this.toBBox;
    if (idx === Infinity && idy === Infinity && idz === Infinity) return allowDistNode(Infinity, undefined);
    if (boxRayIntersects(node, ox, oy, oz, idx, idy, idz) === Infinity) return allowDistNode(Infinity, undefined);

    const heap = [allowDistNode(0, node)];
    const swap = (a:number, b:number) => {
      const t = heap[a];
      heap[a] = heap[b];
      heap[b] = t;
    };
    const pop = () => {
      const top = heap[0];
      const newLen = heap.length - 1;
      heap[0] = heap[newLen];
      heap.length = newLen;
      let idx = 0;
      while (true) {
        let left = (idx << 1) | 1;
        if (left >= newLen) break;
        const right = left + 1;
        if (right < newLen && heap[right].dist < heap[left].dist) {
          left = right;
        }
        if (heap[idx].dist < heap[left].dist) break;
        swap(idx, left);
        idx = left;
      }
      freeDistNode(top);
      return top.node;
    };
    const push = (dist:number, node:Node<T>) => {
      let idx = heap.length;
      heap.push(allowDistNode(dist, node));
      while (idx > 0) {
        const p = (idx - 1) >> 1;
        if (heap[p].dist <= heap[idx].dist) break;
        swap(idx, p);
        idx = p;
      }
    };

    let dist = maxLen;
    let result:T|undefined;
    while (heap.length && heap[0].dist < dist) {
      node = pop();
      for (let i = 0, len = node.children.length; i < len; i++) {
        const child = node.children[i];
        const childBBox = isLeafChild(node, child) ? toBBox(child) : child;
        const d = boxRayIntersects(childBBox, ox, oy, oz, idx, idy, idz);
        if (!isLeafChild(node, child)) {
          push(d, child);
        } else if (d < dist) {
          if (d === 0) {
            return allowDistNode(d, child);
          }
          dist = d;
          result = child;
        }
      }
    }
    return allowDistNode(dist < maxLen ? dist : Infinity, result);
  }

  public raycast(ox:number, oy:number, oz:number, dx:number, dy:number, dz:number, maxLen = Infinity) {
    return this.raycastInv(ox, oy, oz, 1 / dx, 1 / dy, 1 / dz, maxLen);
  }

  public all() {
    return this._all(this.data, []);
  }

  public load(data:T[]) {
    if (!(data && data.length)) return this;

    if (data.length < this.minEntries) {
      for (var i = 0, len = data.length; i < len; i++) {
        this.insert(data[i]);
      }
      return this;
    }

    // recursively build the tree with the given data from scratch using OMT algorithm
    var node = this.build(data.slice(), 0, data.length - 1, 0);

    if (!this.data.children.length) {
      // save as is if tree is empty
      this.data = node;

    } else if (this.data.height === node.height) {
      // split root if trees have the same height
      this.splitRoot(this.data, node);

    } else {
      if (this.data.height < node.height) {
        // swap trees if inserted one is bigger
        const tmpNode = this.data;
        this.data = node;
        node = tmpNode;
      }

      // insert the small tree into the large tree at appropriate level
      this._insert(node, this.data.height - node.height - 1, true);
    }

    return this;
  }

  public insert(item?:T) {
    if (item) this._insert(item, this.data.height - 1);
    return this;
  }

  public clear() {
    if (this.data) {
      freeAllNode(this.data);
    }
    this.data = allowNode<T>([]);
    return this;
  }

  public remove(item?:T, equalsFn?:CompareEqual<T>) {
    if (!item) return this;

    let node:NullableNode<T> = this.data;
    let i = 0;
    let goingUp = false;
    let index:number;
    let parent:NonLeafNode<T> | undefined;
    const bbox = this.toBBox(item);
    const path:Node<T>[] = [];
    const indexes:number[] = [];
    // depth-first iterative tree traversal
    while (node || path.length) {

      if (!node) { // go up
        node = path.pop()!;
        i = indexes.pop()!;
        parent = path[path.length - 1] as NonLeafNode<T>;
        goingUp = true;
      }

      if (isLeaf(node)) { // check current node
        index = findItem(item, node.children, equalsFn);

        if (index !== -1) {
          // item found, remove the item and condense tree upwards
          node.children.splice(index, 1);
          path.push(node);
          this.condense(path);
          return this;
        }
      }

      if (!goingUp && !isLeaf(node) && contains(node, bbox)) { // go down
        path.push(node);
        indexes.push(i);
        i = 0;
        parent = node;
        node = node.children[0];

      } else if (parent) { // go right
        i++;
        node = parent.children[i];
        goingUp = false;
      } else {
        node = undefined; // nothing found
      }
    }

    return this;
  }

  public toJSON() {
    return this.data;
  }

  public fromJSON(data:Node<T>) {
    freeAllNode(this.data);
    this.data = data;
    return this;
  }

  private build(items:T[], left:number, right:number, height:number) {

    const N = right - left + 1;
    let M = this.maxEntries;
    let node:Node<T>;
    if (N <= M) {
      // reached leaf level; return leaf
      node = allowNode<T>(items.slice(left, right + 1));
      calcBBox(node, this.toBBox);
      return node;
    }

    if (!height) {
      // target height of the bulk-loaded tree
      height = Math.ceil(Math.log(N) / Math.log(M));

      // target number of root entries to maximize storage utilization
      M = Math.ceil(N / Math.pow(M, height - 1));
    }

    node = allowNode<T, false>([]);
    node.leaf = false;
    node.height = height;

    // split the items into M mostly square tiles

    const N3 = Math.ceil(N / M),
      N2 = N3 * Math.ceil(Math.pow(M, 2 / 3)),
      N1 = N3 * Math.ceil(Math.pow(M, 1 / 3));

    multiSelect(items, left, right, N1, this.compareMinX);

    for (let i = left; i <= right; i += N1) {

      const right2 = Math.min(i + N1 - 1, right);

      multiSelect(items, i, right2, N2, this.compareMinY);

      for (let j = i; j <= right2; j += N2) {

        const right3 = Math.min(j + N2 - 1, right2);

        multiSelect(items, j, right3, N3, this.compareMinZ);

        for (let k = j; k <= right3; k += N3) {

          const right4 = Math.min(k + N3 - 1, right3);

          // pack each entry recursively
          (node.children as any[]).push(this.build(items, k, right4, height - 1));
        }
      }
    }

    calcBBox(node, this.toBBox);

    return node;
  }

  private _all(node:Node<T> | undefined, result:T[]) {
    const nodesToSearch:Node<T>[] = [];
    while (node) {
      if (isLeaf(node)) result.push(...node.children);
      else nodesToSearch.push(...node.children);

      node = nodesToSearch.pop();
    }
    return result;
  }

  private chooseSubtree(bbox:BBox, node:Node<T>, level:number, path:Node<T>[]) {
    let minVolume:number;
    let minEnlargement:number;
    let targetNode:NullableNode<T>;
    while (true) {
      path.push(node);

      if (isLeaf(node) || path.length - 1 === level) break;

      minVolume = minEnlargement = Infinity;

      for (let i = 0, len = node.children.length; i < len; i++) {
        const child = node.children[i];
        const volume = bboxVolume(child);
        const enlargement = enlargedVolume(bbox, child) - volume;

        // choose entry with the least volume enlargement
        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          minVolume = volume < minVolume ? volume : minVolume;
          targetNode = child;

        } else if (enlargement === minEnlargement) {
          // otherwise choose one with the smallest volume
          if (volume < minVolume) {
            minVolume = volume;
            targetNode = child;
          }
        }
      }

      node = targetNode || node.children[0];
    }

    return node;
  }

  // split overflowed node into two
  private split(insertPath:Node<T>[], level:number) {

    const node = insertPath[level];
    const M = node.children.length;
    const m = this.minEntries;

    this.chooseSplitAxis(node, m, M);

    const splitIndex = this.chooseSplitIndex(node, m, M);

    const newNode = allowNode<T, typeof node.leaf>(node.children.splice(splitIndex, node.children.length - splitIndex));
    newNode.height = node.height;
    newNode.leaf = node.leaf;

    calcBBox(node, this.toBBox);
    calcBBox(newNode, this.toBBox);

    if (level) (insertPath[level - 1] as NonLeafNode<T>).children.push(newNode);
    else this.splitRoot(node, newNode);
  }

  private splitRoot(node:Node<T>, newNode:Node<T>) {
    // split root node
    this.data = allowNode<T, false>([node, newNode]);
    this.data.height = node.height + 1;
    this.data.leaf = false;
    calcBBox(this.data, this.toBBox);
  }

  private chooseSplitIndex(node:Node<T>, m:number, M:number) {
    let minOverlap = Infinity;
    let minVolume = Infinity;
    let index:number;
    for (let i = m; i <= M - m; i++) {
      const bbox1 = distBBox(node, 0, i, this.toBBox);
      const bbox2 = distBBox(node, i, M, this.toBBox);

      const overlap = intersectionVolume(bbox1, bbox2);
      const volume = bboxVolume(bbox1) + bboxVolume(bbox2);

      // choose distribution with minimum overlap
      if (overlap < minOverlap) {
        minOverlap = overlap;
        index = i;

        minVolume = volume < minVolume ? volume : minVolume;

      } else if (overlap === minOverlap) {
        // otherwise choose distribution with minimum volume
        if (volume < minVolume) {
          minVolume = volume;
          index = i;
        }
      }
    }

    return index!;
  }

  // sorts node children by the best axis for split
  private chooseSplitAxis(node:Node<T>, m:number, M:number) {
    const compareMinX = node.leaf ? this.compareMinX : compareBBoxMinX,
      compareMinY = node.leaf ? this.compareMinY : compareBBoxMinY,
      compareMinZ = node.leaf ? this.compareMinZ : compareBBoxMinZ,
      xMargin = this.allDistMargin(node, m, M, compareMinX),
      yMargin = this.allDistMargin(node, m, M, compareMinY),
      zMargin = this.allDistMargin(node, m, M, compareMinZ);

    // if total distributions margin value is minimal for x, sort by minX,
    // if total distributions margin value is minimal for y, sort by minY,
    // otherwise it's already sorted by minZ
    if (xMargin < yMargin && xMargin < zMargin) {
      (node.children as any[]).sort(compareMinX as any);
    } else if (yMargin < xMargin && yMargin < zMargin) {
      (node.children as any[]).sort(compareMinY as any);
    }
  }

  // total margin of all possible split distributions where each node is at least m full
  private allDistMargin(node:Node<T>, m:number, M:number, compare:typeof node extends LeafNode<T> ? CompareAxis<T> : Function) {
    (node.children as any).sort(compare);

    const toBBox = this.toBBox,
      leftBBox = distBBox(node, 0, m, toBBox),
      rightBBox = distBBox(node, M - m, M, toBBox);
    let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

    for (let i = m; i < M - m; i++) {
      const child = node.children[i];
      extend(leftBBox, isLeafChild(node, child) ? toBBox(child) : child);
      margin += bboxMargin(leftBBox);
    }

    for (let i = M - m - 1; i >= m; i--) {
      const child = node.children[i];
      extend(rightBBox, isLeafChild(node, child) ? toBBox(child) : child);
      margin += bboxMargin(rightBBox);
    }

    return margin;
  }

  private adjustParentBBoxes(bbox:BBox, path:Node<T>[], level:number) {
    // adjust bboxes along the given tree path
    for (let i = level; i >= 0; i--) {
      extend(path[i], bbox);
    }
  }

  private condense(path:Node<T>[]) {
    // go through the path, removing empty nodes and updating bboxes
    for (let i = path.length - 1, siblings:Node<T>[]; i >= 0; i--) {
      if (path[i].children.length === 0) {
        if (i > 0) {
          siblings = path[i - 1].children as Node<T>[];
          siblings.splice(siblings.indexOf(path[i]), 1);
          freeNode(path[i]);
        } else {
          this.clear();
        }
      } else {
        calcBBox(path[i], this.toBBox);
      }
    }
  }

  private _insert(item:T | Node<T>, level:number, isNode?:boolean) {

    const toBBox = this.toBBox;
    const bbox = isNode ? <Node<T>>item : toBBox(<T>item);
    const insertPath:Node<T>[] = [];

    // find the best node for accommodating the item, saving all nodes along the path too
    const node = this.chooseSubtree(bbox, this.data, level, insertPath);

    // put the item into the node
    (node.children as any[]).push(item);

    extend(node, bbox);

    // split on node overflow; propagate upwards if necessary
    while (level >= 0) {
      if (insertPath[level].children.length > this.maxEntries) {
        this.split(insertPath, level);
        level--;
      } else break;
    }

    // adjust bboxes along the insertion path
    this.adjustParentBBoxes(bbox, insertPath, level);
  }
}
