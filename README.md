# 털실 대소동 / Yarn Mayhem

같은 등급의 털실 적이 합쳐지고 다시 분열하는 횡스크롤 액션 RPG. 바늘검과 바늘 탄환으로 실구멍을 봉쇄하고, 스탯 트리를 키워 혼자 또는 최대 4명이 함께 도전합니다.

**[바로 플레이 / Play](https://byh-playground.github.io/yarn-mayhem/)** · **v0.10.1**

![실제 Edge에서 실행한 2인 플레이](docs/gameplay.png)

Merge-and-split yarn enemies, needle-sword combat and a stat tree in a physics action RPG for 1–4 players.

## 조작

- A/D·방향키 이동, W/Space 점프, S/↓ 유지로 발판 내려가기, Shift 대시.
- 마우스 클릭은 검 3연격, 길게 누르면 바늘 발사. T 또는 스탯 버튼은 스탯 트리입니다. 시작·일시정지·결과 화면에서도 열 수 있습니다.
- 모바일은 이동 패드와 점프·대시·공격 버튼을 사용합니다.
- 시작 → 싱글 플레이로 바로 시작하거나, 시작 → 멀티 플레이에서 방을 만들고 4자리 코드를 공유합니다. 방장이 물리와 판정을 실행하고 참가자는 입력을 보내며 확정 상태를 받습니다. 30TPS입니다.

## 메뉴와 스탯 트리

- 메인은 시작·스탯 트리·플레이 방법만 표시합니다. 뒤로 / Esc로 한 단계 돌아가며, 모드 선택만으로 새 게임이 시작되지 않습니다.
- 검술·제어·기동·생존 버튼으로 계열을 바로 바꿉니다. 노드는 잠겨 있어도 선택해 효과와 선행 조건을 확인할 수 있으며, 별도의 **투자하기** 버튼으로 포인트를 사용합니다.
- 화살표는 선행 관계, 금색 선택 테두리는 현재 조회, 문구는 잠김·포인트 부족·투자 가능·완료를 표시합니다. 트리 상단의 포인트·닫기와 상세 하단의 투자 버튼은 별도 영역입니다.
- `#/start`, `#/multiplayer`, `#/help`, `#/tech/bladeEcho`로 메뉴/선택을 복원합니다. URL 진입은 구매나 게임 시작을 실행하지 않습니다.

## 검술 · 제어 트리

각 노드는 1점으로 한 번 해금합니다. 다음 노드는 바로 앞 노드를 요구합니다. 기동·생존 트리는 기존 효과를 유지합니다.

- 검술: **이어베기**는 1·2타 적중 시 최대 20px의 짧은 전진과 약한 밀침으로 연격 거리를 유지합니다. **올려베기**는 3타 생존자를 띄웁니다. 자동 점프는 없으며 직접 추격합니다. **풀어베기**는 3타 처치로 실제 분열한 두 조각에 0.3초 뒤 원래 3타 피해의 25% 잔격을 한 번씩 줍니다. 잔격은 다시 잔격을 만들지 않습니다.
- 제어: **밀어꿰기**는 바늘 피해 후 생존한 적을 발사 방향으로 최대 3초 운반합니다. 실제 바깥 벽에 닿으면 1.2초 고정합니다. 발판·화면 가장자리에는 고정되지 않습니다. **줄꿰기**는 바늘 하나로 최대 3체를 독립적으로 운반합니다. **회수절단**은 고정된 적이 검 3타에 살아남으면 안쪽으로 튕겨 첫 다른 적에게 원래 3타의 50% 충돌 피해를 한 번 줍니다. 3타에 죽으면 기존 분열과 풀어베기만 발생합니다.
- 운반·고정 중에는 AI 공격·합체가 멈추지만 피해는 계속 받습니다. 재명중으로 지속시간은 늘어나지 않습니다. 해제 뒤 0.8초 동안 재고정을 막습니다. 분열 조각에는 고정이 상속되지 않습니다.
- 긴 실 꼬리, 꽂힌 바늘 떨림, 벽 충돌 압축·파편·타격음과 거리 감쇠 흔들림, 해제 후 풀리는 실을 사용합니다. 시각 변형은 물리 몸체를 바꾸지 않습니다.

0.10.0은 새 스탯·스냅샷 계약으로 방을 분리합니다. 함께 플레이하는 사람 모두 새로고침해 같은 버전을 사용하세요. 구버전 방과 호환하지 않습니다.

## 실행과 검증

`index.html` 하나가 현행 소스이자 배포 게임입니다. 인터넷 연결이 필요하며 Matter.js와 GameKit을 고정 CDN 주소에서 로드합니다.

```sh
npm run dev
# http://127.0.0.1:8000
npm ci
npm test
```

Windows 테스트는 설치된 Edge를 사용합니다. Linux에서는 `npx playwright install --with-deps chromium` 후 실행합니다. `TEST_URL`로 공개 URL을 검증할 수 있습니다. 실행 상한은 180초이며 외부 Nostr/RTC 장애는 실패로 기록합니다. 산출물은 `test-results/`에 보관합니다.

0.10.1 메뉴/트리는 실제 DOM(jsdom)에서 11개 화면·선택·투자 흐름과 18개 실제 Matter.js 전투 진단을 통과했습니다. 브라우저 화면 크기별 시각·터치·RTC 검증은 환경 차단으로 미검증입니다. 게임·통신 계약은 0.10.0과 같습니다.

0.10.0은 실제 Matter.js 0.20.0으로 전투·벽 고정·해제·분열·스냅샷을 실행한 임시 Node 검사와 정적 빌드를 통과했습니다. DOM·렌더·오디오는 검사 대역이며, 실제 GPU 화면·사운드·RTC·터치 입력은 이번 버전에서 미검증입니다. 기존 브라우저의 소켓/WebGL 차단을 우회하지 않았습니다. 범위는 [검증 기록](docs/verification.md)을 확인하세요.

PR CI는 문법과 배포 산출물을 검사합니다. 실제 RTC 검증은 로컬 E2E이며 CI 성공만으로 대신하지 않습니다. main 병합 뒤 Actions Pages가 동일 HTML과 [빌드 정보](https://byh-playground.github.io/yarn-mayhem/build.json)를 배포합니다.

## 출처와 변경

- 원본 파일: `YARNFALL_0.8.3.html`.
- 원본 SHA-256: `2f1ae7673df01d9e43803147f6d0e4f2cf6f8c3a4eba385726287ccc6f8e57bf`.
- 최초 원문: Git 커밋 `aa6bd458523378ee69bd5d4ecfa9b51f1dbaa39a`의 `source/original.html`. 현행 실행 복사본은 중복 보관하지 않습니다.
- GameKit v0.3.1: `72b09b260edf9650353017acb49c06873fe9f5a1`. rendering, input, simloop, audio, transport, interpolation을 사용합니다.
- 0.9.1은 SDK 0.3.1의 호환 패치입니다. 기존 `bloom-yarn-mayhem-v090` 방과 welcome `0.9.0` 계약을 유지하며 게임 규칙과 30TPS는 변경하지 않습니다. 배포 모듈 해시는 [고정 명세](docs/gamekit-manifest.json)에 기록합니다.
- 최초 0.9.0 마이그레이션은 새 SDK의 연결 계약 및 방 namespace를 분리하므로 관리 규칙에 따라 **0.8.3 → 0.9.0**입니다. 이전 버전과 같은 방에 접속하지 않습니다.
- 실제 입력을 SDK loop에 전달하고 솔로/방장의 공통 `stepWorld`를 유지했습니다. 표시 위치는 `PresentationRuntime`이 소유하며 Matter 몸체에 되쓰지 않습니다. 대시 상태를 플레이어 아래에 모으고 미사용 풀·타이머·카운터를 제거했습니다.
- 클라이언트는 권위 상태를 보간합니다. 로컬 충돌/공격 예측이나 rollback 게임으로 재설계하지 않았습니다. 기존 단발 효과 ID 중복 억제와 월드 초기화 수명을 유지합니다.

새 라이선스를 부여하지 않습니다. 의존성 및 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고하세요. [개발](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html) · [관리](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html) · [UI/UX](https://github.com/byh-playground/bloom-reference/blob/main/rules/visual-ux.html) 규칙을 따릅니다.
