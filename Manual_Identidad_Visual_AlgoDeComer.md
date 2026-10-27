# Manual de identidad visual — algodecomer.com

**Versión:** 1.0 · **Fecha:** 27 de octubre de 2026  
**Estado:** Identidad cromática y proporción confirmadas por el propietario; reglas de aplicación propuestas para validación.  
**Marca:** algodecomer.com  
**Concepto:** *El antojo* · Cálida y Amigable

> **Fuente de verdad:** el logotipo maestro ajustado en CorelDRAW. Este manual documenta los colores y la proporción informados; no sustituye el archivo vectorial final ni presume conocer las dimensiones exactas de sus trazados.

## 1. Esencia y posicionamiento

**Qué es:** una plataforma de descubrimiento gastronómico local que conecta comensales con restaurantes y pequeños comercios de comida, inicialmente en Ciudad de México. Permite explorar platillos y menús, filtrar por cercanía y servicios, seleccionar productos y conversar con cada restaurante para gestionar el pedido. El pago se acuerda directamente con el negocio.

**Promesa de marca:** encontrar algo que se antoje cerca de ti, con opciones locales variadas y acceso sencillo a los negocios que lo preparan.

**Propuesta de eslogan:** «Todo lo que se te antoja, cerca de ti». Es una propuesta editorial; no debe incorporarse obligatoriamente al logotipo.

**Personalidad:** cercana, accesible, humana, confiable y divertida. La comida y los negocios reales son protagonistas; la interfaz facilita el descubrimiento sin competir visualmente con las fotografías.

**Tono de voz:** directo, natural, cálido y mexicano sin exagerar coloquialismos. Ejemplos: «¿Qué se te antoja hoy?», «Descubre algo rico cerca de ti», «Habla con el restaurante».

## 2. Sistema de logotipo

### 2.1 Concepto aprobado

El logotipo conserva el rostro sonriente con lengua y tenedor, integrado visualmente con el nombre completo **algodecomer.com**. El concepto representa apetito, simpatía y descubrimiento gastronómico.

### 2.2 Proporción oficial

La **relación de aspecto del logotipo principal es 2:1 (ancho:alto)**. Por cada dos unidades de ancho, corresponde una de alto.

| Ancho de visualización | Alto correspondiente |
|---:|---:|
| 120 px | 60 px |
| 160 px | 80 px |
| 200 px | 100 px |
| 240 px | 120 px |
| 320 px | 160 px |

La proporción se aplica al **área exportada del SVG**, no necesariamente al contorno visible de la marca. Al exportar, verificar que el `viewBox` no incluya márgenes accidentales.

### 2.3 Variantes de marca

1. **Principal a color:** rostro + `algodecomer.com`, respetando la composición maestra y los cinco colores oficiales.
2. **Monocromática oscura:** todos los elementos en Café oscuro `#310A01`, cuando la reproducción a color no sea viable.
3. **Monocromática clara:** todos los elementos en blanco `#FFFFFF` sobre un fondo oscuro suficientemente contrastante.
4. **Isotipo:** solo el rostro y sus elementos característicos, adaptado y simplificado para favicon y avatar; no reducir mecánicamente el logotipo completo.

Las variantes 2–4 requieren revisión visual y exportación específica; no deben obtenerse aplicando filtros CSS indiscriminados a la versión a color.

### 2.4 Área de protección

**Regla provisional:** reservar alrededor del logotipo un espacio libre equivalente, como mínimo, al **10 % de su altura total exportada**. Esta regla deberá verificarse con el SVG maestro para evitar que elementos externos se acerquen demasiado al rostro o al nombre.

### 2.5 Tamaños mínimos

No se establece un mínimo universal sin pruebas sobre el vector definitivo. Como punto de partida:

- **Logotipo completo:** probar desde 160 × 80 px en pantalla; usar mayor tamaño si el dominio `.com` pierde legibilidad.
- **Isotipo:** validar versiones específicas a 16, 32, 48 y 192 px.
- **Impresión:** verificar con prueba física, especialmente en aplicaciones pequeñas.

La prioridad es la lectura clara de `algodecomer.com`, no cumplir un número arbitrario.

### 2.6 Usos incorrectos

- No estirar, comprimir ni cambiar la proporción 2:1 del logotipo principal.
- No sustituir arbitrariamente los colores oficiales.
- No cambiar la fuente del nombre dentro de una composición ya aprobada.
- No aplicar sombras, contornos, biseles ni degradados adicionales sin una variante aprobada.
- No colocar la marca sobre fotografías que dificulten la lectura.
- No rotar ni separar elementos de la composición principal sin crear una variante formal.

## 3. Paleta cromática oficial del logotipo

Los siguientes códigos **HEX son exactos y han sido proporcionados por el propietario**. Los valores RGB se derivan directamente de esos códigos.

| Color | HEX | RGB | Uso orientativo |
|---|---|---|---|
| Café oscuro | `#310A01` | `49, 10, 1` | Nombre, trazos oscuros, títulos |
| Naranja | `#FC5402` | `252, 84, 2` | Identidad principal y acentos |
| Rojo | `#E6050D` | `230, 5, 13` | Lengua, detalles expresivos, énfasis |
| Amarillo | `#FC8506` | `252, 133, 6` | Detalles cálidos y transiciones |
| Amarillo 2 | `#FDB20C` | `253, 178, 12` | Brillos y detalles de apoyo |

**Importante:** el orden y la aplicación exacta de cada color dentro del logotipo deben seguir el vector maestro de CorelDRAW. Los usos indicados aquí son orientativos, no una redefinición de la composición aprobada.

### 3.1 Colores auxiliares de interfaz (propuestos, no parte del logotipo)

| Token | HEX | Uso |
|---|---|---|
| Fondo cálido | `#FFF8F1` | Fondo suave de páginas o secciones |
| Superficie | `#FFFFFF` | Tarjetas, formularios y diálogos |
| Texto principal | `#310A01` | Títulos y texto sobre fondos claros |
| Borde neutro | `#E9DED6` | Separadores y bordes suaves |
| Fondo de marca oscuro | `#310A01` | Pie de página o superficies destacadas |

Estos colores auxiliares son **recomendaciones de sistema UI** y pueden ajustarse en la fase UX/UI sin modificar los cinco colores oficiales del logotipo.

### 3.2 Contraste y accesibilidad

No asumir que todos los colores del logotipo sirven para texto. Como criterio de diseño, verificar **WCAG 2.2 AA**: contraste de al menos **4.5:1 para texto normal**, **3:1 para texto grande** y, cuando corresponda, **3:1 para elementos visuales de interfaz**. Los colores naranja y amarillo pueden requerir texto oscuro o una variante más oscura para botones con texto blanco. Las combinaciones deben validarse en su contexto real.

## 4. Tipografía

### 4.1 Identidad del logotipo

La tipografía del nombre dentro del logotipo **es la que haya quedado convertida a curvas en el archivo maestro de CorelDRAW**. No se debe reemplazar por una fuente web aunque tenga apariencia similar.

### 4.2 Tipografía de producto (propuesta)

- **Fredoka:** títulos destacados, mensajes de marca y encabezados expresivos.
- **Nunito Sans:** navegación, textos, botones, formularios, precios y chat.
- **Alternativas:** `system-ui, sans-serif` cuando las fuentes web no estén disponibles.

Usar fuentes bajo sus licencias correspondientes; no distribuir archivos tipográficos sin revisar sus condiciones.

### 4.3 Escala sugerida

| Elemento | Escritorio | Móvil | Peso orientativo |
|---|---:|---:|---|
| H1 / mensaje principal | 48 px | 34 px | 700 |
| H2 / sección | 32 px | 26 px | 700 |
| H3 / subsección | 24 px | 21 px | 700 |
| Título de tarjeta | 18 px | 17 px | 700 |
| Texto normal | 16 px | 16 px | 400 |
| Texto secundario | 14 px | 14 px | 400–600 |
| Botón | 16 px | 16 px | 700 |

Mantener interlineados cómodos (aprox. 1.4–1.6 en párrafos) y evitar cuerpos demasiado pequeños en móvil.

## 5. Lenguaje visual

**Fotografía:** combinación de fotografías apetitosas y cuidadas con imágenes auténticas de comercios locales. Priorizar comida real, iluminación natural o comercial consistente, encuadres cercanos y colores fieles. Evitar imágenes engañosas que no correspondan al producto anunciado.

**Iconografía:** simple, redondeada y coherente en grosor; no utilizar iconos decorativos que compitan con el isotipo.

**Componentes:** superficies claras, tarjetas con esquinas suaves, filtros de lectura rápida y botones destacados. El color debe guiar acciones y no saturar la pantalla.

**Voz de interfaz:** «Ver menú», «Agregar producto», «Hablar con el restaurante», «Confirmar pedido», «Cerca de ti». Indicar claramente que el restaurante confirma disponibilidad, cobro y entrega.

## 6. Aplicaciones digitales

### 6.1 Archivos recomendados

```text
brand/
├── logo-principal.svg
├── logo-principal.png
├── logo-monocromo-oscuro.svg
├── logo-monocromo-claro.svg
├── isotipo.svg
├── favicon.ico
├── favicon-32x32.png
├── apple-touch-icon.png
└── brand-tokens.css
```

La lista describe los **entregables previstos**; este documento no implica que esos archivos ya se hayan exportado desde la versión modificada de CorelDRAW.

### 6.2 Exportación desde CorelDRAW

- Mantener un archivo `.cdr` editable como fuente maestra.
- Convertir el texto del logotipo a curvas en una copia destinada a exportación.
- Exportar SVG con trazados vectoriales, sin rasterizar la composición.
- Usar RGB/sRGB y conservar los códigos cromáticos oficiales.
- Mantener fondo transparente.
- Ajustar el `viewBox` a una proporción de **2:1** sin espacios sobrantes accidentales.
- Inspeccionar el SVG en varios navegadores y verificar que no dependa de fuentes locales.
- Optimizar una copia para web; conservar intacto el SVG maestro.

### 6.3 Reserva de espacio en el sitio web

```html
<a href="/" aria-label="Algo de Comer — Inicio">
  <img
    src="/assets/brand/logo-principal.svg"
    alt="Algo de Comer"
    width="200"
    height="100"
  />
</a>
```

```css
.brand-logo {
  display: block;
  width: min(200px, 100%);
  aspect-ratio: 2 / 1;
  height: auto;
  object-fit: contain;
}
```

Los atributos `width` y `height` reservan espacio antes de cargar el archivo; deben mantener la proporción 2:1. Para una cabecera más compacta, crear una **variante horizontal distinta** en lugar de distorsionar el logotipo principal.

### 6.4 Variables CSS

```css
:root {
  /* Identidad cromática oficial del logotipo */
  --brand-brown: #310A01;
  --brand-orange: #FC5402;
  --brand-red: #E6050D;
  --brand-yellow: #FC8506;
  --brand-yellow-2: #FDB20C;

  /* Tokens auxiliares de interfaz: propuestos */
  --ui-background: #FFF8F1;
  --ui-surface: #FFFFFF;
  --ui-text: #310A01;
  --ui-border: #E9DED6;

  /* Tipografía sugerida */
  --font-display: "Fredoka", system-ui, sans-serif;
  --font-body: "Nunito Sans", system-ui, sans-serif;

  /* Proporción confirmada del logotipo principal */
  --logo-aspect-ratio: 2 / 1;
}
```

**Nota:** estos tokens registran los colores, pero no asignan automáticamente un naranja a todos los botones. Los colores de interacción deben someterse a pruebas de contraste y usabilidad.

## 7. Reglas de consistencia y control de calidad

Antes de publicar una variante del logotipo:

- [ ] El nombre se lee exactamente **algodecomer.com**.
- [ ] Se conservan rostro sonriente, lengua y tenedor según el diseño aprobado.
- [ ] Los colores coinciden con los cinco HEX oficiales.
- [ ] La versión principal conserva relación **2:1**.
- [ ] El SVG se ve correctamente sobre fondo claro y fondo de prueba oscuro.
- [ ] No hay fuentes faltantes ni imágenes rasterizadas incrustadas innecesariamente.
- [ ] El logotipo es legible en el tamaño real donde se utilizará.
- [ ] El favicon se ha simplificado y probado por separado.
- [ ] Los textos y controles de la interfaz cumplen los criterios de contraste aplicables.

## 8. Pendientes para cerrar la versión definitiva

1. Recibir el **SVG o CDR final** con los cambios realizados en CorelDRAW.
2. Documentar las posiciones exactas de color, degradados (si los hay), proporciones internas y área de protección definitiva.
3. Comprobar tamaños mínimos y crear variantes reales para fondos claros y oscuros.
4. Validar la legibilidad del nombre en la cabecera móvil.
5. Aprobar el diseño del isotipo y favicon de forma independiente.
6. Realizar, cuando corresponda, revisión de disponibilidad y similitud marcaria ante el IMPI.

---

**Control de cambios — v1.0:** se incorporaron los cinco colores exactos (`#310A01`, `#FC5402`, `#E6050D`, `#FC8506`, `#FDB20C`) y la relación de aspecto oficial **2:1**. Las reglas restantes son especificaciones recomendadas y están sujetas a validación con el vector final.
