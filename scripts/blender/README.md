# SCOUT-X — Blender para ROBO ARENA

Este gerador cria um **protótipo geométrico inicial**, inspirado na carta SCOUT-X (branco/azul, visor preto e olhos ciano). **Não é ainda uma réplica exata, nem tem rigging ou animações de combate.**

## Executar

Instale o Blender (gratuito). Na raiz do repositório execute:

```bash
blender --background --python scripts/blender/generate_scout_x.py
```

Ou abra o script em **Blender → Scripting → Text Editor → Open → Run Script**. O script grava arquivos em `public/models/scout_x.blend` e `public/models/scout_x.glb` relativos ao diretório de trabalho atual.

O GLB está pronto para ser carregado pelo Three.js, mas a sua integração com o tabuleiro atual deve ser feita numa etapa separada. Os arquivos gerados não são versionados automaticamente.

## Integração futura com React Three Fiber

Instalar: `npm install three @react-three/fiber @react-three/drei`

```tsx
import { useGLTF } from '@react-three/drei'

export function ScoutX() {
  const { scene } = useGLTF('/models/scout_x.glb')
  return <primitive object={scene} />
}
```

O componente deve ser renderizado dentro de um `<Canvas>` do React Three Fiber. Como a versão inicial não tem skeleton nem animações, não tente chamar `actions.Idle` ainda.

## Próximas etapas

1. Conferir silhueta e escala usando a imagem original do jogo.
2. Criar pivôs de articulações, armature e animações Idle/Walk/Attack/Death.
3. Otimizar materiais e geometria e inserir na arena Three.js.
4. Aproveitar componentes para TANK-01, VOLT-7, MED-BOT e OMEGA.
