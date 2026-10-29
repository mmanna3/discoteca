# Personalización por usuario

Idea para más adelante: que cada uno pueda ajustar su discoteca. Todavía no está hecho.

## Dónde se guardaría

Cada usuario ya tiene un perfil en `perfiles/{uid}` (`handle`, `nombre`, `creadoAt`). Los ajustes irían ahí mismo, en un campo `ajustes`:

```ts
interface Ajustes {
  madera?: 'clara' | 'nogal' | 'negra' | 'blanca';
  tamanoDisco?: 'chico' | 'mediano' | 'grande';
  // …
}
```

- **Lectura pública**, como los discos. Hace falta para que quien entra a `#/mana` vea el mueble como lo armó mana.
- **Cada campo es opcional.** Si falta, se usa el valor de hoy, así que las discotecas que ya existen no cambian.
- **Las reglas ya lo permiten a medias.** El dueño puede actualizar su perfil, pero no el `handle` ni `creadoAt`. Cuando agreguemos `ajustes`, hay que validar sus valores en `firestore.rules`.

Hay que separar dos cosas:

- **Ajustes del dueño:** cómo se ve su mueble para todos (color, tamaño). Van en `perfiles/{uid}.ajustes`.
- **Preferencias de quien mira:** cómo prefiero ver yo cualquier discoteca (el orden elegido, los filtros de "Toca toca"). Hoy viven en el `localStorage` del navegador y está bien que sigan ahí.

## Preguntas para elegir las primeras personalizaciones

Contestá abajo de cada una, como te salga.

### Sobre el mueble

1. **Color del mueble:** ¿lo pensás como "tipos de madera" (pino, nogal, roble, wengué), como colores libres con un selector, o como unos pocos estilos armados (madera de los 90, laqueado negro, melamina blanca de IKEA)?
   >

2. **El fondo:** ¿también se tendría que poder cambiar la pared de atrás del mueble, o solo el mueble?
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
