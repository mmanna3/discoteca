# Personalización por usuario

Que cada uno pueda ajustar su discoteca. Ya está hecho el **color** (clásica, rosa, azul, verde y amarillo): se elige al crear la discoteca y después en el menú ⋯ → Colores. Lo demás son ideas.

## Dónde se guarda

Cada usuario tiene un perfil en `perfiles/{uid}` (`handle`, `nombre`, `creadoAt`). Los ajustes van ahí mismo, en el campo `ajustes`:

```ts
interface Ajustes {
  tema?: 'clasica' | 'rosa' | 'azul' | 'verde' | 'amarillo'; // hecho
  tamanoDisco?: 'chico' | 'mediano' | 'grande'; // idea
  // …
}
```

- **Lectura pública**, como los discos. Hace falta para que quien entra a `#/mana` vea el mueble como lo armó mana.
- **Cada campo es opcional.** Si falta, se usa el valor de hoy, así que las discotecas que ya existen no cambian.
- **Cada ajuste nuevo se valida en `firestore.rules`** (`validAjustes`): hoy solo se acepta `tema`, con uno de los cinco valores. El dueño puede actualizar su perfil, pero no el `handle` ni `creadoAt`.
- **Un tema nuevo** se agrega en `src/lib/themes.ts`, en `:root[data-tema]` de `src/styles.css` y en `validAjustes`.

Hay que separar dos cosas:

- **Ajustes del dueño:** cómo se ve su mueble para todos (color, tamaño). Van en `perfiles/{uid}.ajustes`.
- **Preferencias de quien mira:** cómo prefiero ver yo cualquier discoteca (el orden elegido, los filtros de "Toca toca"). Hoy viven en el `localStorage` del navegador y está bien que sigan ahí.

## Preguntas para elegir las primeras personalizaciones

Contestá abajo de cada una, como te salga.

### Sobre el mueble

1. **Más colores:** ya hay cinco temas. ¿Sumarías "tipos de madera" (pino, nogal, roble, wengué), colores libres con un selector, u otros estilos armados (laqueado negro, melamina blanca de IKEA)?
   >

2. **El fondo:** hoy la pared va con el mueble. ¿Querrías elegirlos por separado?
   >

3. **La placa de bronce:** ¿alcanza con "Discoteca de Mana", o te gustaría poder escribir lo que quieras ("Los discos del Tano", "Bunker")?
   >

### Sobre los discos

4. **Tamaño:** cuando decís 3 tamaños, ¿pensás en el alto de los lomos en el estante (que entren más o menos discos por fila), en el tamaño de la caja cuando la abrís, o en las dos cosas?
   >

5. **Lomo por defecto:** hoy cada disco nuevo arranca con el lomo generado de la tapa. ¿Querrías elegir que arranquen siempre en "color" o, si existe, con el escaneo real?
   >

6. **Qué dice el lomo:** ¿te interesa elegir qué se ve en el lomo (artista + título, solo título, con o sin año)?
   >

### Sobre cómo se recorre

7. **Orden por defecto:** el orden (artista, año, género…) hoy lo recuerda cada navegador. Cuando un amigo entra a tu discoteca, ¿debería verla en el orden que elegiste vos, o en el último que usó él?
   >

8. **Separadores:** al ordenar por género o país aparecen separadores. ¿Te gustaría que el dueño pueda elegir si se ven o no, o armar sus propias secciones (por ejemplo, "Los que escucho los domingos")?
   >

### Sobre lo social

9. **Privacidad:** hoy todas las discotecas se pueden ver con el link. ¿Alguno querría que la suya sea privada, o visible solo para algunos?
   >

10. **Ver las de los demás:** ¿te gustaría una lista de las discotecas de tus amigos, o con pasarse el link alcanza?
   >

11. **De todo esto, ¿cuáles serían las 2 o 3 primeras que harías?**
   >
