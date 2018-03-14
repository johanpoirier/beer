import forge from '../lib/forge.beer';



class License {
  constructor(jsonStr, passphrase = null) {
    this._license = (jsonStr) ? JSON.parse(jsonStr): null;
    this._profiles = [License.BASIC_PROFILE, License.PROFILE_1_0];
    this._passphrase = passphrase;
    if (this._passphrase) {
      const md = forge.md.sha256.create();
      md.update(passphrase);
      this._userKey = md.digest().bytes();
    }
  }

  get userKey() {
    return this._userKey;
  }

  get contentKey() {
    return this._license.encryption.content_key;
  }

  checkProfile() {
    return new Promise((resolve, reject) => {
      if (!this._license || this._profiles.indexOf(this._license.encryption.profile) >= 0) {
        return resolve(this);
      }
      return reject(`Unknow profile ${this._license.profile}`);
    });
  }

  checkCertificate(ca, crl) {
    return new Promise((resolve, reject) => {
      const certificate = forge.pki.certificateFromAsn1(forge.asn1.fromDer(atob(this._license.signature.certificate)));
      const notBefore = new Date(certificate.validity.notBefore);
      const notAfter = new Date(certificate.validity.notAfter);
      const licenseUpdated = new Date(this._license.updated || this._license.issued);

      if (licenseUpdated.getTime() < notBefore.getTime()) {
        return reject(`License issue at ${licenseUpdated.getTime()}, before the certificate became valid: ${notBefore.getTime()}`);
      }
      if (licenseUpdated.getTime() > notAfter.getTime()) {
        return reject(`License issue at ${licenseUpdated.getTime()}, after the certificate became invalid: ${notAfter.getTime()}`);
      }
      resolve(this);
      /* TODO: Get CA certificate and check license certificate with it) */
    });
  }

  checkSignature() {
    return new Promise((resolve, reject) => {
      var licenseNoSignature = JSON.parse(JSON.stringify(this._license));
      const certificate = forge.pki.certificateFromAsn1(forge.asn1.fromDer(atob(this._license.signature.certificate)));
      delete licenseNoSignature.signature;
      var md = forge.md.sha256.create();
      md.update(JSON.stringify(jsonSort(licenseNoSignature)));

      if (!certificate.publicKey.verify(md.digest().bytes(), atob(this._license.signature.value))) {
        return reject('Invalid license signature');
      }
      return resolve(this);
    });
  }

  checkStart() {
    return new Promise((resolve, reject) => {
      if (this._license.rights && this._license.rights.start) {
        const now = Date.now().getTime();
        const start = new Date(this._license.rights.start).getTime();
        if (start > now) {
          return reject('The license is not yet valid');
        }
      }
      return resolve(this);
    });
  }

  checkEnd() {
    return new Promise((resolve, reject) => {
      if (this._license.rights && this._license.rights.end) {
        const now = Date.now().getTime();
        const end = new Date(this._license.rights.end).getTime();
        if (end < now) {
          return reject('The license is no more valid');
        }
      }
      return resolve(this);
    });
  }

  checkUserKey(passphrase) {
    return new Promise((resolve, reject) => {
      if (this._license.encryption.user_key.key_check) {
        uncrypt('AES-CBC', atob(this._license.encryption.user_key.key_check), this._userKey).then(
          clearText => {
            if (this._license.id !== clearText.data) {
              return reject('Bad passphrase or user key');
            }
            return resolve(this);
          });
      }
    });
  }
}

License.BASIC_PROFILE = 'http://readium.org/lcp/basic-profile'
License.PROFILE_1_0 = 'http://readium.org/lcp/profile-1.0'

function jsonSort(object) {

  if (object instanceof Array) {
    var ret = Array(); 
    for (var i = 0; i < object.length; i++)  {
      value = object[i];
      if (value instanceof Object) {
        value = jsonSort(value);
      }
      else if (value instanceof Array) {
        value = jsonSort(value);
      }
      ret.push(value)
    }
    return ret;
  }
  else if (object instanceof Object) {
    var ret = {};
    var keys = Object.keys(object);
    keys.sort();
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var value = object[key];
      if (value instanceof Object) {
        value = jsonSort(value);
      }
      else if (value instanceof Array) {
        value = jsonSort(value);
      }
      ret[key] = value;
    }
    return ret;
  }
  return object;
}

function uncrypt(algo, data, key) {
  return new Promise(function (resolve, reject) {
    try {
      const cipher = forge.cipher.createDecipher(algo, key);
      cipher.start({ iv: data.substring(0, cipher.blockSize) });
      cipher.update(forge.util.createBuffer(data.substring(cipher.blockSize)));
      cipher.finish();
      resolve(cipher.output);
    } catch(e) {
      reject("Key is invalid: " + e.message);
    }
  });
}

export default License;
