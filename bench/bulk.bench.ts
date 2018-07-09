import Benchmark = require('benchmark');
import { RBush3D } from '../src';
import { genData } from './gendata';

const N = 10000,
    maxFill = 16;

const data = genData(N, 1);

new Benchmark.Suite()
.add('bulk loading ' + N + ' items (' + maxFill + ' node size)', function () {
    const tree = new RBush3D(maxFill);
    tree.load(data);
})
.on('error', function(event:any) {
    console.log(event.target.error);
})
.on('cycle', function(event:any) {
    console.log(String(event.target));
})
.run();
