<div align="center">

# 📊 Dashboards

**Dashboards de datos de casa, servidos con GitHub Pages**

[![Ver los dashboards](https://img.shields.io/badge/Ver%20los%20dashboards-moilolon.github.io%2Fdashboard-1F6FEB?style=for-the-badge&logo=githubpages&logoColor=white)](https://moilolon.github.io/dashboard/)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-rama%20main-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)
[![Sin compilación](https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JS-sin%20compilaci%C3%B3n-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#-cómo-está-hecho)
[![n8n](https://img.shields.io/badge/Datos-n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io/)
[![Home Assistant](https://img.shields.io/badge/Origen-Home%20Assistant-41BDF5?style=for-the-badge&logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)

[Dashboards](#-dashboards-1) ·
[Arquitectura](#-arquitectura) ·
[Estructura](#-estructura) ·
[Cómo está hecho](#-cómo-está-hecho) ·
[Los datos](#-los-datos) ·
[Qué es público](#-qué-es-público)

</div>

---

## ✨ Qué es esto

Un sitio estático con **dashboards que pintan datos de casa**. No hay servidor ni
compilación: lo que hay en la rama `main` es el sitio.

Los datos no se editan aquí a mano. Los escribe n8n desde el NAS de casa, y cada
dashboard los lee al cargar.

---

## 📊 Dashboards

| | Dashboard | Qué enseña | Dirección |
|---|---|---|---|
| 🏠 | **Resumen** | Una tarjeta por dashboard con sus cifras, y los avisos de lo que ha cambiado | [`/`](https://moilolon.github.io/dashboard/) |
| 🛒 | **Supermercado** | Cómo cambian los precios de los productos del catálogo en Mercadona y Alcampo | [`/supermercado/`](https://moilolon.github.io/dashboard/supermercado/) |

---

## 🧭 Arquitectura

```mermaid
flowchart LR
    HA["🏠 Home Assistant<br/>lista de la compra"]
    N8N["🔁 n8n<br/>en el NAS"]
    TIENDAS["🏪 Mercadona · Alcampo"]

    subgraph PRIV["🔒 asustor-flashstor-6 · privado"]
        CAT["rama datos/lista-compra<br/>catalogue.json"]
    end

    subgraph PUB["🌍 dashboard · público"]
        JSON["supermercado/precios.json"]
        WEB["📊 GitHub Pages"]
    end

    HA -- "altas y cambios" --> N8N
    TIENDAS -- "precios, una vez por semana" --> N8N
    N8N -- "catálogo completo" --> CAT
    CAT -- "solo nombre, tienda,<br/>unidad, categoría y precio" --> N8N
    N8N -- "un punto por cambio de precio" --> JSON
    JSON --> WEB
```

> [!NOTE]
> El catálogo de verdad vive en el repo privado. Aquí solo llega el historial de
> precios, que es lo que pinta el dashboard.

---

## 📁 Estructura

```text
dashboard/
├── 🏠 index.html          Resumen: una tarjeta por dashboard y los avisos
├── 🎨 estilos.css         Estilos comunes: temas frío y cálido, claro y oscuro
├── 🧩 comun.js            Menú, ajustes, formatos y gráficas que comparten todos
├── 🛒 supermercado/       Dashboard de precios de la compra
│   ├── index.html
│   ├── panel.js           Lee precios.json y pinta
│   └── precios.json       Los datos: los escribe n8n
├── 🤖 robots.txt          Pide a los buscadores que no indexen el sitio
└── 📄 .nojekyll           Hace que GitHub sirva los ficheros tal cual
```

| Si quieres… | Ve a |
|---|---|
| Ver los dashboards | [moilolon.github.io/dashboard](https://moilolon.github.io/dashboard/) |
| Cambiar los colores o el aspecto de todo | [`estilos.css`](estilos.css) |
| Cambiar el menú o los ajustes | [`comun.js`](comun.js) |
| Cambiar el dashboard del supermercado | [`supermercado/panel.js`](supermercado/panel.js) |
| Añadir un dashboard | [Cómo está hecho](#-cómo-está-hecho) |

---

## 🚀 Cómo está hecho

<details>
<summary><b>1 · Publicación</b></summary>

GitHub Pages sirve la raíz de la rama `main` (*Settings → Pages → Deploy from a
branch*). Cada commit se publica solo en alrededor de un minuto; GitHub lo enseña en
*Actions* como «pages build and deployment». No hay workflows propios.

</details>

<details>
<summary><b>2 · Un dashboard por carpeta</b></summary>

Cada dashboard es una carpeta con su `index.html`, su JavaScript y su fichero de datos.
La página carga `../estilos.css` y `../comun.js`, pide su JSON al cargar y pinta en el
navegador. Las gráficas son SVG hecho a mano: no hay bibliotecas ni dependencias que
actualizar.

</details>

<details>
<summary><b>3 · Menú y ajustes</b></summary>

`comun.js` pinta el menú en todas las páginas a partir de una lista, y el panel de
**Ajustes**: tema frío o cálido, modo automático, claro u oscuro, menú lateral o
arriba, y ancho completo o estrecho. Los ajustes se guardan en el navegador de cada
uno, no en el repo.

</details>

<details>
<summary><b>4 · Añadir un dashboard</b></summary>

1. Crear una carpeta con su `index.html`, cargando `../estilos.css` y `../comun.js`.
2. Dejar sus datos en un JSON dentro de la carpeta.
3. Añadir su entrada a la lista `MENU` de `comun.js`.
4. Añadir su tarjeta al resumen, en `index.html`, y su fila a la tabla de
   [Dashboards](#-dashboards-1).

</details>

<details>
<summary><b>5 · Probarlo en local</b></summary>

Hace falta un servidor, porque el navegador no deja leer el JSON abriendo el fichero
directamente:

```bash
python -m http.server 8765
```

Y abrir `http://localhost:8765/`.

</details>

---

## 🗂️ Los datos

Los escribe n8n con la GitHub App `moilolon-datos`, al terminar cada lectura de precios
en la tienda: Mercadona los lunes y Alcampo los martes. Sus commits se llaman
`Precios: N cambios`.

`supermercado/precios.json` guarda **un punto por producto solo cuando su precio
cambia**:

```json
{ "actualizado": "2026-11-12",
  "productos": { "mercadona:4706": {
    "nombre": "Aceite de oliva", "tienda": "Mercadona", "unidad": "ud",
    "categoria": "Aceite, especias y salsas", "activo": true,
    "precios": [["2026-11-12", 5.25]] } } }
```

| Campo | Qué es |
|---|---|
| Clave | La tienda y el código del producto en ella. Un cambio de nombre no parte el historial |
| `unidad` | `ud` o `kg`: el precio es por unidad o por kilo |
| `activo` | `false` cuando el producto sale del catálogo; deja de pintarse y conserva su historial |
| `precios` | Pares de fecha y precio. Un precio vale hasta el punto siguiente |

---

## 🔓 Qué es público

Este repo y su sitio son **públicos**. Por eso aquí solo llegan el nombre, la tienda,
el código en la tienda, la unidad, la categoría y los precios. Las cantidades, las
sugerencias y el resto del catálogo se quedan en el repo privado.

> [!IMPORTANT]
> Lo que se publica aquí queda en el historial aunque luego se borre. Antes de añadir
> un dato nuevo a un dashboard, hay que decidir si puede ser público.

---

<div align="center">
<sub>Las páginas piden a los buscadores que no las indexen, pero cualquiera con la dirección puede verlas.</sub>
</div>
