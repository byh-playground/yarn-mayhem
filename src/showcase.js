import { installShowcase } from 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@fcd3a02db452b2e469898b05aa797d754a89fb76/scenario.js';
const SHOWCASE = installShowcase({
    title:'털실 대소동',
    launcher:'#mainButton',
    playSelector:'#mainButton',
    durationMs:26500,
    ready:win=>!!win.__YARN_MAYHEM,
    timeline:[
  {
    "atMs": 0,
    "action": "chapter",
    "index": 0,
    "title": "합체하고 분열하는 털실 적",
    "caption": "바늘을 발사하며 전장에 나타나는 털실 무리를 상대합니다."
  },
  {
    "atMs": 120,
    "action": "click",
    "selector": "#mainButton"
  },
  {
    "atMs": 340,
    "action": "click",
    "selector": "#soloStart"
  },
  {
    "atMs": 2700,
    "action": "key",
    "code": "KeyD",
    "down": true
  },
  {
    "atMs": 2900,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerdown",
    "u": 0.82,
    "v": 0.4
  },
  {
    "atMs": 3500,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerup",
    "u": 0.82,
    "v": 0.4
  },
  {
    "atMs": 3900,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerdown",
    "u": 0.82,
    "v": 0.44
  },
  {
    "atMs": 4500,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerup",
    "u": 0.82,
    "v": 0.44
  },
  {
    "atMs": 4800,
    "action": "key",
    "code": "KeyD",
    "down": false
  },
  {
    "atMs": 8200,
    "action": "chapter",
    "index": 1,
    "title": "이동과 회피, 빠른 바늘 발사",
    "caption": "W 점프와 Shift 대시로 빈틈을 만들어 연속 공격하세요."
  },
  {
    "atMs": 8450,
    "action": "key",
    "code": "KeyW",
    "down": true
  },
  {
    "atMs": 8750,
    "action": "key",
    "code": "KeyW",
    "down": false
  },
  {
    "atMs": 9200,
    "action": "key",
    "code": "ShiftLeft",
    "down": true
  },
  {
    "atMs": 9420,
    "action": "key",
    "code": "ShiftLeft",
    "down": false
  },
  {
    "atMs": 10400,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerdown",
    "u": 0.72,
    "v": 0.46
  },
  {
    "atMs": 12700,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerup",
    "u": 0.72,
    "v": 0.46
  },
  {
    "atMs": 16000,
    "action": "chapter",
    "index": 2,
    "title": "균열에서 나타나는 다음 적",
    "caption": "스테이지마다 균열이 열리고 전투가 더 치열해집니다."
  },
  {
    "atMs": 16300,
    "action": "key",
    "code": "KeyA",
    "down": true
  },
  {
    "atMs": 18800,
    "action": "key",
    "code": "KeyA",
    "down": false
  },
  {
    "atMs": 19200,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerdown",
    "u": 0.85,
    "v": 0.35
  },
  {
    "atMs": 23900,
    "action": "pointer",
    "selector": "#gl",
    "phase": "pointerup",
    "u": 0.85,
    "v": 0.35
  }
]
});

// Restore direct introduction links after the game's own menu router has booted.
if (window.__BLOOM_SHOWCASE_DEEPLINK && SHOWCASE) {
    window.addEventListener('load', () => SHOWCASE.open(), { once: true });
}
