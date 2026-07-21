export function edadFrom(fechaNacimiento: Date, now: Date = new Date()): number {
  let edad = now.getFullYear() - fechaNacimiento.getFullYear();
  const m = now.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < fechaNacimiento.getDate())) edad--;
  return edad;
}
