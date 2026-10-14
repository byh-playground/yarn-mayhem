# 털실 대소동 / Yarn Mayhem

같은 등급의 털실 적이 합쳐지고 다시 분열하는 횡스크롤 액션 RPG. 바늘검과 바늘 탄환으로 실구멍을 봉쇄하고, 스탯 트리를 키워 혼자 또는 최대 4명이 함께 도전합니다.

**[바로 플레이 / Play](https://byh-playground.github.io/yarn-mayhem/)** · **v0.9.0**

![실제 Edge에서 실행한 2인 플레이](docs/gameplay.png)

Merge-and-split yarn enemies, needle-sword combat and a stat tree in a physics action RPG for 1–4 players.

## 조작

- A/D·방향키 이동, W/Space 점프, S/↓ 유지로 발판 내려가기, Shift 대시.
- 마우스 클릭은 검 3연격, 길게 누르면 바늘 발사. T는 스탯 트리입니다.
- 모바일은 이동 패드와 점프·대시·공격 버튼을 사용합니다.
- 시작 화면에서 방을 만들고 4자리 코드를 공유합니다. 방장이 물리와 판정을 실행하고 참가자는 입력을 보내며 확정 상태를 받습니다. 30TPS입니다.

## 실행과 검증

`index.html` 하나가 현행 소스이자 배포 게임입니다. 인터넷 연결이 필요하며 Matter.js와 GameKit을 고정 CDN 주소에서 로드합니다.

```sh
npm run dev
# http://127.0.0.1:8000
npm ci
npm test
```

Windows 테스트는 설치된 Edge를 사용합니다. Linux에서는 `npx playwright install --with-deps chromium` 후 실행합니다. `TEST_URL`로 공개 URL을 검증할 수 있습니다. 실행 상한은 180초이며 외부 Nostr/RTC 장애는 실패로 기록합니다. 산출물은 `test-results/`에 보관합니다.

실제 Edge 155, Matter.js 0.20.0, NVIDIA WebGL에서 원본과 후보의 이동·공격·사망/재시작, Nostr/WebRTC 2인 연결·입력 왕복·관전·부활·전멸을 확인했습니다. QA는 장면과 피해만 준비하고 실제 물리·SDK 경로를 실행합니다. 4인·다른 기기/NAT·장시간·실물 터치 기기는 미검증입니다. 상세 범위는 [검증 기록](docs/verification.md)을 확인하세요.

PR CI는 문법과 배포 산출물을 검사합니다. 실제 RTC 검증은 로컬 E2E이며 CI 성공만으로 대신하지 않습니다. main 병합 뒤 Actions Pages가 동일 HTML과 [빌드 정보](https://byh-playground.github.io/yarn-mayhem/build.json)를 배포합니다.

## 출처와 변경

- 원본: [ChatGPT 대화](https://chatgpt.com/c/6acdad70-5744-83ee-8cfc-ac9fcd46158c)의 `YARNFALL_0.8.3.html`.
- 원본 SHA-256: `2f1ae7673df01d9e43803147f6d0e4f2cf6f8c3a4eba385726287ccc6f8e57bf`.
- 최초 원문: Git 커밋 `aa6bd458523378ee69bd5d4ecfa9b51f1dbaa39a`의 `source/original.html`. 현행 실행 복사본은 중복 보관하지 않습니다.
- GameKit v0.3.0: `63c62dae8d339f6f0329c0940206806f69509630`. rendering, input, simloop, audio, transport, interpolation을 사용합니다.
- 새 SDK의 연결 계약 및 방 namespace를 분리하므로 관리 규칙에 따라 **0.8.3 → 0.9.0**입니다. 이전 버전과 같은 방에 접속하지 않습니다.
- 실제 입력을 SDK loop에 전달하고 솔로/방장의 공통 `stepWorld`를 유지했습니다. 표시 위치는 `PresentationRuntime`이 소유하며 Matter 몸체에 되쓰지 않습니다. 대시 상태를 플레이어 아래에 모으고 미사용 풀·타이머·카운터를 제거했습니다.
- 클라이언트는 권위 상태를 보간합니다. 로컬 충돌/공격 예측이나 rollback 게임으로 재설계하지 않았습니다. 기존 단발 효과 ID 중복 억제와 월드 초기화 수명을 유지합니다.

새 라이선스를 부여하지 않습니다. 의존성 및 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고하세요. [개발](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html) · [관리](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html) · [UI/UX](https://github.com/byh-playground/bloom-reference/blob/main/rules/visual-ux.html) 규칙을 따릅니다.
