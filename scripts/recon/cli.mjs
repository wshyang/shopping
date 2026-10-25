export function getArgument(name, argumentsList = process.argv.slice(2)) {
  const index = argumentsList.indexOf(`--${name}`);
  if (index < 0) return null;
  return argumentsList[index + 1] ?? null;
}

export function requireArgument(name) {
  const value = getArgument(name);
  if (!value) throw new Error(`Missing required --${name} argument`);
  return value;
}
