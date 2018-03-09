import forge from '../lib/forge.beer';



class License {
  constructor(jsonStr, userkey = null) {
    this._license = (jsonStr) ? JSON.parse(jsonStr): null;
    this._profiles = [License.BASIC_PROFILE, License.PROFILE_1_0];
    this._userkey = userkey;
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
      const sorted = jsonSort(licenseNoSignature)
      const canonical = JSON.stringify(sorted);
      md.update(canonical);

      if (!certificate.publicKey.verify(md.digest().bytes(), atob(this._license.signature.value))) {
        return reject('Invalid license signature');
      }
      return resolve(this);
    });
  }

  checkStart(license) {
    return true;
  }

  checkEnd(license) {
    return true;
  }

  checkUserKey(userkey) {
    return true;
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

export default License;
