import { RBush3D, Node, BBox } from '../src';
import REGL from 'regl';
import ERGLCamera from 'regl-camera';

const regl = REGL({
  extensions: 'OES_element_index_uint',
});

const camera = ERGLCamera(regl, {
  eye: [0, 0, 20],
  center: [0, 0, 0],
});

const colors = [
  [1, 0.3, 0],
  [0, 0.8, 0],
  [0.2, 0.45, 1],
];

const drawTree = regl({
  frag: `
    precision lowp float;
    uniform vec4 color;
    void main () {
        gl_FragColor = color;
    }
    `,

  vert: `
    precision highp float;
    attribute vec3 position;
    uniform mat4 projection, view;
    void main () {
        gl_Position = projection * view * vec4(position, 1);
    }
    `,

  blend: {
    enable: true,
    func: {
      src: 'src alpha',
      dst: 1,
    },
    equation: 'add',
  },

  attributes: {
    position: regl.prop<any, any>('position'),
  },

  uniforms: {
    color: regl.prop<any, any>('color'),
  },

  primitive: 'lines',
  count: regl.prop<any, any>('count'),
})

const BOX_EDGES: number[] = [];
for (let i = 0; i < 8; ++i) {
  for (let j = 0; j < i; ++j) {
    if ((i ^ j) === 1 ||
      (i ^ j) === 2 ||
      (i ^ j) === 4) {
      BOX_EDGES.push(i, j)
    }
  }
}

const tree = new RBush3D(10);
let treeMesh: {
  color: number[];
  position: REGL.Buffer,
  count: number;
}[] = [];

function updateMesh() {
  const boxes: number[][] = []

  function processNode(node: Node | BBox, level: number) {
    while (boxes.length <= level) {
      boxes.push([])
    }
    const out = boxes[level]
    for (let i = 0; i < BOX_EDGES.length; ++i) {
      const e = BOX_EDGES[i]
      if (e & 1) {
        out.push(node.minX)
      } else {
        out.push(node.maxX)
      }
      if (e & 2) {
        out.push(node.minY)
      } else {
        out.push(node.maxY)
      }
      if (e & 4) {
        out.push(node.minZ)
      } else {
        out.push(node.maxZ)
      }
    }
    if (level === 6) {
      return
    }
    if (node.children) {
      for (let i = 0; i < node.children.length; ++i) {
        processNode(node.children[i], level + 1)
      }
    }
  }

  processNode(tree.data, 0)

  treeMesh.forEach((m) => m.position.destroy())
  treeMesh = boxes.map((list, i) => {
    const c = colors[i % colors.length]
    return {
      color: [c[0], c[1], c[2], Math.pow(0.99, i)],
      position: regl.buffer(list),
      count: list.length / 3,
    }
  })
}

function randBox(size: number) {
  const x = Math.random() * (2 - size) - 1,
    y = Math.random() * (2 - size) - 1,
    z = Math.random() * (2 - size) - 1;
  return {
    minX: x,
    minY: y,
    minZ: z,
    maxX: x + size * Math.random(),
    maxY: y + size * Math.random(),
    maxZ: z + size * Math.random(),
  };
}

function genData(n: number) {
  const data = [];
  for (let i = 0; i < n; i++) {
    data[i] = randBox(0.25);
  }
  return data;
}

function genInsertOneByOne(k: number) {
  return () => {
    const data2 = genData(k);

    console.time(`insert ${k} items`);
    for (let i = 0; i < k; i++) {
      tree.insert(data2[i])
    }
    console.timeEnd(`insert ${k} items`);

    updateMesh()
  };
}

function genBulkInsert(k: number) {
  return () => {
    const data2 = genData(k)

    console.time(`bulk-insert ${k} items`);
    tree.load(data2)
    console.timeEnd(`bulk-insert ${k} items`);

    updateMesh()
  };
}

genBulkInsert(1000)();

regl.frame(() => {
  camera(() => {
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    })
    drawTree(treeMesh);
  })
});
