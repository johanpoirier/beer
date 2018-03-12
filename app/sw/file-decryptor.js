const decryptionMethods = {
  'http://www.idpf.org/2008/embedding': unObfusqIdpf,
  'http://ns.adobe.com/pdf/enc#RC': unObfusqAdobe,
  'http://www.w3.org/2001/04/xmlenc#aes256-cbc':lcpDecrypt
};

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
  return unObfuscteXor(data, prefixLength, key.idpf)
}

function unObfusqAdobe(data, key) {
  const prefixLength = 1024;
  return unObfuscteXor(data, prefixLength, key.adobe)
}

function lcpDecrypt(data, key) {
  return uncrypt(data, key.lcp);
}

function uncrypt(data, key) {
  /* get content key from encrypted value in license and according to algorithm*/
  const keyCipher = forge.cipher.createDecipher('AES-CBC', key.uk);
  if (key.ck.algorithm !== 'http://www.w3.org/2001/04/xmlenc#aes256-cbc') {
    /* return data for unsupported algorithms */
    return data;
  }
  keyCipher.start({ iv: atob(key.ck.encrypted_value).substring(0, keyCipher.blockSize) });
  keyCipher.update(forge.util.createBuffer(atob(key.ck.encrypted_value).substring(keyCipher.blockSize)));
  keyCipher.finish();
  const contentKey = keyCipher.output.getBytes();

  /**
   * extract content from content key for the moment only 
   * http://www.w3.org/2001/04/xmlenc#aes256-cbc is supported
   */
  const bin = arrayBuffer2Binary(data);
  contentCipher = forge.cipher.createDecipher('AES-CBC', contentKey);

  const iv = bin.substring(0, contentCipher.blockSize);
  const todecrypt = bin.substring(contentCipher.blockSize);
  contentCipher.start({ iv: iv });
  contentCipher.update(forge.util.createBuffer(todecrypt));
  contentCipher.finish();
  return contentCipher.output;
}

function arrayBuffer2Binary(buffer) {
  var binary = '';
  const bytes = new Uint8Array(buffer);
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}
