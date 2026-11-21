# Prompt — retrato del hero (fase 0)

**Foto base:** `fotos_portfolio/yo/WhatsApp Image 2026-11-21 at 17.42.50 (1).jpeg` (frontal, simétrica, a la altura de los ojos, expresión tranquila).
**Referencias de identidad opcionales:** `17.42.49.jpeg` y `17.42.50 (2).jpeg`.

Las fotos de esta carpeta vienen de WhatsApp a 1024×768. Si puedes, usa el original del móvil: con más resolución, la IA conserva mejor tu cara.

## Prompt (pegar tal cual en ChatGPT con la foto adjunta)

```
Edit this photo into a premium editorial portrait for the hero section of a creative developer's portfolio website, in the style of high-end athlete websites (think a Formula 1 driver's personal site): clean, cinematic, confident, minimal.

IDENTITY — most important: keep the person exactly as he is. Same face shape, eyes, eyebrows, nose, lips, beard shape and density, hairline, skin tone and natural skin texture (keep pores and small imperfections, no plastic smoothing, no beautification, no age change). He must be instantly recognizable as the same person.

FRAMING: perfectly frontal, camera at eye level, head and shoulders (from mid-chest up), subject centered and symmetrical, looking straight into the lens. Calm, confident expression with a very subtle closed-mouth smile. Landscape 16:9, with generous dark negative space on both sides. Leave some space above the hair bun.

HAIR: long dark hair pulled back into a man bun on top of the head; make the bun slightly fuller and more voluminous, neat but natural, with a few loose strands.

WARDROBE: plain black heavyweight crew-neck t-shirt, no logos, nice fabric texture, good fit on the shoulders. Keep his thin silver chain necklace.

CHAIR: replace the orange gaming chair with a sleek, minimal high-back ergonomic office chair in matte black, only partly visible behind the shoulders, out of focus.

BACKGROUND: dark, moody home-studio / developer setup, almost black (deep charcoal), heavily blurred with soft bokeh from a few distant LED strips. No recognizable objects, no text, no clutter.

LIGHTING: soft, flattering key light from the front, slightly above eye level, natural skin tones. Two subtle colored rim lights from behind on each side of the head and shoulders, like LED desk lighting: cool cyan/teal on the left side, violet/magenta on the right side. The colors should only kiss the edges of the hair, jawline, beard and shoulders, not tint the face. Subtle catchlights in the eyes. Gentle contrast, cinematic color grade, slight film grain.

STYLE: photorealistic, shot on a full-frame camera with an 85mm lens at f/2, sharp focus on the eyes, shallow depth of field. No text, no watermark, no extra accessories, no glasses, no headphones.
```

## Iteraciones útiles

- Si cambia demasiado la cara: *"The face changed too much. Keep his facial features exactly as in the original photo, only change lighting, clothes, chair and background."*
- Si los LED quedan exagerados: *"Make the colored rim lights 50% more subtle, keep the face in neutral natural light."*
- Versión más sobria: *"Same image but replace the colored rim lights with a single soft warm white rim light."*
- Versión móvil: *"Same portrait, same lighting, recomposed as a vertical 4:5 crop, head and shoulders centered."*

## Iteración 2: sin silla y otra paleta (pasar la versión mejorada con fondo)

```
Edit this portrait. Keep the person, his face, expression, hair bun, black t-shirt, silver chain, earrings, pose and framing exactly the same.

1. Remove the office chair completely. He is just a head-and-shoulders portrait against a plain, near-black charcoal background (#05060a), no furniture.
2. Change the two colored rim lights behind him: [LEFT COLOR] on the left side and [RIGHT COLOR] on the right side. Same intensity and placement as now: they only kiss the edges of the hair, ears, jawline and shoulders; the face stays in neutral, natural light.
3. Remove the blurred LED bars from the background; the background must be clean and dark so it can be cut out.

Photorealistic, same camera and lens look, same sharpness on the eyes. No text, no watermark.
```

Paletas propuestas para [LEFT COLOR] / [RIGHT COLOR]:
- **Cine (recomendada):** `cool ice-blue (#7fd4ff)` / `warm amber (#ffad4a)`.
- **Sobria:** `cold white` / `cold white`.
- **Gamer actual, más elegante:** `deep electric blue (#2f6bff)` / `violet (#8a4dff)`.

Después, pedir otra vez la versión sin fondo (PNG con transparencia) de esa misma imagen.

## Notas

- La versión Matrix **no hace falta pedírsela a la IA**: la genera el código a partir de esta misma foto (rejilla de glifos según la luz, como `AsciiPortrait` de portfolioR). Así coincide píxel a píxel con la foto y queda animada.
- El fondo oscuro hace que los glifos verdes destaquen al pasar el ratón.
