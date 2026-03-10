import Link from 'next/link';

export default function MetodologiaPrediccionesPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/predicciones" className="text-sm text-blue-400/70 hover:text-blue-300">
          &larr; Volver a Predicciones
        </Link>
        <h1 className="text-3xl font-bold mt-2">Cómo se calculan las predicciones</h1>
        <p className="text-gray-400 mt-1">
          Modelo estadístico basado en 23 temporadas históricas de la Divisional A.
        </p>
      </div>

      {/* Resumen */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Resumen</h2>
        <p className="text-gray-300 leading-relaxed">
          El modelo estima la probabilidad de cada equipo de ser <strong>campeón</strong> (1°),
          quedar en el <strong>Top 4</strong>, o <strong>descender</strong> (últimos 4) en la
          próxima temporada de la Divisional A de Mayores Masculino. Usa datos de las temporadas
          2003 a 2025 y pondera con mayor fuerza las más recientes.
        </p>
      </section>

      {/* Paso 1 */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">1. Plantel de la Divisional A</h2>
        <p className="text-gray-300 leading-relaxed">
          Los 16 equipos de la próxima temporada se determinan así:
        </p>
        <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-1">
          <li><strong>Se mantienen:</strong> los equipos de Div A que no terminaron en los últimos 4 puestos (12 equipos).</li>
          <li><strong>Ascienden:</strong> los 4 primeros de Div B.</li>
        </ul>
      </section>

      {/* Paso 2 */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">2. Power Rating (calificación de fuerza)</h2>
        <p className="text-gray-300 leading-relaxed">
          Para cada equipo se calcula un rating compuesto basado en su historial. De cada temporada
          se extraen tres métricas:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-2 text-gray-400 font-medium">Métrica</th>
                <th className="text-left py-2 text-gray-400 font-medium">Fórmula</th>
                <th className="text-left py-2 text-gray-400 font-medium">Qué mide</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Puntos por partido</td>
                <td className="py-2 font-mono text-xs">puntos / PJ</td>
                <td className="py-2">Rendimiento general</td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Diferencia de gol / PJ</td>
                <td className="py-2 font-mono text-xs">(GF - GC) / PJ</td>
                <td className="py-2">Dominio sobre rivales</td>
              </tr>
              <tr>
                <td className="py-2">Tasa de victorias</td>
                <td className="py-2 font-mono text-xs">PG / PJ</td>
                <td className="py-2">Consistencia</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold text-gray-400 mt-4">Normalización (z-score)</h3>
        <p className="text-gray-300 leading-relaxed">
          Las métricas se normalizan <strong>dentro de cada temporada</strong> usando z-scores.
          Esto permite comparar rendimientos entre temporadas con distinta cantidad de equipos.
          Un z-score de +1.0 significa que el equipo estuvo una desviación estándar por encima del promedio.
        </p>

        <h3 className="text-sm font-semibold text-gray-400 mt-4">Ponderación exponencial</h3>
        <p className="text-gray-300 leading-relaxed">
          Las temporadas más recientes pesan más con un factor de decaimiento de <strong>0.7</strong> por temporada:
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-1.5 pr-6 text-gray-400 font-medium">Temporada</th>
                <th className="text-right py-1.5 text-gray-400 font-medium">Peso</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 font-mono text-xs">
              <tr><td className="py-1 pr-6">2025 (última)</td><td className="py-1 text-right">1.000</td></tr>
              <tr><td className="py-1 pr-6">2024</td><td className="py-1 text-right">0.700</td></tr>
              <tr><td className="py-1 pr-6">2023</td><td className="py-1 text-right">0.490</td></tr>
              <tr><td className="py-1 pr-6">2022</td><td className="py-1 text-right">0.343</td></tr>
              <tr><td className="py-1 pr-6">2018</td><td className="py-1 text-right">0.082</td></tr>
              <tr><td className="py-1 pr-6">2013</td><td className="py-1 text-right">0.014</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-400 text-sm">
          Las últimas 3 temporadas concentran ~75% del peso total.
        </p>

        <h3 className="text-sm font-semibold text-gray-400 mt-4">Equipos ascendidos</h3>
        <p className="text-gray-300 leading-relaxed">
          Para equipos que suben de Div B, se usa su historial en Div B pero con un <strong>descuento
          del 40%</strong>. Esto refleja que los recién ascendidos enfrentan rivales más fuertes y
          tienden a rendir por debajo de su nivel en la divisional anterior.
        </p>
      </section>

      {/* Paso 3 */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">3. Simulación Monte Carlo</h2>
        <p className="text-gray-300 leading-relaxed">
          Se ejecutan <strong>10,000 temporadas simuladas</strong>. En cada simulación:
        </p>
        <ol className="text-gray-300 leading-relaxed list-decimal list-inside space-y-2">
          <li>
            <strong>Muestreo:</strong> Para cada equipo se genera un rendimiento aleatorio
            basado en su rating y su variabilidad histórica (distribución normal).
          </li>
          <li>
            <strong>Ranking:</strong> Se ordenan los 16 equipos por rendimiento simulado.
          </li>
          <li>
            <strong>Registro:</strong> Se anota quién quedó 1° (campeón), en el Top 4, o en los
            últimos 4 (descenso).
          </li>
        </ol>
        <p className="text-gray-300 leading-relaxed">
          Se usa un generador de números aleatorios con <strong>semilla fija</strong>, por lo que
          los resultados son reproducibles entre distintas cargas de la página.
        </p>
      </section>

      {/* Paso 4 */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">4. Cálculo de probabilidades</h2>
        <p className="text-gray-300 leading-relaxed">
          Las probabilidades finales son los conteos divididos por el total de simulaciones:
        </p>
        <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-1">
          <li><strong>P(campeón)</strong> = veces que salió 1° / 10,000</li>
          <li><strong>P(Top 4)</strong> = veces en los primeros 4 / 10,000</li>
          <li><strong>P(descenso)</strong> = veces en los últimos 4 / 10,000</li>
          <li><strong>Pos. esperada</strong> = promedio de posiciones en las 10,000 simulaciones</li>
        </ul>
      </section>

      {/* Parámetros */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Parámetros del modelo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-2 text-gray-400 font-medium">Parámetro</th>
                <th className="text-right py-2 text-gray-400 font-medium">Valor</th>
                <th className="text-left py-2 pl-4 text-gray-400 font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Decaimiento</td>
                <td className="py-2 text-right font-mono">0.7</td>
                <td className="py-2 pl-4">Factor de decaimiento exponencial por temporada</td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Simulaciones</td>
                <td className="py-2 text-right font-mono">10,000</td>
                <td className="py-2 pl-4">Cantidad de temporadas simuladas</td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Penalidad Div B</td>
                <td className="py-2 text-right font-mono">0.6</td>
                <td className="py-2 pl-4">Descuento para equipos recién ascendidos</td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="py-2">Desv. estándar default</td>
                <td className="py-2 text-right font-mono">0.8</td>
                <td className="py-2 pl-4">Para equipos con menos de 3 temporadas de historial</td>
              </tr>
              <tr>
                <td className="py-2">Ascenso / Descenso</td>
                <td className="py-2 text-right font-mono">4 / 4</td>
                <td className="py-2 pl-4">Equipos que ascienden y descienden por temporada</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Ejemplo */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Cómo interpretar los resultados</h2>
        <p className="text-gray-300 leading-relaxed">
          Si un equipo tiene:
        </p>
        <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-1">
          <li><strong>Campeón: 25%</strong> — en 1 de cada 4 simulaciones terminó primero</li>
          <li><strong>Top 4: 60%</strong> — en 6 de cada 10 simulaciones terminó entre los primeros 4</li>
          <li><strong>Descenso: 5%</strong> — solo en 1 de cada 20 simulaciones terminó en los últimos 4</li>
          <li><strong>Pos. Esperada: 4.2</strong> — en promedio terminó alrededor del 4° puesto</li>
        </ul>
      </section>

      {/* Limitaciones */}
      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-yellow-400/80">Limitaciones</h2>
        <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-2">
          <li>No considera refuerzos ni bajas de jugadores entre temporadas.</li>
          <li>Asume que la estructura de la liga (reglas, cantidad de equipos) se mantiene.</li>
          <li>Los equipos recién ascendidos tienen mayor incertidumbre por falta de historial en Div A.</li>
          <li>Es un modelo estadístico simplificado — no incluye variables como presupuesto, infraestructura o recambio generacional.</li>
        </ul>
      </section>

      <div className="pt-2 pb-8">
        <Link
          href="/predicciones"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Ver predicciones
        </Link>
      </div>
    </div>
  );
}
