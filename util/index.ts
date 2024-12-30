export const base64_urlencode = (str: string) => {
  return btoa(String.fromCharCode.apply(null,
    new Uint8Array(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
}
