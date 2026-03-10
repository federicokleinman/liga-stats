import Link from 'next/link';

export default function MetodologiaPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cómo funciona</h1>
        <p className="text-gray-400 mt-1">
          Cómo se arman los números y rankings que ves en esta página.
        </p>
      </div>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">De dónde salen los datos</h2>
        <p className="text-gray-300 leading-relaxed">
          Todos los datos vienen directamente del sitio oficial de la{' '}
          <a href="https://ligauniversitaria.org.uy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Liga Universitaria de Deportes
          </a>
          , sección &quot;Detalle Histórico de las Fechas&quot;. Tomamos los resultados de cada
          partido jugado (quién jugó de local, quién de visitante, y el resultado) y a partir de
          eso armamos las tablas de posiciones.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Actualmente tenemos datos desde <strong>2003</strong> hasta{' '}
          <strong>2025</strong>, que son todas las temporadas que tienen información cargada en el
          sitio de la Liga. Solo se consideran partidos de <strong>Fútbol, categoría Mayores Masculino</strong>.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Cómo se calculan las tablas de posiciones</h2>
        <p className="text-gray-300 leading-relaxed">
          Se usan las reglas estándar de fútbol:
        </p>
        <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-1">
          <li><strong>Partido ganado:</strong> 3 puntos</li>
          <li><strong>Empate:</strong> 1 punto</li>
          <li><strong>Partido perdido:</strong> 0 puntos</li>
        </ul>
        <p className="text-gray-300 leading-relaxed">
          Si dos equipos terminan con los mismos puntos, se desempata primero por diferencia
          de gol (goles a favor menos goles en contra) y luego por goles a favor.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Quién es campeón</h2>
        <p className="text-gray-300 leading-relaxed">
          Consideramos campeón de cada divisional al equipo que termina primero en la tabla de
          posiciones de esa divisional en cada temporada.
        </p>
        <p className="text-sm text-yellow-400/80">
          Nota: en algunas temporadas, la Liga puede definir el campeón mediante playoffs o
          finales que no están reflejados en estos datos. Por eso es posible que algún
          campeonato no coincida exactamente con el resultado oficial. Si encontrás algún
          error,{' '}
          <Link href="/contacto" className="underline hover:text-yellow-300">
            avisanos
          </Link>.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Racha de campeonatos</h2>
        <p className="text-gray-300 leading-relaxed">
          Cuando un equipo sale campeón de la misma divisional varias temporadas seguidas, eso
          se cuenta como &quot;racha&quot;. Por ejemplo, si un equipo gana la Divisional A en las
          temporadas 2016, 2017 y 2018, tiene una racha de 3 campeonatos consecutivos.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Mejor ataque y mejor defensa</h2>
        <p className="text-gray-300 leading-relaxed">
          <strong>Mejor ataque:</strong> el equipo que hizo más goles por partido en una temporada.
          Se calcula dividiendo los goles a favor entre los partidos jugados.
        </p>
        <p className="text-gray-300 leading-relaxed">
          <strong>Mejor defensa:</strong> el equipo que recibió menos goles por partido en una
          temporada. Cuanto más bajo el número, mejor la defensa.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Consistencia</h2>
        <p className="text-gray-300 leading-relaxed">
          Mide qué equipos mantienen un buen rendimiento a lo largo de los años. Se calcula
          haciendo el promedio de puntos por temporada. Solo aparecen equipos que participaron
          en al menos 5 temporadas, para que el ranking sea representativo.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Ascensos</h2>
        <p className="text-gray-300 leading-relaxed">
          Se detecta un ascenso cuando un equipo pasa de una divisional a una mejor (más
          cercana a la A) de una temporada a la siguiente. Por ejemplo, si un equipo jugó en
          la Divisional C en 2013 y en la Divisional B en 2014, se
          cuenta como un ascenso.
        </p>
        <p className="text-gray-300 leading-relaxed">
          La racha de ascensos mide la mayor cantidad de ascensos consecutivos que logró un equipo.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-blue-400">Divisionales</h2>
        <p className="text-gray-300 leading-relaxed">
          Las divisionales van de la A (la más alta) a la I (la más baja, en las temporadas que
          tienen tantas). No todas las temporadas tienen la misma cantidad de divisionales — en
          las más antiguas puede haber hasta 9 divisionales, mientras que en las recientes
          suelen ser entre 5 y 7.
        </p>
      </section>

      <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-blue-400">Encontraste un error?</h2>
        <p className="text-gray-300 leading-relaxed">
          Como los datos se calculan automáticamente, es posible que haya alguna diferencia
          con los resultados oficiales. Si notás algo raro — un campeonato mal dado, puntos
          que no cierran, un equipo con nombre incorrecto — no dudes en avisarnos.
        </p>
        <Link
          href="/contacto"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Reportar un error
        </Link>
      </section>
    </div>
  );
}
