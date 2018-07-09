import Benchmark = require('benchmark');
import { RBush3D } from '../src';
import { genData, convertTo2d } from './gendata';

const rbush = require('rbush');

const N = 10000,
  maxFill = 16;

const data = genData(N, 1);
const data2 = convertTo2d(data);

new Benchmark.Suite()
.add('insert ' + N + ' items (' + maxFill + ' node size)', function () {
  const tree = new RBush3D(maxFill);
  for (let i = 0; i < N; i++) {
    tree.insert(data[i]);
  }
})
.add('insert ' + N + ' items (' + maxFill + ' node size), rbush(original 2d version)', function () {
  const tree = rbush(maxFill);
  for (let i = 0; i < N; i++) {
    tree.insert(data[i]);
  }
})
.on('error', function(event:any) {
  console.log(event.target.error);
})
.on('cycle', function(event:any) {
  console.log(String(event.target));
})
.run();
