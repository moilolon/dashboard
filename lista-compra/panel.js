// Panel de precios de la compra. Lee precios.json, que solo guarda un punto por
// producto cada vez que su precio cambia, y lo pinta sin bibliotecas.
//
// precios.json:
//   { "actualizado": "2026-11-12",
//     "productos": { "mercadona:4706": {
//        "nombre": "Aceite de oliva", "tienda": "Mercadona", "unidad": "ud",
//        "categoria": "Aceite, especias y salsas", "activo": true,
//        "precios": [["2026-11-12", 5.25], ...] } } }

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const porcentaje = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const fechaLarga = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaCorta = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });

const dia = (texto) => new Date(texto + 'T12:00:00');
const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);

let datos = { actualizado: '', productos: {} };

// El precio de un producto en una fecha: el del último punto anterior o igual.
function precioEn(producto, fecha) {
  let precio = null;
  for (const [f, p] of producto.precios) {
    if (f <= fecha) precio = p; else break;
  }
  return precio;
}

function cambio(antes, ahora) {
  if (antes == null || ahora == null || antes === ahora) return '';
  const sube = ahora > antes;
  const relativo = antes ? porcentaje.format((ahora - antes) / antes) : '';
  return `<span class="cambio ${sube ? 'sube' : 'baja'}"><span class="flecha">${sube ? '▲' : '▼'}</span>${euros.format(ahora - antes)}${relativo ? ' · ' + relativo : ''}</span>`;
}

function visibles() {
  const tienda = $('tienda').value;
  const texto = $('buscar').value.trim().toLowerCase();
  return Object.entries(datos.productos)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.activo !== false && p.precios.length)
    .filter((p) => !tienda || p.tienda === tienda)
    .filter((p) => !texto || p.nombre.toLowerCase().includes(texto))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// Serie de la cesta: la suma de los precios en cada fecha en que algo cambió.
function serieCesta(productos) {
  const fechas = new Set([datos.actualizado]);
  productos.forEach((p) => p.precios.forEach(([f]) => fechas.add(f)));
  return [...fechas].filter(Boolean).sort().map((f) => ({
    fecha: f,
    valor: productos.reduce((suma, p) => suma + (precioEn(p, f) ?? p.precios[0][1]), 0),
  }));
}

// Línea en escalón: un precio vale hasta que cambia.
function pintarGrafica(caja, serie, opciones = {}) {
  caja.innerHTML = '';
  if (!serie.length) { caja.innerHTML = '<p class="vacio">Sin datos.</p>'; return; }
  const ancho = Math.max(caja.clientWidth, 280);
  const alto = opciones.alto || 220;
  const m = { arriba: 12, derecha: 14, abajo: 24, izquierda: 56 };
  const t0 = dia(serie[0].fecha).getTime();
  const t1 = Math.max(dia(serie[serie.length - 1].fecha).getTime(), t0 + 86400000);
  let min = Math.min(...serie.map((s) => s.valor));
  let max = Math.max(...serie.map((s) => s.valor));
  const holgura = (max - min || max * 0.1 || 1) * 0.15;
  min = Math.max(0, min - holgura); max += holgura;
  const x = (t) => m.izquierda + ((t - t0) / (t1 - t0)) * (ancho - m.izquierda - m.derecha);
  const y = (v) => m.arriba + (1 - (v - min) / (max - min)) * (alto - m.arriba - m.abajo);

  let trazo = '';
  serie.forEach((s, i) => {
    const px = x(dia(s.fecha).getTime());
    trazo += i === 0 ? `M${px},${y(s.valor)}` : `H${px}V${y(s.valor)}`;
  });
  trazo += `H${x(t1)}`;

  const marcas = [0, 0.5, 1].map((f) => min + (max - min) * f);
  const ejeY = marcas.map((v) => `<line class="rejilla-y" x1="${m.izquierda}" x2="${ancho - m.derecha}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.izquierda - 8}" y="${y(v) + 4}" text-anchor="end">${euros.format(v)}</text>`).join('');
  const ejeX = `<text x="${m.izquierda}" y="${alto - 6}">${fechaCorta.format(new Date(t0))}</text><text x="${ancho - m.derecha}" y="${alto - 6}" text-anchor="end">${fechaCorta.format(new Date(t1))}</text>`;
  const puntos = serie.length <= 40 ? serie.map((s) => `<circle class="punto" r="4" cx="${x(dia(s.fecha).getTime())}" cy="${y(s.valor)}"/>`).join('') : '';

  caja.innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${esc(opciones.titulo || 'Evolución del precio')}">
    <g class="eje">${ejeY}${ejeX}</g>
    <path class="linea" d="${trazo}"/>${puntos}
    <line class="cursor" y1="${m.arriba}" y2="${alto - m.abajo}" visibility="hidden"/>
    <rect x="${m.izquierda}" y="${m.arriba}" width="${ancho - m.izquierda - m.derecha}" height="${alto - m.arriba - m.abajo}" fill="transparent"/>
  </svg><div class="globo" hidden></div>`;

  const svg = caja.querySelector('svg');
  const cursor = caja.querySelector('.cursor');
  const globo = caja.querySelector('.globo');
  const mover = (evento) => {
    const caja2 = svg.getBoundingClientRect();
    const px = ((evento.clientX - caja2.left) / caja2.width) * ancho;
    const t = t0 + ((px - m.izquierda) / (ancho - m.izquierda - m.derecha)) * (t1 - t0);
    let actual = serie[0];
    for (const s of serie) if (dia(s.fecha).getTime() <= t) actual = s;
    const cx = Math.min(Math.max(px, m.izquierda), ancho - m.derecha);
    cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx); cursor.setAttribute('visibility', 'visible');
    globo.hidden = false;
    globo.textContent = `${euros.format(actual.valor)} · desde el ${fechaCorta.format(dia(actual.fecha))}`;
    globo.style.left = `${(cx / ancho) * caja2.width}px`;
    globo.style.top = `${(y(actual.valor) / alto) * caja2.height}px`;
  };
  const salir = () => { cursor.setAttribute('visibility', 'hidden'); globo.hidden = true; };
  svg.addEventListener('pointermove', mover);
  svg.addEventListener('pointerdown', mover);
  svg.addEventListener('pointerleave', salir);
}

function chispa(producto) {
  const precios = producto.precios;
  if (precios.length < 2) return '';
  const t0 = dia(precios[0][0]).getTime();
  const t1 = Math.max(dia(datos.actualizado || precios[precios.length - 1][0]).getTime(), t0 + 86400000);
  const valores = precios.map(([, p]) => p);
  const min = Math.min(...valores), max = Math.max(...valores);
  const x = (t) => 2 + ((t - t0) / (t1 - t0)) * 86;
  const y = (v) => 21 - ((v - min) / (max - min || 1)) * 18;
  let d = '';
  precios.forEach(([f, p], i) => { d += i === 0 ? `M${x(dia(f).getTime())},${y(p)}` : `H${x(dia(f).getTime())}V${y(p)}`; });
  return `<svg class="chispa" viewBox="0 0 90 24" aria-hidden="true"><path d="${d}H88"/></svg>`;
}

function pintarCifras(productos, serie) {
  const hoy = serie.length ? serie[serie.length - 1].valor : 0;
  const inicio = serie.length ? serie[0].valor : 0;
  const conCambio = productos.filter((p) => p.precios.length > 1);
  const suben = conCambio.filter((p) => p.precios.at(-1)[1] > p.precios.at(-2)[1]).length;
  const bajan = conCambio.length - suben;
  const cifras = [
    ['Productos', String(productos.length), ''],
    ['Cesta hoy', euros.format(hoy), ''],
    ['Desde el inicio', hoy === inicio ? 'Sin cambios' : (hoy > inicio ? '▲ ' : '▼ ') + euros.format(Math.abs(hoy - inicio)), serie.length ? `${hoy === inicio || !inicio ? '' : porcentaje.format((hoy - inicio) / inicio) + ' '}desde el ${fechaCorta.format(dia(serie[0].fecha))}` : ''],
    ['Último cambio de cada producto', `${suben} ▲ · ${bajan} ▼`, `${productos.length - conCambio.length} sin cambios todavía`],
  ];
  $('cifras').innerHTML = cifras.map(([rotulo, valor, detalle]) => `<div class="tarjeta cifra"><div class="rotulo">${rotulo}</div><div class="valor">${valor}</div><div class="detalle">${detalle}</div></div>`).join('');
}

function pintarCambios(productos) {
  const filas = productos
    .filter((p) => p.precios.length > 1)
    .map((p) => ({ p, fecha: p.precios.at(-1)[0], antes: p.precios.at(-2)[1], ahora: p.precios.at(-1)[1] }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.p.nombre.localeCompare(b.p.nombre, 'es'))
    .slice(0, 10);
  $('cambios').innerHTML = filas.length
    ? `<table><thead><tr><th>Producto</th><th class="num">Fecha</th><th class="num">Antes</th><th class="num">Ahora</th><th class="num">Cambio</th></tr></thead><tbody>${filas.map((f) => `<tr class="fila" data-id="${esc(f.p.id)}"><td>${esc(f.p.nombre)}</td><td class="num">${fechaCorta.format(dia(f.fecha))}</td><td class="num">${euros.format(f.antes)}</td><td class="num">${euros.format(f.ahora)}</td><td class="num">${cambio(f.antes, f.ahora)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="vacio">Todavía no ha cambiado ningún precio desde que empezó el historial.</p>';
}

function pintarProductos(productos) {
  if (!productos.length) { $('productos').innerHTML = '<p class="vacio">Ningún producto coincide con el filtro.</p>'; return; }
  const grupos = new Map();
  productos.forEach((p) => {
    const categoria = p.categoria || 'Sin categoría';
    if (!grupos.has(categoria)) grupos.set(categoria, []);
    grupos.get(categoria).push(p);
  });
  const cuerpo = [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([categoria, lista]) =>
    `<tr class="grupo"><td colspan="5">${esc(categoria)}</td></tr>` + lista.map((p) => {
      const ahora = p.precios.at(-1)[1];
      return `<tr class="fila" data-id="${esc(p.id)}"><td>${esc(p.nombre)}</td><td>${esc(p.tienda)}</td><td class="num">${euros.format(ahora)}/${esc(p.unidad || 'ud')}</td><td class="num">${cambio(p.precios[0][1], ahora)}</td><td>${chispa(p)}</td></tr>`;
    }).join('')).join('');
  $('productos').innerHTML = `<table><thead><tr><th>Producto</th><th>Tienda</th><th class="num">Precio</th><th class="num">Desde el inicio</th><th>Historial</th></tr></thead><tbody>${cuerpo}</tbody></table>`;
}

function abrirDetalle(id) {
  const p = datos.productos[id];
  if (!p) return;
  $('detalle-nombre').textContent = p.nombre;
  $('detalle-sub').textContent = `${p.tienda} · ${p.categoria || 'Sin categoría'} · precio por ${p.unidad === 'kg' ? 'kilo' : 'unidad'}`;
  $('detalle-tabla').innerHTML = `<table><thead><tr><th>Desde</th><th class="num">Precio</th><th class="num">Cambio</th></tr></thead><tbody>${p.precios.map(([f, precio], i) => `<tr><td>${fechaLarga.format(dia(f))}</td><td class="num">${euros.format(precio)}</td><td class="num">${i ? cambio(p.precios[i - 1][1], precio) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
  $('detalle').showModal();
  const serie = p.precios.map(([fecha, valor]) => ({ fecha, valor }));
  if (datos.actualizado && datos.actualizado > serie.at(-1).fecha) serie.push({ fecha: datos.actualizado, valor: serie.at(-1).valor });
  pintarGrafica($('detalle-grafica'), serie, { titulo: `Precio de ${p.nombre}`, alto: 200 });
}

function pintar() {
  const productos = visibles();
  const serie = serieCesta(productos);
  pintarCifras(productos, serie);
  pintarGrafica($('cesta'), serie, { titulo: 'Coste de la cesta' });
  pintarCambios(productos);
  pintarProductos(productos);
}

async function iniciar() {
  try {
    const respuesta = await fetch('precios.json', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(respuesta.status);
    datos = await respuesta.json();
  } catch (error) {
    $('productos').innerHTML = '<p class="vacio">No se han podido cargar los precios.</p>';
    return;
  }
  if (datos.actualizado) $('actualizado').textContent = `Actualizado el ${fechaLarga.format(dia(datos.actualizado))}`;
  const tiendas = [...new Set(Object.values(datos.productos).map((p) => p.tienda).filter(Boolean))].sort();
  $('tienda').insertAdjacentHTML('beforeend', tiendas.map((t) => `<option>${esc(t)}</option>`).join(''));
  $('tienda').addEventListener('change', pintar);
  $('buscar').addEventListener('input', pintar);
  $('cerrar').addEventListener('click', () => $('detalle').close());
  document.addEventListener('click', (evento) => {
    const fila = evento.target.closest('tr.fila');
    if (fila) abrirDetalle(fila.dataset.id);
  });
  let espera;
  window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(pintar, 150); });
  pintar();
}

iniciar();
