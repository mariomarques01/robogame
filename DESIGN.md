# ROBO ARENA — direção visual oficial

## Objetivo
Jogo mobile 1v1: deck sequencial de cinco robôs, invocação com um toque, movimentação por comandos, estações de energia que liberam a próxima carta, e vitória ao destruir a torre inimiga.

## Engine escolhida
Unity 6 + Universal Render Pipeline (URP), câmera ortográfica isométrica, cenário 3D estilizado, materiais PBR, iluminação baked/mixed, efeitos com VFX Graph ou Particle System. GitHub Pages continuará como protótipo web; uma build Unity WebGL poderá substituí-lo posteriormente.

## Checklist de produção para reproduzir a referência
- [ ] Modelos 3D separados de SCOUT-X, TANK-01, VOLT-7, MED-BOT e OMEGA, com rig e animações
- [ ] Arena modular (pisos, muros, água, pontes, decoração)
- [ ] Torre principal e torres laterais com animações de ataque
- [ ] Quatro plataformas de recarga com estados: disponível, capturando, recarregando
- [ ] VFX: disparos, lasers, faíscas, cura, impacto, explosão
- [ ] Cinco retratos de cartas em alta resolução e HUD responsiva
- [ ] Navegação de unidades com NavMesh, separação e colisão
- [ ] IA adversária e sistema de partidas
- [ ] Build Android e WebGL para testes

## Regras do MVP
- Primeiro robô liberado no início
- Ao tocar na carta, o robô é invocado automaticamente no campo aliado
- O robô selecionado se move até o ponto tocado
- Capturar estação disponível por 1 segundo libera próxima carta
- Estação recarrega por 12 segundos
- Máximo de 5 unidades por jogador
- Torre principal: 3.000 HP; partida: 180 segundos

## Importante
A imagem de referência gerada é uma composição 2D. Para obter o mesmo resultado visual *durante o movimento*, não basta colocá-la como fundo: é necessário produzir assets separados e animações coerentes. Não prometer equivalência pixel a pixel entre render 3D e arte conceitual.
