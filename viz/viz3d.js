const regl = require('regl')({
    extensions: 'OES_element_index_uint'
})
const camera = require('regl-camera')(regl, {
    eye: [0, 0, 20],
    center: [0, 0, 0],
})
const rbush3d = require('../index')

const colors = [
    [1, 0.3, 0],
    [0, 0.8, 0],
    [0.2, 0.45, 1]
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
            dst: '1'
        },
        equation: 'add'
    },

    attributes: {
        position: regl.prop('position'),
    },

    uniforms: {
        color: regl.prop('color'),
    },

    primitive: 'lines',
    count: regl.prop('count'),
})

const BOX_EDGES = []
for (let i = 0; i < 8; ++i) {
    for (let j = 0; j < i; ++j) {
        if ((i ^ j) === 1 ||
            (i ^ j) === 2 ||
            (i ^ j) === 4) {
            BOX_EDGES.push(i, j)
        }
    }
}

const tree = rbush3d(10)
let treeMesh = []

function updateMesh () {
    const boxes = []

    function processNode (node, level) {
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

    treeMesh.forEach(() => treeMesh.position.destroy())
    treeMesh = boxes.map((list, i) => {
        const c = colors[i % colors.length]
        return {
            color: [c[0], c[1], c[2], Math.pow(0.99, i)],
            position: regl.buffer(list),
            count: list.length / 3
        }
    })
}

function randBox(size) {
    var x = Math.random() * (2 - size) - 1,
        y = Math.random() * (2 - size) - 1,
        z = Math.random() * (2 - size) - 1;
    return {
        minX: x,
        minY: y,
        minZ: z,
        maxX: x + size * Math.random(),
        maxY: y + size * Math.random(),
        maxZ: z + size * Math.random()
    };
}

function genData(N) {
    var data = [];
    for (var i = 0; i < N; i++) {
        data[i] = randBox(0.25);
    }
    return data;
}

function genInsertOneByOne(K) {
    return function () {
        var data2 = genData(K)

        console.time('insert ' + K + ' items')
        for (var i = 0; i < K; i++) {
            tree.insert(data2[i])
        }
        console.timeEnd('insert ' + K + ' items')

        updateMesh()
    }
}

function genBulkInsert(K) {
    return function () {
        var data2 = genData(K)

        console.time('bulk-insert ' + K + ' items')
        tree.load(data2)
        console.timeEnd('bulk-insert ' + K + ' items')

        updateMesh()
    };
}

genBulkInsert(1000)()

regl.frame(() => {
    camera(() => {
        regl.clear({
            color: [0, 0, 0, 1],
            depth: 1
        })
        drawTree(treeMesh)
    })
})
