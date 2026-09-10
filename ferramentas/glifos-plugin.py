# -*- coding: utf-8 -*-
"""Os 22 desenhos de hoje, redesenhados em cima deles mesmos.

Nao ha desenho novo aqui: cada um e o que ja esta na barra, so que numa grade
so. O que muda e altura, peso e raio de canto.

A GRADE
  quadro 24, area util 19 para o que e reto e 20 para o que e redondo ou
  diagonal. Circulo e diagonal precisam de mais para PARECEREM do mesmo
  tamanho, e e por isso que hoje o cubo parece maior que a lixeira.

O PESO
  1,5 no quadro de 24, que da 2,0 quando o SketchUp desenha em 32. Hoje varia
  entre 2 e 2,5 no mesmo arquivo de 32.

OS CANTOS
  1,2 no pequeno, 2,2 no medio, 3,4 no dado. Hoje sao seis raios diferentes.

OS CHEIOS
  Dois icones sao cheios de proposito, e continuam: no Materiais a metade
  cheia E a amostra, e no Randomizar Materiais os dois cheios sao os que
  trocaram. Tirar o cheio deles apagaria a informacao.
"""

GLIFOS = [
    # (id, familia, nome, corpo, nota do que mudou)
    ('alinhar_borda', 'texturas', 'Alinhar textura à borda',
     '<path d="M3.6 3.4v17.2" stroke-width="2.4"/>'
     '<rect x="9.6" y="8.2" width="11" height="7.6" rx="1.2"/>'
     '<path d="M8.6 12H5.6m0 0l1.8-1.8M5.6 12l1.8 1.8"/>',
     'A barra de referência era mais curta que a área útil e a caixa estava fora de centro. Agora a barra vai de ponta a ponta e a caixa está no meio da altura.'),

    ('assets_blocos', 'assets', 'Blocos',
     '<path d="M12 2.6l8.7 5v8.8L12 21.4l-8.7-5V7.6z"/>'
     '<path d="M12 12.4l8.7-4.8M12 12.4v9M12 12.4L3.3 7.6"/>',
     'O cubo era o desenho mais alto da barra, 26 de 32. Desceu para a área útil e o peso ficou igual ao dos vizinhos.'),

    ('assets_espelho', 'assets', 'Espelho',
     '<ellipse cx="12" cy="12" rx="6.4" ry="9.6"/>'
     '<path d="M9.4 14.2l3.2-5M11.6 14.8l3.2-5"/>',
     'Os dois brilhos tinham comprimentos diferentes e não eram paralelos de verdade. Agora são iguais e o vão entre eles é o mesmo do vidro.'),

    ('assets_fume', 'assets', 'Vidro',
     '<rect x="6" y="2.6" width="12" height="18.8" rx="2.2"/>'
     '<path d="M8.8 10.6l4.4-4.4M8.8 15l7-7"/>',
     'A folha estava mais baixa que o espelho, e os dois vivem lado a lado na barra. Agora têm a mesma altura, e o brilho segue a mesma inclinação.'),

    ('assets_historico', 'assets', 'Histórico',
     '<path d="M3.6 12a8.4 8.4 0 108.4-8.4 8.4 8.4 0 00-6.6 3.2"/>'
     '<path d="M3.2 3.6v4.2h4.2"/>'
     '<path d="M12 7.6V12l3.2 2.1"/>',
     'O relógio estava menor que os outros redondos e o ponteiro não saía do centro. Cresceu para os 20 de área útil e os ponteiros nascem no eixo.'),

    ('assets_materiais', 'assets', 'Materiais',
     '<path d="M20.4 5.6v12.8a2 2 0 01-2 2H5.6z" fill="currentColor" stroke="none"/>'
     '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.2"/>'
     '<path d="M20.6 3.4L3.4 20.6"/>',
     'A metade cheia vazava por cima do fio da caixa. Agora ela para no fio, e a diagonal vai de canto a canto de verdade.'),

    ('assets_otimizar', 'assets', 'Otimizar Modelo',
     '<path d="M3.4 20.6L13.8 10.2"/>'
     '<path d="M17.6 3.2l1.15 3.05L21.8 7.4l-3.05 1.15L17.6 11.6l-1.15-3.05L13.4 7.4l3.05-1.15z" fill="currentColor" stroke="none"/>'
     '<path d="M6.4 3.4l.5 1.35 1.35.5-1.35.5-.5 1.35-.5-1.35-1.35-.5 1.35-.5z" fill="currentColor" stroke="none"/>',
     'As duas estrelas tinham pontas de tamanhos diferentes e a varinha não encostava na maior. Agora a haste sai da estrela e as duas são a mesma forma em duas escalas.'),

    ('assets_purge', 'assets', 'Purge',
     '<path d="M3.6 6.6h16.8"/>'
     '<path d="M9.8 6.6V4.6h4.4v2"/>'
     '<path d="M10.2 3.2h3.6"/>'
     '<path d="M5.9 6.6l.9 13.5a1.4 1.4 0 001.4 1.3h7.6a1.4 1.4 0 001.4-1.3l.9-13.5"/>'
     '<path d="M9.8 10.4v7.2M12 10.4v7.2M14.2 10.4v7.2"/>',
     'Os três riscos de dentro tinham alturas desiguais e a alça estava colada na tampa. Riscos iguais, alça com respiro.'),

    ('luz_linear', 'luzes', 'Luz Linear',
     '<rect x="4.4" y="4.6" width="15.2" height="4.6" rx="2.3"/>'
     '<path d="M8 12.6v6.8M12 12.6v6.8M16 12.6v6.8"/>',
     'A luminária ocupava quase a largura toda e os raios eram curtos demais para ler como luz. Agora a barra respira nas pontas e os raios têm o dobro do vão.'),

    ('luz_plafon', 'luzes', 'Luz Plafon',
     '<rect x="8" y="8" width="8" height="8" rx="1.2"/>'
     '<circle cx="12" cy="12" r="3.2"/>'
     '<path d="M12 3.4v3.4M12 17.2v3.4M3.4 12h3.4M17.2 12h3.4"/>',
     'Os quatro riscos em volta tinham comprimentos diferentes e o quadrado não era quadrado. Agora os quatro são iguais e o quadro fechou.'),

    ('luz_spot', 'luzes', 'Luz Spot',
     '<path d="M9.8 3.4h4.4v2.6H9.8z"/>'
     '<path d="M9.8 6L5.8 19.2h12.4L14.2 6"/>'
     '<path d="M5.8 19.4h12.4" stroke-dasharray="2.6 2.2"/>',
     'O cone estava fora de eixo, mais largo de um lado. Agora ele é simétrico e a base tracejada tem o mesmo pontilhado do resto do conjunto.'),

    ('posicionar', 'texturas', 'Despadronizar',
     '<rect x="3.2" y="3.4" width="8" height="8" rx="1.4"/>'
     '<rect x="13.6" y="5" width="6.4" height="6.4" rx="1.2"/>'
     '<rect x="3.2" y="13.8" width="6.4" height="6.4" rx="1.2"/>'
     '<rect x="11.8" y="12.8" width="8" height="8" rx="1.4"/>',
     'Os quatro quadrados tinham quatro raios diferentes. Agora são dois tamanhos e dois raios, e a diagonal dos grandes ficou de verdade na diagonal.'),

    ('proj_esferica_ajustada', 'texturas', 'Projeção Esférica (Fit)',
     '<circle cx="12" cy="12" r="6.6"/>'
     '<ellipse cx="12" cy="12" rx="2.8" ry="6.6"/>'
     '<path d="M5.4 12h13.2"/>'
     '<path d="M2.6 6.6V2.6h4M17.4 2.6h4v4M21.4 17.4v4h-4M6.6 21.4h-4v-4"/>',
     'Os colchetes tinham braços de tamanhos diferentes e o globo estava descentrado dentro deles. Braços iguais, globo no meio.'),

    ('proj_esferica_mundo', 'texturas', 'Projeção Esférica (Global)',
     '<circle cx="12" cy="12" r="9"/>'
     '<ellipse cx="12" cy="12" rx="3.8" ry="9"/>'
     '<path d="M3.4 8.8h17.2M3.4 15.2h17.2"/>',
     'Os dois paralelos não estavam à mesma distância do equador. Agora estão, e o globo cresceu para os 20 dos redondos.'),

    ('proj_triplanar_ajustada', 'texturas', 'Projeção Triplanar (Fit)',
     '<path d="M12 5.6l6.3 3.6v6.4L12 19.2l-6.3-3.6V9.2z"/>'
     '<path d="M12 12.8l6.3-3.6M12 12.8v6.4M12 12.8L5.7 9.2"/>'
     '<path d="M2.6 6.6V2.6h4M17.4 2.6h4v4M21.4 17.4v4h-4M6.6 21.4h-4v-4"/>',
     'Mesmo acerto dos colchetes da esférica, para as duas serem lidas como um par.'),

    ('proj_triplanar_mundo', 'texturas', 'Projeção Triplanar (Global)',
     '<path d="M12 2.6l8.7 5v8.8L12 21.4l-8.7-5V7.6z"/>'
     '<path d="M12 12.4l8.7-4.8M12 12.4v9M12 12.4L3.3 7.6"/>',
     'É o mesmo cubo do Blocos, e continua sendo: os dois desenhos já eram iguais na barra de hoje. Vale decidir se um dos dois muda.'),

    ('random_material', 'assets', 'Randomizar Materiais',
     '<rect x="3.2" y="3.2" width="7.6" height="7.6" rx="1.3"/>'
     '<rect x="13.2" y="3.2" width="7.6" height="7.6" rx="1.3" fill="currentColor"/>'
     '<rect x="3.2" y="13.2" width="7.6" height="7.6" rx="1.3" fill="currentColor"/>'
     '<rect x="13.2" y="13.2" width="7.6" height="7.6" rx="1.3"/>',
     'Os quatro tinham tamanhos ligeiramente diferentes e o vão entre eles não era o mesmo nos dois eixos. Agora é uma grade de verdade.'),

    ('randomizar', 'assets', 'Randomizar elementos',
     '<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.4"/>'
     '<circle cx="8" cy="8" r="1.35" fill="currentColor" stroke="none"/>'
     '<circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/>'
     '<circle cx="16" cy="16" r="1.35" fill="currentColor" stroke="none"/>',
     'Os três pontos do dado tinham diâmetros diferentes e não estavam na diagonal. Agora são iguais e caem na diagonal do quadrado.'),

    ('ripado', 'assets', 'Distribuir Componente',
     '<path d="M3.4 19.8h17.2"/>'
     '<path d="M7.6 19.8V6.2M12 19.8V4.2M16.4 19.8V6.2"/>',
     'As três tábuas tinham espessura maior que o resto do conjunto e a base sobrava dos dois lados. Peso igualado e base do tamanho da área útil.'),

    ('rotacionar_90ccw', 'texturas', 'Girar no sentido anti-horário',
     '<path d="M3.8 12a8.2 8.2 0 102.5-5.9"/>'
     '<path d="M10.4 4.4H5.8v4.6"/>',
     'A seta e o arco tinham pesos diferentes, e a ponta da seta era maior que a do sentido horário. Os dois viraram o mesmo desenho espelhado.'),

    ('rotacionar_90cw', 'texturas', 'Girar no sentido horário',
     '<path d="M20.2 12a8.2 8.2 0 11-2.5-5.9"/>'
     '<path d="M13.6 4.4h4.6v4.6"/>',
     'O par do anti-horário, agora espelhado exatamente.'),

    ('rotacionar_custom', 'texturas', 'Girar em ângulo personalizado',
     '<path d="M3.4 18.8h17.2"/>'
     '<path d="M3.4 18.8A8.6 8.6 0 0118.2 12.7"/>'
     '<path d="M18.2 12.7l2.4 6.1"/>'
     '<path d="M14.4 16.4l2.6 1.4"/>',
     'O transferidor não fechava com a base e a marca do ângulo cruzava a linha em vez de tocá-la. Agora fecha, e a marca é perpendicular.'),

    ('cursor_spot', 'luzes', 'Cursor do Spot',
     '<path d="M12 3.6L6.4 17.4h11.2z"/>'
     '<ellipse cx="12" cy="17.6" rx="5.6" ry="2.2"/>',
     'É o cursor de posicionar o spot, e não um botão da barra. Entra aqui só para o conjunto ficar completo.'),
]
