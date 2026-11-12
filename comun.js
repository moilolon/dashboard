// Lo que comparten todos los dashboards: los ajustes, el menú, los formatos y las
// gráficas. Cada página declara en <body> dónde está la raíz (data-raiz) y qué
// entrada del menú es (data-pagina).

// ---------------------------------------------------------------- Ajustes

const AJUSTES = {
  tema: { rotulo: 'Tema', opciones: [['frio', 'Frío'], ['calido', 'Cálido']] },
  modo: { rotulo: 'Modo', opciones: [['auto', 'Auto'], ['claro', 'Claro'], ['oscuro', 'Oscuro']] },
  menu: { rotulo: 'Menú', opciones: [['arriba', 'Arriba'], ['lado', 'Lateral']] },
  ancho: { rotulo: 'Ancho', opciones: [['estrecho', 'Estrecho'], ['completo', 'Completo']] },
};
const POR_DEFECTO = { tema: 'frio', modo: 'auto', menu: 'lado', ancho: 'completo' };
const MUESTRAS = { frio: ['#f5f6f8', '#e2e5ea', '#7d8594', '#10141c', '#2a78d6'], calido: ['#f6f6f4', '#e4e3de', '#86857e', '#14140f', '#2a78d6'] };

function leerAjustes() {
  try { return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem('ajustes') || '{}') }; } catch (error) { return { ...POR_DEFECTO }; }
}

function aplicarAjustes(ajustes) {
  for (const clave of Object.keys(AJUSTES)) document.documentElement.dataset[clave] = ajustes[clave];
}

function guardarAjuste(clave, valor) {
  const ajustes = { ...leerAjustes(), [clave]: valor };
  try { localStorage.setItem('ajustes', JSON.stringify(ajustes)); } catch (error) { /* sin almacenamiento: vale para esta visita */ }
  aplicarAjustes(ajustes);
  window.dispatchEvent(new Event('resize'));
  return ajustes;
}

// Se aplican cuanto antes, para que la página no parpadee con otro tema.
aplicarAjustes(leerAjustes());

// ---------------------------------------------------------------- Menú

const ICONOS = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  cesta: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  marca: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  codigo: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
};
const icono = (nombre) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;

// Un dashboard nuevo es una entrada aquí, su carpeta y su tarjeta en el resumen.
const MENU = [
  { grupo: 'General', entradas: [{ id: 'resumen', titulo: 'Resumen', ruta: '', icono: 'inicio' }] },
  { grupo: 'Compra', entradas: [{ id: 'supermercado', titulo: 'Supermercado', ruta: 'supermercado/', icono: 'cesta' }] },
];

function pintarMenu() {
  const raiz = document.body.dataset.raiz || '';
  const pagina = document.body.dataset.pagina || '';
  const menu = document.getElementById('menu');
  if (!menu) return;
  menu.className = 'menu';
  menu.innerHTML = `<a class="marca" href="${raiz}">${icono('marca')}Dashboards</a>`
    + MENU.map((g) => `<div class="grupo">${g.grupo}</div>` + g.entradas.map((e) => `<a class="item${e.id === pagina ? ' actual' : ''}" href="${raiz}${e.ruta}">${icono(e.icono)}${e.titulo}</a>`).join('')).join('')
    + `<div class="abajo">
        <a class="item" href="https://github.com/moilolon/dashboard">${icono('codigo')}Código</a>
        <button class="item" id="boton-ajustes" aria-expanded="false">${icono('ajustes')}Ajustes</button>
        <div class="ajustes" id="ajustes" hidden></div>
      </div>`;

  const panel = document.getElementById('ajustes');
  const boton = document.getElementById('boton-ajustes');
  const pintarAjustes = () => {
    const ajustes = leerAjustes();
    panel.innerHTML = Object.entries(AJUSTES).map(([clave, a]) => `<div class="rotulo">${a.rotulo}</div><div class="grupo-botones">${a.opciones.map(([valor, texto]) => {
      const muestra = clave === 'tema' ? `<span class="muestra">${MUESTRAS[valor].map((c) => `<i style="background:${c}"></i>`).join('')}</span>` : '';
      return `<button data-clave="${clave}" data-valor="${valor}" class="${ajustes[clave] === valor ? 'actual' : ''}">${muestra}${texto}</button>`;
    }).join('')}</div>`).join('');
  };
  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    panel.hidden = !panel.hidden;
    boton.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) pintarAjustes();
  });
  panel.addEventListener('click', (evento) => {
    evento.stopPropagation();
    const b = evento.target.closest('button[data-clave]');
    if (!b) return;
    guardarAjuste(b.dataset.clave, b.dataset.valor);
    pintarAjustes();
  });
  document.addEventListener('click', () => { panel.hidden = true; boton.setAttribute('aria-expanded', 'false'); });
}

document.addEventListener('DOMContentLoaded', pintarMenu);

// ---------------------------------------------------------------- Formatos

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const porcentaje = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const fechaLarga = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaCorta = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
const fechaSinAno = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

const dia = (texto) => new Date(texto + 'T12:00:00');
const iso = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);

function restarDias(fecha, dias) {
  const d = dia(fecha);
  d.setDate(d.getDate() - dias);
  return iso(d);
}

function hace(fecha) {
  const dias = Math.round((dia(iso(new Date())) - dia(fecha)) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

// Subida o bajada, siempre con flecha y cifra además del color.
function cambio(antes, ahora, soloRelativo = false) {
  if (antes == null || ahora == null || antes === ahora) return '';
  const sube = ahora > antes;
  const relativo = antes ? porcentaje.format((ahora - antes) / antes) : '';
  const texto = soloRelativo && relativo ? relativo : `${euros.format(ahora - antes)}${relativo ? ' · ' + relativo : ''}`;
  return `<span class="cambio ${sube ? 'sube' : 'baja'}"><span class="flecha">${sube ? '▲' : '▼'}</span>${texto}</span>`;
}

// ---------------------------------------------------------------- Precios

// El precio de un producto en una fecha: el del último punto anterior o igual.
function precioEn(producto, fecha) {
  let precio = null;
  for (const [f, p] of producto.precios) {
    if (f <= fecha) precio = p; else break;
  }
  return precio;
}

async function cargarPrecios(raiz) {
  const respuesta = await fetch(`${raiz}supermercado/precios.json`, { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(respuesta.status);
  const datos = await respuesta.json();
  datos.lista = Object.entries(datos.productos)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.activo !== false && p.precios.length)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return datos;
}

// La suma de los precios en cada fecha en que algo cambió, desde una fecha.
function serieCesta(productos, desde, hasta) {
  const fechas = new Set([desde, hasta]);
  productos.forEach((p) => p.precios.forEach(([f]) => { if (f > desde && f <= hasta) fechas.add(f); }));
  return [...fechas].sort().map((f) => ({
    fecha: f,
    valor: productos.reduce((suma, p) => suma + (precioEn(p, f) ?? p.precios[0][1]), 0),
  }));
}

const CLASE_TIENDA = { Mercadona: 's1', Alcampo: 's2' };

// ---------------------------------------------------------------- Gráficas

// Línea en escalón: un valor vale hasta que cambia.
function graficaLinea(caja, serie, opciones = {}) {
  caja.innerHTML = '';
  if (!serie.length) { caja.innerHTML = '<p class="vacio">Sin datos.</p>'; return; }
  const ancho = Math.max(caja.clientWidth, 280);
  const alto = opciones.alto || 210;
  const m = { arriba: 10, derecha: 12, abajo: 22, izquierda: 54 };
  const t0 = dia(serie[0].fecha).getTime();
  const t1 = Math.max(dia(serie[serie.length - 1].fecha).getTime(), t0 + 86400000);
  let min = Math.min(...serie.map((s) => s.valor));
  let max = Math.max(...serie.map((s) => s.valor));
  const holgura = (max - min || max * 0.02 || 1) * 0.2;
  min = Math.max(0, min - holgura); max += holgura;
  const x = (t) => m.izquierda + ((t - t0) / (t1 - t0)) * (ancho - m.izquierda - m.derecha);
  const y = (v) => m.arriba + (1 - (v - min) / (max - min)) * (alto - m.arriba - m.abajo);

  let trazo = '';
  serie.forEach((s, i) => {
    const px = x(dia(s.fecha).getTime());
    trazo += i === 0 ? `M${px},${y(s.valor)}` : `H${px}V${y(s.valor)}`;
  });
  trazo += `H${x(t1)}`;

  const clase = opciones.clase || '';
  const ejeY = [0, 0.5, 1].map((f) => min + (max - min) * f).map((v) => `<line class="rejilla-y" x1="${m.izquierda}" x2="${ancho - m.derecha}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.izquierda - 8}" y="${y(v) + 3}" text-anchor="end">${euros.format(v)}</text>`).join('');
  const ejeX = `<text x="${m.izquierda}" y="${alto - 5}">${fechaCorta.format(new Date(t0))}</text><text x="${ancho - m.derecha}" y="${alto - 5}" text-anchor="end">${fechaCorta.format(new Date(t1))}</text>`;
  const marcas = serie.length > 1 && serie.length <= 40 ? serie.slice(1, -1).map((s) => `<circle class="marca ${clase}" r="4" cx="${x(dia(s.fecha).getTime())}" cy="${y(s.valor)}"/>`).join('') : '';

  caja.innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${esc(opciones.titulo || 'Evolución')}">
    <g class="eje">${ejeY}${ejeX}</g>
    <path class="linea ${clase}" d="${trazo}"/>${marcas}
    <line class="cursor" y1="${m.arriba}" y2="${alto - m.abajo}" visibility="hidden"/>
    <rect x="${m.izquierda}" y="${m.arriba}" width="${ancho - m.izquierda - m.derecha}" height="${alto - m.arriba - m.abajo}" fill="transparent"/>
  </svg><div class="globo" hidden></div>`;

  const svg = caja.querySelector('svg');
  const cursor = caja.querySelector('.cursor');
  const globo = caja.querySelector('.globo');
  const mover = (evento) => {
    const marco = svg.getBoundingClientRect();
    const px = ((evento.clientX - marco.left) / marco.width) * ancho;
    const t = t0 + ((px - m.izquierda) / (ancho - m.izquierda - m.derecha)) * (t1 - t0);
    let actual = serie[0];
    for (const s of serie) if (dia(s.fecha).getTime() <= t) actual = s;
    const cx = Math.min(Math.max(px, m.izquierda), ancho - m.derecha);
    cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx); cursor.setAttribute('visibility', 'visible');
    globo.hidden = false;
    globo.textContent = `${euros.format(actual.valor)} · desde el ${fechaCorta.format(dia(actual.fecha))}`;
    globo.style.left = `${(cx / ancho) * marco.width}px`;
    globo.style.top = `${(y(actual.valor) / alto) * marco.height}px`;
  };
  svg.addEventListener('pointermove', mover);
  svg.addEventListener('pointerdown', mover);
  svg.addEventListener('pointerleave', () => { cursor.setAttribute('visibility', 'hidden'); globo.hidden = true; });
}

// Barras apiladas: una por grupo, con un tramo por serie.
//   grupos: [{ etiqueta, valores: { Mercadona: 3, Alcampo: 1 } }]
//   series: [{ nombre: 'Mercadona', clase: 's1' }]
function graficaBarras(caja, grupos, series, opciones = {}) {
  caja.innerHTML = '';
  const total = (g) => series.reduce((s, serie) => s + (g.valores[serie.nombre] || 0), 0);
  const maximo = Math.max(...grupos.map(total), 0);
  if (!grupos.length || !maximo) { caja.innerHTML = `<p class="vacio">${esc(opciones.vacio || 'Sin datos.')}</p>`; return; }
  const ancho = Math.max(caja.clientWidth, 280);
  const alto = opciones.alto || 210;
  const m = { arriba: 10, derecha: 12, abajo: 22, izquierda: 30 };
  const tope = Math.max(maximo, 4);
  const paso = (ancho - m.izquierda - m.derecha) / grupos.length;
  const grosor = Math.min(Math.max(paso - 4, 2), 28);
  const y = (v) => m.arriba + (1 - v / tope) * (alto - m.arriba - m.abajo);

  const ejeY = [0, 0.5, 1].map((f) => Math.round(tope * f)).map((v) => `<line class="rejilla-y" x1="${m.izquierda}" x2="${ancho - m.derecha}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.izquierda - 8}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
  const ejeX = `<text x="${m.izquierda}" y="${alto - 5}">${esc(grupos[0].etiqueta)}</text><text x="${ancho - m.derecha}" y="${alto - 5}" text-anchor="end">${esc(grupos[grupos.length - 1].etiqueta)}</text>`;
  const barras = grupos.map((g, i) => {
    const cx = m.izquierda + paso * i + (paso - grosor) / 2;
    let base = 0;
    const tramos = series.map((serie) => {
      const v = g.valores[serie.nombre] || 0;
      if (!v) return '';
      const arriba = y(base + v), abajo = y(base);
      base += v;
      // 2 px de separación entre tramos apilados.
      return `<rect class="barra-${serie.clase}" x="${cx}" y="${arriba + 1}" width="${grosor}" height="${Math.max(abajo - arriba - 2, 1)}" rx="2"/>`;
    }).join('');
    return `<g data-i="${i}">${tramos}<rect x="${m.izquierda + paso * i}" y="${m.arriba}" width="${paso}" height="${alto - m.arriba - m.abajo}" fill="transparent"/></g>`;
  }).join('');

  caja.innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${esc(opciones.titulo || 'Barras')}"><g class="eje">${ejeY}${ejeX}</g>${barras}</svg><div class="globo" hidden></div>`;
  const svg = caja.querySelector('svg');
  const globo = caja.querySelector('.globo');
  svg.addEventListener('pointermove', (evento) => {
    const grupo = evento.target.closest('g[data-i]');
    if (!grupo) { globo.hidden = true; return; }
    const g = grupos[Number(grupo.dataset.i)];
    const marco = svg.getBoundingClientRect();
    globo.hidden = false;
    globo.textContent = `${g.etiqueta}: ${series.map((s) => `${s.nombre} ${g.valores[s.nombre] || 0}`).join(' · ')}`;
    globo.style.left = `${Math.min(Math.max(evento.clientX - marco.left, 90), marco.width - 90)}px`;
    globo.style.top = `${evento.clientY - marco.top}px`;
  });
  svg.addEventListener('pointerleave', () => { globo.hidden = true; });
}

// Minigráfica del precio de un producto entre dos fechas.
function chispa(producto, desde, hasta) {
  const puntos = [[desde, precioEn(producto, desde) ?? producto.precios[0][1]], ...producto.precios.filter(([f]) => f > desde && f <= hasta)];
  if (puntos.length < 2) return '';
  const t0 = dia(desde).getTime();
  const t1 = Math.max(dia(hasta).getTime(), t0 + 86400000);
  const valores = puntos.map(([, p]) => p);
  const min = Math.min(...valores), max = Math.max(...valores);
  const x = (t) => 2 + ((t - t0) / (t1 - t0)) * 80;
  const y = (v) => 19 - ((v - min) / (max - min || 1)) * 16;
  let d = '';
  puntos.forEach(([f, p], i) => { d += i === 0 ? `M${x(dia(f).getTime())},${y(p)}` : `H${x(dia(f).getTime())}V${y(p)}`; });
  return `<svg class="chispa" viewBox="0 0 84 22" aria-hidden="true"><path d="${d}H82"/></svg>`;
}
