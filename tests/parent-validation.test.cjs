const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = process.env.PILOT_REPO || path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/models/Blockchain.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export default Blockchain;', 'globalThis.Blockchain = Blockchain;');
const context = vm.createContext({});
vm.runInContext(source, context, {timeout: 1000});
function fixture(parent, height) {
  const chain = Object.create(context.Blockchain.prototype);
  chain.blocks = parent ? { parent } : {};
  chain.pendingTransactions = {};
  chain.maxHeightBlock = () => { throw new Error('Invalid block reached chain state'); };
  const block = {hash:'candidate', parentHash: 'parent', height, isValid: () => true};
  return {chain, block};
}
test('unknown parent is rejected without throwing or changing state', () => {
  const {chain, block} = fixture(undefined, 2);
  assert.doesNotThrow(() => chain._addBlock(block));
  assert.deepEqual(Object.keys(chain.blocks), []);
});
test('known parent with incorrect child height is rejected before pool changes', () => {
  const {chain, block} = fixture({height:2}, 99);
  assert.doesNotThrow(() => chain._addBlock(block));
  assert.deepEqual(Object.keys(chain.blocks), ['parent']);
});
test('duplicate blocks remain ignored', () => {
  const {chain, block} = fixture({height:2}, 3);
  chain.blocks.candidate = block;
  assert.doesNotThrow(() => chain._addBlock(block));
});
test('invalid proof is rejected before parent lookup', () => {
  const {chain, block} = fixture(undefined, 2);
  block.isValid = () => false;
  assert.doesNotThrow(() => chain._addBlock(block));
  assert.deepEqual(Object.keys(chain.blocks), []);
});
