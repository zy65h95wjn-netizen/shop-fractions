// A restore replaces all collection fields with one atomic storage write.
window.MoonlitBackup = (() => {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string';
  const id = value => text(value) && value.trim() && !['__proto__','prototype','constructor'].includes(value);
  const image = value => value == null || (text(value) && (value === '' || /^https?:\/\//i.test(value)));
  function validate(d) {
    if(!record(d) || d.v!==1 || !record(d.sprites) || !Array.isArray(d.wishlist)) return false;
    if(!Object.entries(d.sprites).every(([key,value])=>id(key) && typeof value==='boolean')) return false;
    if(!d.wishlist.every(w=>record(w) && id(w.id) && text(w.name) && image(w.img) && (w.type==null || text(w.type)))) return false;
    if(![d.name,d.epic].every(v=>v==null || text(v))) return false;
    if(d.skin!=null && !(record(d.skin) && id(d.skin.id) && text(d.skin.name) && image(d.skin.img))) return false;
    return true;
  }
  return {validate};
})();
