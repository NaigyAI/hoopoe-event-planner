export function capitalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])[a-zà-ÿ]/g, (letter) => letter.toUpperCase())
}

export function capitalizeFirstName(name: string) {
  return capitalizeName(name).split(/\s+/)[0] ?? ""
}
