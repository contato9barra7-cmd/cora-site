/* ============================================================================
   GRADE CORA — as formas que rodam no fundo
   ============================================================================
   Usada em dois lugares: o painel das telas de conta (LoginSplit) e a página
   de em construção. Uma fonte só, então mexer no desenho mexe nos dois.

   Cada célula tem a classe, o índice `--i` (coluna + linha, que a saída usa
   pra escalonar a onda) e, quando é meia-lua, o tempo de giro e um atraso
   negativo, que faz cada uma nascer num ponto diferente do ciclo.

   O desenho é fixo de propósito: foi sorteado uma vez com semente fixa e
   congelado aqui. Sortear a cada carregamento faria a marca mudar de cara a
   cada visita.

   ARQUIVO GERADO por gerar-grade.py. Editar lá, não aqui.
   ============================================================================ */

export const GRADE = [
  [
    { c: "cel cel--c cel--osso", i: 0 },
    { c: "cel cel--c cel--osso", i: 1 },
    { c: "cel cel--s cel--osso", i: 2, g: "16.2s", a: "-13.8s" },
    { c: "cel cel--c cel--osso", i: 3 },
    { c: "cel cel--s cel--lima cel--g0", i: 4, g: "14.9s", a: "-8.5s" },
    { c: "cel cel--s cel--lima cel--g0", i: 5, g: "22.6s", a: "-23.3s" },
    { c: "cel cel--c cel--osso", i: 6 },
    { c: "cel cel--s cel--lima", i: 7, g: "24.8s", a: "-3.0s" },
    { c: "cel cel--s cel--osso cel--g3", i: 8, g: "24.0s", a: "-1.9s" },
    { c: "cel cel--c cel--osso", i: 9 },
    { c: "cel cel--c cel--lima", i: 10 },
  ],
  [
    { c: "cel cel--s cel--osso cel--g2", i: 1, g: "17.6s", a: "-25.7s" },
    { c: "cel cel--v", i: 2 },
    { c: "cel cel--s cel--lima cel--g2", i: 3, g: "22.6s", a: "-15.0s" },
    { c: "cel cel--c cel--lima", i: 4 },
    { c: "cel cel--s cel--lima cel--g2", i: 5, g: "13.1s", a: "-16.3s" },
    { c: "cel cel--c cel--osso", i: 6 },
    { c: "cel cel--s cel--lima cel--g3", i: 7, g: "25.4s", a: "-23.6s" },
    { c: "cel cel--c cel--osso", i: 8 },
    { c: "cel cel--s cel--osso cel--g3", i: 9, g: "18.4s", a: "-11.1s" },
    { c: "cel cel--v", i: 10 },
    { c: "cel cel--c cel--lima", i: 11 },
  ],
  [
    { c: "cel cel--c cel--lima", i: 2 },
    { c: "cel cel--s cel--osso cel--g3", i: 3, g: "17.8s", a: "-17.6s" },
    { c: "cel cel--s cel--lima cel--g0", i: 4, g: "18.1s", a: "-11.7s" },
    { c: "cel cel--s cel--osso cel--g0", i: 5, g: "13.6s", a: "-11.4s" },
    { c: "cel cel--s cel--osso cel--g0", i: 6, g: "22.5s", a: "-2.0s" },
    { c: "cel cel--s cel--osso cel--g0", i: 7, g: "25.5s", a: "-10.9s" },
    { c: "cel cel--s cel--lima cel--g3", i: 8, g: "18.0s", a: "-11.7s" },
    { c: "cel cel--c cel--lima", i: 9 },
    { c: "cel cel--s cel--osso cel--g2", i: 10, g: "15.1s", a: "-2.2s" },
    { c: "cel cel--c cel--osso", i: 11 },
    { c: "cel cel--s cel--osso cel--g0", i: 12, g: "23.5s", a: "-5.3s" },
  ],
  [
    { c: "cel cel--s cel--osso cel--g3", i: 3, g: "23.2s", a: "-11.2s" },
    { c: "cel cel--c cel--lima", i: 4 },
    { c: "cel cel--s cel--osso cel--g2", i: 5, g: "20.8s", a: "-24.7s" },
    { c: "cel cel--c cel--osso", i: 6 },
    { c: "cel cel--v", i: 7 },
    { c: "cel cel--s cel--osso cel--g1", i: 8, g: "14.2s", a: "-13.2s" },
    { c: "cel cel--c cel--lima", i: 9 },
    { c: "cel cel--s cel--osso cel--g0", i: 10, g: "23.8s", a: "-1.7s" },
    { c: "cel cel--s cel--osso cel--g0", i: 11, g: "18.0s", a: "-13.1s" },
    { c: "cel cel--s cel--osso cel--g1", i: 12, g: "23.1s", a: "-14.6s" },
    { c: "cel cel--s cel--osso cel--g0", i: 13, g: "22.2s", a: "-13.7s" },
  ]
];

export default function GradeCora() {
  return (
    <div className="campo-pad" aria-hidden="true">
      {GRADE.map((coluna, ci) => (
        <div className="coluna-pad" key={ci} style={{ '--c': ci }}>
          {/* A tira sai dobrada: a rolagem sobe metade da altura e volta ao
              começo sem emenda visível. */}
          <div className="tira">
            {coluna.concat(coluna).map((cel, i) => (
              <div
                key={i}
                className={cel.c}
                style={{
                  '--i': cel.i,
                  ...(cel.g ? { '--tgiro': cel.g, animationDelay: cel.a } : {}),
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
