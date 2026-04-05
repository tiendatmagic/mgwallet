const { Mnemonic } = require('ethers');

const phrase = "flower danger collect shrug cat project bomb flower summer shock lawn element";
try {
  console.log('IsValid:', Mnemonic.isValidMnemonic(phrase));
} catch (e) {
  console.log('Error:', e.message);
}
