(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AudioTargets = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const key = target => String(target).toLowerCase();
  const isApplication = target => !target.startsWith('@') || key(target).startsWith('@process:');
  function matches(target, session) {
    return key(target) === key(session.target) || (key(target).startsWith('@process:') && key(target.slice(9)) === key(session.processName || ''));
  }
  function merge(...lists) {
    const rows = new Map();
    for (const item of lists.flat()) if (isApplication(item.target)) rows.set(key(item.target), item);
    return [...rows.values()];
  }
  return { key, isApplication, matches, merge };
});
