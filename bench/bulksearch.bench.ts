import Benchmark = require('benchmark');
import { RBush3D } from '../src';
import { genData } from './gendata';

const N = 10000,
  maxFill = 16;

const data = genData(N, 1);
const bboxes100 = genData(1000, 100 * Math.sqrt(0.1));
const bboxes10 = genData(1000, 10);
const bboxes1 = genData(1000, 1);

const tree = new RBush3D(maxFill);
tree.load(data);

new Benchmark.Suite()
.add('1000 searches 10% after bulk loading ' + N, function () {
  for (let i = 0; i < 1000; i++) {
    tree.search(bboxes100[i]);
  }
})
.add('1000 searches 1% after bulk loading ' + N, function () {
  for (let i = 0; i < 1000; i++) {
    tree.search(bboxes10[i]);
  }
})
.add('1000 searches 0.01% after bulk loading ' + N, function () {
  for (let i = 0; i < 1000; i++) {
    tree.search(bboxes1[i]);
  }
})
.on('error', function(event:any) {
  console.log(event.target.error);
})
.on('cycle', function(event:any) {
  console.log(String(event.target));
})
.run();
