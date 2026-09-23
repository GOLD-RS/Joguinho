# Flappy Aurora

Jogo 100% offline e free. Físicа determinística de 120 Hz, colisão justa,
tubos móveis, power-ups, medalhas e **ranking local** (salvo no próprio
navegador, sem servidor, sem banco, sem internet).

![GitHub CI](https://img.shields.io/github/actions/workflow/status/GOLD-RS/Joguinho/ci-pages.yml?label=CI)

## Recursos

- **PWA instalável e 100% offline** — manifest + service worker: adicione à
  tela inicial do celular/desktop e jogue sem internet (funciona até no
  modo avião).
- **Física em passo fixo (120 Hz)** — mesma dificuldade em 60/90/120/144 Hz.
- **Colisão círculo × retângulo** — justa mesmo nos cantos dos tubos.
- **Power-ups:** escudo, câmera lenta, **ímã de fresta** (puxa ao centro).
- **Medalhas** Bronze/Prata/Ouro/Platina + vibração + botão de pausa.
- **Faixa PERFEITO** desenhada com o tamanho real do acerto.
- **"RASPANDO!" (near-miss)** vale +1 ponto bônus.
- **Crescente da lua** com a cor real do céu naquela altura.
- **Ranking 100% local** no `localStorage` — funciona até no modo avião.

## Rodando localmente (opcional)

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera o site estático em ./out
```

O build estático (`out/`) pode ser aberto/colocado em qualquer hospedagem
free (GitHub Pages, Netlify, Cloudflare) — não precisa de servidor nem de
banco de dados.

## Publicação (CI)

O workflow `.github/workflows/ci-pages.yml`:

1. Roda `npm run typecheck` + `npm run lint` + `npm run build`.
2. Faz deploy automático no **GitHub Pages** a cada push em `main`.
3. Sobe o `out/` como artefato downloadável (`flappy-aurora-offline`).

## Estrutura

```
src/
  app/
    page.tsx          # monta o jogo
    layout.tsx        # meta + viewport
    icon.svg          # ícone do app
    globals.css       # Tailwind
  components/
    FlappyGame.tsx    # canvas + ranking local (localStorage)
  game/
    engine.ts         # motor do jogo (canvas + WebAudio, auto-suficiente)
```

## Licença

MIT.
