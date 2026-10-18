/**
 * Iconos de la propuesta: un único sprite de símbolos y un <use> por icono,
 * como en el prototipo. El trazo (grosor, color) lo pone landing.css a todo
 * `svg` dentro de `.landing-cesar`, así que aquí solo van los caminos.
 */

export type NombreDeIcono =
  | 'chat'
  | 'file'
  | 'check'
  | 'search'
  | 'arrow'
  | 'play'
  | 'book'
  | 'people'
  | 'clock'
  | 'whatsapp';

export function Icono({ nombre }: { nombre: NombreDeIcono }) {
  return (
    <svg aria-hidden="true">
      <use href={`#i-${nombre}`} />
    </svg>
  );
}

export function SpriteDeIconos() {
  return (
    <svg className="svg-defs" aria-hidden="true">
      <defs>
        <symbol id="i-chat" viewBox="0 0 24 24">
          <path d="M21 11a8 8 0 0 1-8 8H5l-4 3 2-6a8 8 0 1 1 18-5Z" />
          <path d="M7 10h10M7 14h6" />
        </symbol>
        <symbol id="i-file" viewBox="0 0 24 24">
          <path d="M14 2H5v20h14V7Z M14 2v5h5M8 12h8M8 16h6" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="m7 12 3 3 7-7" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="10" cy="10" r="7" />
          <path d="m15 15 6 6" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path d="M4 12h16m-6-6 6 6-6 6" />
        </symbol>
        <symbol id="i-play" viewBox="0 0 24 24">
          <path d="m9 5 11 7-11 7Z" />
        </symbol>
        <symbol id="i-book" viewBox="0 0 24 24">
          <path d="M12 5c-3-3-8-2-10-1v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v15" />
        </symbol>
        <symbol id="i-people" viewBox="0 0 24 24">
          <circle cx="9" cy="7" r="3" />
          <path d="M2 21v-4a7 7 0 0 1 14 0v4M17 3a3 3 0 0 1 0 6m2 4c2 1 3 3 3 6" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </symbol>
        <symbol id="i-whatsapp" viewBox="0 0 24 24">
          <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z" />
          <path d="M8 7.7c-.7.4-.9 1.3-.5 2.4 1 2.8 3.3 5 6.2 5.8 1.1.3 2.1-.1 2.4-.9l.3-.8-2.7-1.4-.9 1c-1.6-.6-2.9-1.8-3.5-3.4l.9-.9-1.3-2.5Z" />
        </symbol>
      </defs>
    </svg>
  );
}
