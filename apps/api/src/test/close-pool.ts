export function closePoolAfterTests(): void {
  // El script de pruebas usa --test-force-exit. Cerrar el pool al terminar
  // el primer archivo dejaría sin conexión al resto de la suite.
}
