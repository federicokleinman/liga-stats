'use client';

import { useState, FormEvent } from 'react';

type FormType = 'contacto' | 'error';

export default function ContactoPage() {
  const [formType, setFormType] = useState<FormType>('contacto');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;

    try {
      const res = await fetch('https://formsubmit.co/ajax/federico.kleinman@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (res.ok) {
        setSubmitted(true);
        form.reset();
      }
    } catch {
      // Fallback: open mailto
      const data = new FormData(form);
      const subject = encodeURIComponent(String(data.get('_subject') || 'Contacto'));
      const body = encodeURIComponent(
        `Nombre: ${data.get('nombre')}\nEmail: ${data.get('email')}\n\n${data.get('mensaje')}`,
      );
      window.open(`mailto:federico.kleinman@gmail.com?subject=${subject}&body=${body}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#111827] border border-green-600/30 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Mensaje enviado</h2>
          <p className="text-gray-400 mb-6">Gracias por escribirnos. Te responderemos a la brevedad.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Enviar otro mensaje
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contacto</h1>
        <p className="text-gray-400 mt-1">
          Escribinos para consultas, sugerencias o para reportar algún error en los datos.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFormType('contacto')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            formType === 'contacto'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1e293b] text-gray-300 hover:bg-gray-700'
          }`}
        >
          Consulta general
        </button>
        <button
          onClick={() => setFormType('error')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            formType === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-[#1e293b] text-gray-300 hover:bg-gray-700'
          }`}
        >
          Reportar un error
        </button>
      </div>

      {formType === 'error' && (
        <div className="bg-[#111827] border border-yellow-600/30 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-medium mb-1">Reportar un error en los datos</p>
          <p className="text-gray-400 text-sm">
            Si notás que un campeonato está mal acreditado, un equipo tiene datos incorrectos
            o cualquier otra inconsistencia, contanos los detalles abajo. Indicá la temporada,
            divisional y equipo involucrado para que podamos verificarlo.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-5">
        <input type="hidden" name="_subject" value={formType === 'error' ? 'Error en datos - Liga Stats' : 'Contacto - Liga Stats'} />
        <input type="hidden" name="_template" value="table" />
        <input type="text" name="_honey" style={{ display: 'none' }} />

        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-1">
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            required
            className="w-full px-4 py-2.5 bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-2.5 bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="tu@email.com"
          />
        </div>

        {formType === 'error' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="temporada" className="block text-sm font-medium text-gray-300 mb-1">
                Temporada (si aplica)
              </label>
              <input
                type="text"
                id="temporada"
                name="temporada"
                className="w-full px-4 py-2.5 bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Ej: 100"
              />
            </div>
            <div>
              <label htmlFor="equipo" className="block text-sm font-medium text-gray-300 mb-1">
                Equipo (si aplica)
              </label>
              <input
                type="text"
                id="equipo"
                name="equipo"
                className="w-full px-4 py-2.5 bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Ej: Tenis El Pinar"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium text-gray-300 mb-1">
            {formType === 'error' ? 'Descripción del error' : 'Mensaje'}
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            required
            rows={5}
            className="w-full px-4 py-2.5 bg-[#0a0f1a] border border-[#2d3a4f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
            placeholder={
              formType === 'error'
                ? 'Describí el error que encontraste. Por ejemplo: "En la temporada 100, Div A, el campeón debería ser X pero figura Y"'
                : 'Tu mensaje...'
            }
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Enviando...' : formType === 'error' ? 'Enviar reporte' : 'Enviar mensaje'}
        </button>
      </form>
    </div>
  );
}
