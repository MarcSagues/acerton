// Piqo 4.0 · <piqo-svg> — sirve iconos, insignias, trofeos y la firma desde los maestros del kit.
// Pinta en shadow DOM para no tocar los hijos que gestiona el framework.
(function () {
  function markup(el) {
    var icon = el.getAttribute('icon');
    var badge = el.getAttribute('badge');
    var trophy = el.getAttribute('trophy');
    var logo = el.hasAttribute('logo');
    var state = el.getAttribute('state') || 'conseguida';
    var variant = el.getAttribute('variant') || 'mini';
    var theme = el.getAttribute('theme') || 'oscuro';
    var size = el.getAttribute('size');
    var vb = '0 0 24 24', body = '', w = size || 24, h = size || 24;
    if (icon) {
      body = (window.PIQO_ICONS || {})[icon] || '';
    } else if (badge) {
      var b = ((window.PIQO_ART || {}).badges || {})[badge];
      if (!b) return '';
      body = b[state][variant];
      vb = variant === 'mini' ? '0 0 24 24' : '0 0 256 256';
      if (!size) { w = h = variant === 'mini' ? 24 : 128; }
    } else if (trophy) {
      var t = ((window.PIQO_ART || {}).trophies || {})[trophy];
      if (!t) return '';
      body = variant === 'mini' ? t.mini : (theme === 'claro' ? t.det_cla : t.det_osc);
      vb = variant === 'mini' ? '0 0 24 24' : '0 0 256 256';
      if (!size) { w = h = variant === 'mini' ? 24 : 128; }
    } else if (logo) {
      body = window.PIQO_LOGO || '';
      vb = '0 0 790 250';
      w = size || 146;
      h = Math.round((w / 790) * 250 * 100) / 100;
    }
    return '<style>:host{display:inline-flex;flex:none;line-height:0}svg{display:block}</style>'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  function build(el) {
    if (!el.shadowRoot) el.attachShadow({ mode: 'open' });
    var next = markup(el);
    if (el.__piqo !== next) { el.__piqo = next; el.shadowRoot.innerHTML = next; }
  }
  class PiqoSvg extends HTMLElement {
    connectedCallback() { build(this); }
    static get observedAttributes() { return ['icon', 'badge', 'trophy', 'state', 'variant', 'theme', 'size', 'logo']; }
    attributeChangedCallback() { if (this.isConnected) build(this); }
  }
  if (!window.customElements.get('piqo-svg')) window.customElements.define('piqo-svg', PiqoSvg);
})();
