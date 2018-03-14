const decryptionMethods = {
  'http://www.idpf.org/2008/embedding': unObfusqIdpf,
  'http://ns.adobe.com/pdf/enc#RC': unObfusqAdobe,
  'http://www.w3.org/2001/04/xmlenc#aes256-cbc': lcpDecrypt
};

class FileDecryptor {
  static decrypt(epub, filePath, data) {
    if (filePath in epub.encryptedItems) {
      const encryptedItem = epub.encryptedItems[filePath];
      console.debug(`[BEER-SW] decrypting ${filePath} from the epub file with ${encryptedItem.algorithm}`);
      return decryptionMethods[encryptedItem.algorithm](data, encryptedItem.info);
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

function unObfusqIdpf(data, info) {
  const prefixLength = 1040;
  return unObfuscteXor(data, prefixLength, info.idpf)
}

function unObfusqAdobe(data, info) {
  const prefixLength = 1024;
  return unObfuscteXor(data, prefixLength, info.adobe)
}

function lcpDecrypt(data, info) {
  const lcp = info.lcp;
  return decipher(atob(lcp.content_key.encrypted_value), lcp.user_key, lcp.content_key.algorithm)
    .then(contentKey => {
      return decipher(array2bin(data), contentKey, lcp.content_algo);
    })
    .then(content => unzip(content, lcp.compression, lcp.length));
}

function decipher(data, key, algo) {
  return new Promise((resolve, reject) => {
    if (algo !== 'http://www.w3.org/2001/04/xmlenc#aes256-cbc') {
      return reject('Unknown algorithm');
    }
    const cipher = forge.cipher.createDecipher('AES-CBC', key);
    cipher.start({ iv: data.substring(0, cipher.blockSize) });
    cipher.update(forge.util.createBuffer(data.substring(cipher.blockSize)));
    cipher.finish();
    return resolve(cipher.output.getBytes());
  });
}

function unzip(data, compression) {
  if (compression === '8') {
    return pako.inflateRaw(arrayData, { to: 'string' });
  }
  return arrayData;
}

function array2bin(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function bin2array(binary) {
  const uint8Array = new Uint8Array(binary.length);
  for (let i = 0; i < uint8Array.length; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  return uint8Array;
}
