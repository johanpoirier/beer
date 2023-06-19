const decryptionMethods = {
  'http://www.idpf.org/2008/embedding': unObfusqIdpf,
  'http://ns.adobe.com/pdf/enc#RC': unObfusqAdobe
};

// eslint-disable-next-line no-unused-vars
class FileDecryptor {
  static decrypt(epub, filePath, data) {
    if (filePath in epub.encryptedItems) {
      const encryptedItem = epub.encryptedItems[filePath];
      console.debug(`[BEER-SW] decrypting ${filePath} from the epub file with ${encryptedItem.algorithm}`);
      return decryptionMethods[encryptedItem.algorithm](data, encryptedItem.key);
    }
    return data;
  }
}

function unObfuscteXor(data, prefix, key) {
  const masklen = key.length;
  const array = new Uint8Array(data);
  for (let i = 0; i < prefix; i++) {
    array[i] = (array[i] ^ (key[i % masklen]));
  }
  return array.buffer;
}

function unObfusqIdpf(data, key) {
  const prefixLength = 1040;
  return unObfuscteXor(data, prefixLength, key.idpf);
}

function unObfusqAdobe(data, key) {
  const prefixLength = 1024;
  return unObfuscteXor(data, prefixLength, key.adobe);
}
