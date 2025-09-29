# Holstein-Land-Bot
## 1. 프로젝트 개요

프로젝트명: 홀슈타인 란드 통합 봇

의도:
* 기존에 분산돼 있던 음악·유틸·관리·로그 봇 기능을 하나로 통합해 운영 효율과 사용자 경험을 높입니다.
* 확장 가능한 모듈식 구조를 도입해 유지보수와 기능 추가를 단순화합니다.

## 2. 현재 기능 요약

### 음악/오디오
- `/play`, `/skip`, `/stop`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/shuffle`, `/remove` 등 통합 큐/플레이어 명령을 제공합니다.

### 방송 알림
- YouTube/치지직 모듈이 새 영상·방송 시작 시 지정 채널에 임베드와 역할 멘션을 전송합니다.
- `/debug_youtube`, `/debug_chzzk` 명령으로 알림 임베드를 즉시 프리뷰할 수 있습니다.

### 서버 상태 및 통계
- MySQL 로그를 기반으로 일간·월간 멤버 통계를 계산합니다.
- 매일 00:00(Asia/Seoul) 이전날 통계를, 매월 1일 00:00 이전달 통계를 관리 서버(1318259993753161749)의 기술 채널(1318490571844751392)에 자동 게시합니다.

### 역할 온보딩
- `/rolepanel` 명령으로 역할 선택 패널을 생성합니다.
- 새 멤버는 DM으로 “환영 + 역할 패널” 메시지를 받고, DM 버튼을 눌러도 메인 서버(879204407496028201)의 역할이 즉시 토글됩니다.

### 관리/보안 유틸리티
- 파티 시스템(COH3/HOI4)은 JSON 저장소와 만료 스케줄러를 통해 자동 정리됩니다.

## 3. 개발 환경
- 언어: JavaScript (Node.js LTS)
- Discord 라이브러리: discord.js v14
- 영속 데이터: MySQL (users, logs, stats)
- 캐시/세션: Redis (선택)
- 파일 저장: JSON(`data/parties.json`, `data/youtube.json` 등)
- 형상 관리: GitHub

## 4. 아키텍처 개요

| 계층 | 설명 |
| --- | --- |
| `src/core` | BotClient, 명령/인터랙션/이벤트 로더, 서비스 레지스트리 |
| `src/events` | Discord 이벤트 핸들러(`ready`, `interactionCreate`, `guildMemberAdd` 등) |
| `src/commands` | Slash 명령 모듈(음악·방송 알림·관리·파티 등) |
| `src/interactions` | 버튼/모달/셀렉트 메뉴 등 UI 컴포넌트 핸들러 |
| `src/modules/*` | 도메인 서비스 및 리포지토리 (파티, 음악, 방송 알림 등) |
| `src/jobs` | 주기 작업 (`statsScheduler` 등) |
| `src/services` | 전역 서비스 인스턴스 초기화/종료 관리 |

### 서비스 주입
- `client.registerService(name, instance)`로 서비스 등록 후 `client.getService(name)`으로 조회합니다.
- `ensurePartyService`, `ensureYoutubeService` 등 헬퍼가 서비스 준비 여부를 확인하고 사용자에게 안내합니다.

## 5. 파티 시스템 흐름

1. `/coh3_create`, `/hoi4_create` 실행 → `PartyService`가 초안(draft)과 UI 컴포넌트를 생성합니다.
2. 버튼/모달을 통해 초안을 갱신하고 “생성” 시 Discord 메시지로 승격합니다.
3. 파티 데이터는 `PartyRepository`가 JSON(`data/parties.json`)에 저장하여 재시작 시 복구됩니다.
4. 24시간 만료 스케줄러가 지난 파티를 `closeParty`로 종료하고 알림 메시지를 전송합니다.
5. 종료 시(`SIGINT`, `SIGTERM`) `shutdownServices`가 백그라운드 작업을 안전하게 정리합니다.

## 6. 운영/배포 메모

### 주요 환경 변수
| 키 | 설명 |
| --- | --- |
| `DISCORD_TOKEN`, `CLIENT_ID` | Discord 봇 토큰, 애플리케이션 ID |
| `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | MySQL 연결 정보 |
| `ROLE_PANEL_GUILD_ID` | DM 역할 패널이 적용될 서버 ID (기본 879204407496028201) |
| `REQUIRED_TECH_ROLE_ID` | 기술팀 전용 명령 사용 권한 역할 ID |
| `STATS_GUILD_ID` / `STATS_CHANNEL_ID` | 일간/월간 통계 전송 대상 (기본 1318259993753161749 / 1318490571844751392) |
| `STATS_TZ` | 통계 스케줄 타임존 (기본 Asia/Seoul) |
| `GUILD_IDS` | 명령 배포 대상 길드 목록(콤마 구분, 기본 `879204407496028201,1318259993753161749`) |

### 배포 절차
```
npm install        # 최초 혹은 패키지 변경 시
node src/scripts/deploy-commands.js
```
- 지정된 길드(기본 두 서버)에 Slash 명령을 즉시 반영합니다.
- 다른 서버에 배포하려면 `GUILD_IDS` 환경 변수를 수정하세요.

### 기타 운영 참고 사항
- `guildMemberAdd` 이벤트가 새 유저에게 DM 역할 패널을 전송하므로 DM 차단 시 로그를 확인하세요.
- 방송 알림 저장소(`data/youtube.json`, `data/chzzk.json`)는 쓰기 가능해야 합니다.
- 통계 스케줄러는 매일/매월 실행 결과를 콘솔에 기록하며 실패 시 오류를 출력합니다.

## 7. 기여
프로젝트에 기여하거나 이슈를 제보하려면 [Discord 서버](https://discord.gg/8Vnz49nJ)에 참여한 뒤 PR 또는 이슈로 남겨주세요.
