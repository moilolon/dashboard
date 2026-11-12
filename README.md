# Paneles

Paneles estáticos servidos con GitHub Pages desde la rama `main`, sin compilación:
lo que hay en el repo es el sitio.

| Carpeta | Panel | Datos |
|---|---|---|
| [`lista-compra/`](lista-compra/) | Precios de la compra: cómo cambian en Mercadona y Alcampo | `lista-compra/precios.json` |

## Cómo está hecho

- `index.html` es la portada, con una tarjeta por panel.
- `estilos.css` es común a todos los paneles: colores por papel, en claro y en oscuro.
- Cada panel es una carpeta con su `index.html`, su JavaScript y su fichero de datos.
  La página pide el JSON al cargar y pinta en el navegador, sin bibliotecas.
- `.nojekyll` hace que GitHub sirva los ficheros tal cual.

## Añadir un panel

1. Crear una carpeta con su `index.html` y enlazar `../estilos.css`.
2. Dejar sus datos en un JSON dentro de la carpeta.
3. Añadir su tarjeta a la portada y su fila a la tabla de arriba.

## Los datos

Los escribe n8n con la GitHub App `moilolon-datos`, después de cada lectura de precios
en la tienda. `lista-compra/precios.json` guarda un punto por producto solo cuando su
precio cambia:

```json
{ "actualizado": "2026-11-12",
  "productos": { "mercadona:4706": {
    "nombre": "Aceite de oliva", "tienda": "Mercadona", "unidad": "ud",
    "categoria": "Aceite, especias y salsas", "activo": true,
    "precios": [["2026-11-12", 5.25]] } } }
```

La clave de cada producto es su tienda y su código en ella, así que un cambio de
nombre no parte el historial. Un producto que sale del catálogo queda con
`activo: false` y deja de pintarse.

El repo es público: aquí solo llegan el nombre, la tienda, la unidad, la categoría y
los precios. Las páginas piden a los buscadores que no las indexen.
