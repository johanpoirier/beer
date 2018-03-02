class License {
  constructor(jsonStr, userkey = null) {
    this._license = JSON.parse(jsonStr)
    this._profiles = [License.BASIC_PROFILE, License.PROFILE_1_0];
    this._userkey = userkey;
  }

  get profile() {
    return this._license.profile;
  }

  checkProfile() {
    return this._profiles.indexOf(this._license.profile) >= 0;
  }

  checkCertificate(ca, crl) {
    return true;
  }

  checkSignature() {
    return true;
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

export default License;
