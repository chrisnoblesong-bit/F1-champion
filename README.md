# F1 Champion — Vercel 배포용 완성본

## 들어 있는 파일
- `index.html`: 사이트 화면 구성
- `style.css`: 디자인
- `script.js`: 일정·드라이버 순위·팀 순위·최신 결과 표시
- `api/latest-results.js`: Vercel 서버리스 API. OpenF1에서 최근 완료된 경기 주말 세션 결과를 가져옵니다.

## GitHub에 기존 파일을 통째로 교체하는 방법
1. ZIP 압축을 풉니다.
2. GitHub에서 기존 F1 Champion 저장소를 엽니다.
3. `index.html`, `style.css`, `script.js`의 기존 내용을 각각 새 파일 내용으로 교체합니다.
4. 저장소 최상위에 `api` 폴더를 만들고 그 안에 `latest-results.js`를 업로드합니다. 최종 경로는 반드시 `api/latest-results.js`여야 합니다.
5. `README.md`도 원하면 업로드합니다.
6. 변경 사항을 **Commit changes** 합니다.
7. Vercel 프로젝트가 해당 GitHub 저장소와 연결되어 있으면 자동으로 다시 배포됩니다.

## API 확인하기
배포 후 아래 주소를 엽니다. `YOUR-SITE.vercel.app`은 본인 사이트 주소로 바꿔 주세요.

`https://YOUR-SITE.vercel.app/api/latest-results`

정상이라면 JSON에 `"ok": true`와 `"sessions"`가 나타납니다.

## 데이터 출처와 참고
- 일정·순위: Jolpica API (`api.jolpi.ca/ergast/f1`)
- 세션 결과: OpenF1 (`api.openf1.org`)
- 공식 결과 확인: F1.com 링크 제공

F1.com 자체의 공개 API를 직접 호출하는 구조는 아닙니다. OpenF1의 데이터 제공 범위와 업데이트 상태에 따라 일부 세션이 비어 있을 수 있습니다. 이 프로젝트는 Vercel의 기본 서버리스 함수 형식을 사용하므로 별도 API 키는 필요하지 않습니다.
