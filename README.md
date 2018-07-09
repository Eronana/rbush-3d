RBush-3D
=====

RBush-3D is 3D version of [RBush](https://github.com/mourner/rbush).

[![Build Status](https://travis-ci.org/Eronana/rbush-3d.svg?branch=master)](https://travis-ci.org/Eronana/rbush-3d)
[![Coverage Status](https://coveralls.io/repos/github/Eronana/rbush-3d/badge.svg?branch=master)](https://coveralls.io/github/Eronana/rbush-3d?branch=master)

## TODO
- [x] real 3D test
- [ ] Demos
- [x] Benchmarks


## Install

Install with NPM (`npm install rbush-3d`), and Chinese user could use CNPM(`cnpm install rbush-3d`).

Or use CDN links for browsers:
[rbush3d.js](https://unpkg.com/rbush-3d@0.0.4/dist/rbush3d.js),
[rbush3d.min.js](https://unpkg.com/rbush-3d@0.0.4/dist/rbush3d.min.js)

## Usage

### Creating a Tree

```typescript
improt { RBush3D } from 'rbush-3d';
const tree = new RBush3D();
```

An optional argument to `RBush3D` defines the maximum number of entries in a tree node.
`16` (used by default) is a reasonable choice for most applications.
Higher value means faster insertion and slower search, and vice versa.

```typescript
const tree = new RBush3D(16);
```

### Adding Data

Insert an item:

```typescript
const item = {
    minX: 20,
    minY: 40,
    minZ: 60,
    maxX: 30,
    maxY: 50,
    maxZ: 70,
    foo: 'bar'
};
tree.insert(item);
```

### Removing Data

Remove a previously inserted item:

```typescript
tree.remove(item);
```

By default, RBush-3D removes objects by reference.
However, you can pass a custom `equals` function to compare by value for removal,
which is useful when you only have a copy of the object you need removed (e.g. loaded from server):

```typescript
tree.remove(itemCopy, function (a, b) {
    return a.id === b.id;
});
```

Remove all items:

```typescript
tree.clear();
```

### Data Format

By default, RBush-3D assumes the format of data points to be an object
with `minX`, `minY`, `minZ`, `maxX`, `maxY` and `maxZ` properties.
You can customize this by providing an array with corresponding accessor strings
as a second argument to `rbush3d` like this:

```typescript
const tree = rbush3d(16, ['[0]', '[1]', '[2]', '[0]', '[1]', '[2]']); // accept [x, y, z] points
tree.insert([20, 50, 80]);
```

### Bulk-Inserting Data

Bulk-insert the given data into the tree:

```typescript
tree.load([item1, item2, ...]);
```

Bulk insertion is usually ~2-3 times faster than inserting items one by one.
After bulk loading (bulk insertion into an empty tree),
subsequent query performance is also ~20-30% better.

Note that when you do bulk insertion into an existing tree,
it bulk-loads the given data into a separate tree
and inserts the smaller tree into the larger tree.
This means that bulk insertion works very well for clustered data
(where items in one update are close to each other),
but makes query performance worse if the data is scattered.

### Search

```typescript
const result = tree.search({
    minX: 40,
    minY: 20,
    minZ: 50,
    maxX: 80,
    maxY: 70,
    maxZ: 90
});
```

Returns an array of data items (points or rectangles) that the given bounding box intersects.

Note that the `search` method accepts a bounding box in `{minX, minY, minZ, maxX, maxY, maxZ}` format
regardless of the format specified in the constructor (which only affects inserted objects).

```typescript
const allItems = tree.all();
```

Returns all items of the tree.

### Collisions

```typescript
const result = tree.collides({minX: 40, minY: 20, minZ: 50, maxX: 80, maxY: 70, maxZ: 90});
```

Returns `true` if there are any items intersecting the given bounding box, otherwise `false`.


### Export and Import

```typescript
// export data as JSON object
const treeData = tree.toJSON();

// import previously exported data
const tree = rbush3d(16).fromJSON(treeData);
```

Importing and exporting as JSON allows you to use RBush-3D on both the server (using Node.js) and the browser combined,
e.g. first indexing the data on the server and and then importing the resulting tree data on the client for searching.

Note that the `nodeSize` option passed to the constructor must be the same in both trees for export/import to work properly.

## Performance

The following sample performance test was done by generating
random uniformly distributed rectangles of ~0.01% area and setting `maxEntries` to `16`
(see `debug/perf.ts` script).
Performed with Node.js v8.9.1 on a MacBook Pro (15-inch, 2017).

Test                         | RBush-3D | [RBush](https://github.com/mourner/rbush) (2D version)
---------------------------- | -------- | ------
insert 1M items one by one   | 4.30s    | 2.94s
1000 searches of 0.01% area  | 0.02s    | 0.03s
1000 searches of 1% area     | 0.09s    | 0.31s
1000 searches of 10% area    | 0.73s    | 1.80s
remove 1000 items one by one | 0.02s    | 0.02s
bulk-insert 1M items         | 1.40s    | 1.17s


## Algorithms Used

* single insertion: non-recursive R-tree insertion with overlap minimizing split routine from R\*-tree (split is very effective in JS, while other R\*-tree modifications like reinsertion on overflow and overlap minimizing subtree search are too slow and not worth it)
* single deletion: non-recursive R-tree deletion using depth-first tree traversal with free-at-empty strategy (entries in underflowed nodes are not reinserted, instead underflowed nodes are kept in the tree and deleted only when empty, which is a good compromise of query vs removal performance)
* bulk loading: OMT algorithm (Overlap Minimizing Top-down Bulk Loading) combined with Floyd–Rivest selection algorithm
* bulk insertion: STLT algorithm (Small-Tree-Large-Tree)
* search: standard non-recursive R-tree search

## Papers

* [R-trees: a Dynamic Index Structure For Spatial Searching](http://www-db.deis.unibo.it/courses/SI-LS/papers/Gut84.pdf)
* [The R*-tree: An Efficient and Robust Access Method for Points and Rectangles+](http://dbs.mathematik.uni-marburg.de/publications/myPapers/1990/BKSS90.pdf)
* [OMT: Overlap Minimizing Top-down Bulk Loading Algorithm for R-tree](http://ftp.informatik.rwth-aachen.de/Publications/CEUR-WS/Vol-74/files/FORUM_18.pdf)
* [Bulk Insertions into R-Trees Using the Small-Tree-Large-Tree Approach](http://www.cs.arizona.edu/~bkmoon/papers/dke06-bulk.pdf)
* [R-Trees: Theory and Applications (book)](http://www.apress.com/9781852339777)

## Development

```bash
npm install   # install dependencies

npm test      # check the code with JSHint and run tests
npm run perf  # run performance benchmarks
npm run cover # report test coverage (with more detailed report in coverage/lcov-report/index.html)
npm run viz   # show 3d visualization in browser
```
