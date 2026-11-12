// Dashboard «Supermercado»: cómo cambian los precios de los productos del catálogo.
// Lee precios.json, que guarda un punto por producto cada vez que su precio cambia.
// Los formatos, el menú y las gráficas vienen de ../comun.js.
//
// precios.json:
//   { "actualizado": "2026-11-12",
//     "productos": { "mercadona:4706": {
//        "nombre": "Aceite de oliva", "tienda": "Mercadona", "unidad": "ud",
//        "categoria": "Aceite, especias y salsas", "activo": true,
//        "precios": [["2026-11-12", 5.25], ...] } } }

const TIENDAS = [{ nombre: 'Mercadona', clase: 's1' }, { nombre: 'Alcampo', clase: 's2' }];
const estado = { dias: 90, tienda: '', categoria: '', texto: '' };
let datos = { actualizado: '', productos: {}, lista: [] };

const hoy = () => datos.actualizado;

// El periodo empieza en la fecha elegida o, si el historial es más corto, donde empieza.
function inicioPeriodo() {
  const primera = datos.lista.reduce((min, p) => (p.precios[0][0] < min ? p.precios[0][0] : min), hoy());
  if (!estado.dias) return primera;
  const desde = restarDias(hoy(), estado.dias);
  return desde > primera ? desde : primera;
}

function visibles() {
  const texto = estado.texto.trim().toLowerCase();
  return datos.lista
    .filter((p) => !estado.tienda || p.tienda === estado.tienda)
    .filter((p) => !estado.categoria || (p.categoria || 'Sin categoría') === estado.categoria)
    .filter((p) => !texto || p.nombre.toLowerCase().includes(texto));
}

const precioInicial = (p, desde) => precioEn(p, desde) ?? p.precios[0][1];
const precioActual = (p) => p.precios.at(-1)[1];

function reparto(productos, cuenta) {
  return `<div class="reparto">${TIENDAS.map((t) => `<span><span class="punto ${t.clase}"></span>${t.nombre} ${cuenta(productos.filter((p) => p.tienda === t.nombre))}</span>`).join('')}</div>`;
}

function pintarCifras(productos, desde) {
  const suma = (lista, precio) => lista.reduce((s, p) => s + precio(p), 0);
  const ahora = suma(productos, precioActual);
  const antes = suma(productos, (p) => precioInicial(p, desde));
  const suben = (lista) => lista.filter((p) => precioActual(p) > precioInicial(p, desde));
  const bajan = (lista) => lista.filter((p) => precioActual(p) < precioInicial(p, desde));
  const igual = (lista) => lista.filter((p) => precioActual(p) === precioInicial(p, desde));
  const desdeTexto = `desde el ${fechaCorta.format(dia(desde))}`;
  const cifras = [
    ['Coste de la cesta', euros.format(ahora), 'una unidad o un kilo de cada producto', (l) => euros.format(suma(l, precioActual))],
    ['Variación de la cesta', ahora === antes ? 'Sin cambios' : (ahora > antes ? '▲ ' : '▼ ') + euros.format(Math.abs(ahora - antes)), `${ahora === antes || !antes ? '' : porcentaje.format((ahora - antes) / antes) + ' '}${desdeTexto}`, (l) => euros.format(suma(l, precioActual) - suma(l, (p) => precioInicial(p, desde)))],
    ['Suben', `▲ ${suben(productos).length}`, desdeTexto, (l) => suben(l).length],
    ['Bajan', `▼ ${bajan(productos).length}`, desdeTexto, (l) => bajan(l).length],
    ['Sin cambios', String(igual(productos).length), desdeTexto, (l) => igual(l).length],
    ['Productos', String(productos.length), 'con precio en el catálogo', (l) => l.length],
  ];
  $('cifras').innerHTML = cifras.map(([rotulo, valor, detalle, cuenta]) => `<div class="tarjeta cifra"><div class="rotulo">${rotulo}</div><div class="valor">${valor}</div><div class="detalle">${detalle}</div>${reparto(productos, cuenta)}</div>`).join('');
}

function pintarCesta(productos, desde) {
  const serie = serieCesta(productos, desde, hoy());
  const tienda = TIENDAS.find((t) => t.nombre === estado.tienda);
  $('cesta-leyenda').innerHTML = tienda
    ? `<span><span class="punto ${tienda.clase}"></span>${tienda.nombre}</span>`
    : '<span><span class="raya"></span>Todas las tiendas</span>';
  graficaLinea($('cesta'), serie, { titulo: 'Coste de la cesta', clase: tienda ? tienda.clase : '' });
  $('cesta-tabla').innerHTML = `<table><thead><tr><th>Desde</th><th class="num">Cesta</th><th class="num">Cambio</th></tr></thead><tbody>${serie.map((s, i) => `<tr><td>${fechaLarga.format(dia(s.fecha))}</td><td class="num">${euros.format(s.valor)}</td><td class="num">${i ? cambio(serie[i - 1].valor, s.valor) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
}

// El lunes de la semana de una fecha.
function lunes(fecha) {
  const d = dia(fecha);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function pintarSemanas(productos, desde) {
  const semanas = new Map();
  for (let s = lunes(desde); s <= hoy(); s = restarDias(s, -7)) semanas.set(s, { etiqueta: fechaSinAno.format(dia(s)), valores: {} });
  productos.forEach((p) => p.precios.forEach(([f], i) => {
    if (!i || f <= desde) return;
    const grupo = semanas.get(lunes(f));
    if (grupo) grupo.valores[p.tienda] = (grupo.valores[p.tienda] || 0) + 1;
  }));
  const grupos = [...semanas.values()];
  graficaBarras($('semanas'), grupos, TIENDAS, { titulo: 'Cambios de precio por semana', vacio: 'Ningún precio ha cambiado en este periodo.' });
  $('semanas-tabla').innerHTML = `<table><thead><tr><th>Semana del</th>${TIENDAS.map((t) => `<th class="num">${t.nombre}</th>`).join('')}</tr></thead><tbody>${grupos.map((g) => `<tr><td>${g.etiqueta}</td>${TIENDAS.map((t) => `<td class="num">${g.valores[t.nombre] || 0}</td>`).join('')}</tr>`).reverse().join('')}</tbody></table>`;
}

function pintarProductos(productos, desde) {
  if (!productos.length) { $('productos').innerHTML = '<p class="vacio">Ningún producto coincide con los filtros.</p>'; return; }
  const filas = productos
    .map((p) => {
      const antes = precioInicial(p, desde), ahora = precioActual(p);
      return { p, antes, ahora, relativo: antes ? Math.abs(ahora - antes) / antes : 0 };
    })
    .sort((a, b) => b.relativo - a.relativo || a.p.nombre.localeCompare(b.p.nombre, 'es'));
  $('productos').innerHTML = `<table><thead><tr><th>#</th><th>Producto</th><th>Tienda</th><th>Último cambio</th><th>Tendencia</th><th class="num">Variación</th><th class="num">Precio</th></tr></thead><tbody>${filas.map((f, i) => {
    const ultimo = f.p.precios.length > 1 ? fechaCorta.format(dia(f.p.precios.at(-1)[0])) : '—';
    return `<tr class="fila" data-id="${esc(f.p.id)}">
      <td class="orden">${i + 1}</td>
      <td><div class="nombre">${esc(f.p.nombre)}</div><div class="menor">${esc(f.p.categoria || 'Sin categoría')}</div></td>
      <td><span class="etiqueta"><span class="punto ${CLASE_TIENDA[f.p.tienda] || ''}"></span>${esc(f.p.tienda)}</span></td>
      <td>${ultimo}</td>
      <td>${chispa(f.p, desde, hoy())}</td>
      <td class="num">${cambio(f.antes, f.ahora) || '<span class="menor">—</span>'}</td>
      <td class="num">${euros.format(f.ahora)}<span class="menor">/${esc(f.p.unidad || 'ud')}</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function abrirDetalle(id) {
  const p = datos.productos[id];
  if (!p || !p.precios.length) return;
  $('detalle-nombre').textContent = p.nombre;
  $('detalle-sub').textContent = `${p.tienda} · ${p.categoria || 'Sin categoría'} · precio por ${p.unidad === 'kg' ? 'kilo' : 'unidad'}`;
  $('detalle-tabla').innerHTML = `<table><thead><tr><th>Desde</th><th class="num">Precio</th><th class="num">Cambio</th></tr></thead><tbody>${p.precios.map(([f, precio], i) => `<tr><td>${fechaLarga.format(dia(f))}</td><td class="num">${euros.format(precio)}</td><td class="num">${i ? cambio(p.precios[i - 1][1], precio) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
  $('detalle').showModal();
  const serie = p.precios.map(([fecha, valor]) => ({ fecha, valor }));
  if (hoy() > serie.at(-1).fecha) serie.push({ fecha: hoy(), valor: serie.at(-1).valor });
  graficaLinea($('detalle-grafica'), serie, { titulo: `Precio de ${p.nombre}`, alto: 190, clase: CLASE_TIENDA[p.tienda] || '' });
}

function pintar() {
  const productos = visibles();
  const desde = inicioPeriodo();
  pintarCifras(productos, desde);
  pintarCesta(productos, desde);
  pintarSemanas(productos, desde);
  pintarProductos(productos, desde);
}

function grupoDeBotones(id, clave, atributo, convertir = (v) => v) {
  $(id).addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    estado[clave] = convertir(boton.dataset[atributo]);
    $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('actual', b === boton));
    pintar();
  });
}

async function iniciar() {
  try {
    datos = await cargarPrecios('../');
  } catch (error) {
    $('productos').innerHTML = '<p class="vacio">No se han podido cargar los precios.</p>';
    return;
  }
  $('actualizado').textContent = `Actualizado ${hace(hoy())}, el ${fechaLarga.format(dia(hoy()))}`;
  const categorias = [...new Set(datos.lista.map((p) => p.categoria || 'Sin categoría'))].sort((a, b) => a.localeCompare(b, 'es'));
  $('categoria').insertAdjacentHTML('beforeend', categorias.map((c) => `<option>${esc(c)}</option>`).join(''));

  grupoDeBotones('periodo', 'dias', 'dias', Number);
  grupoDeBotones('tienda', 'tienda', 'tienda');
  $('categoria').addEventListener('change', () => { estado.categoria = $('categoria').value; pintar(); });
  $('buscar').addEventListener('input', () => { estado.texto = $('buscar').value; pintar(); });
  $('cerrar').addEventListener('click', () => $('detalle').close());
  document.addEventListener('click', (evento) => {
    const fila = evento.target.closest('tr.fila');
    if (fila) abrirDetalle(fila.dataset.id);
    const enlace = evento.target.closest('button[data-tabla]');
    if (enlace) {
      const tabla = $(enlace.dataset.tabla);
      tabla.hidden = !tabla.hidden;
      enlace.textContent = tabla.hidden ? 'Ver tabla' : 'Ocultar tabla';
    }
  });
  let espera;
  window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(pintar, 150); });
  pintar();

  // El resumen enlaza a un producto con ?p=<clave>.
  const pedido = new URLSearchParams(location.search).get('p');
  if (pedido) abrirDetalle(pedido);
}

iniciar();
