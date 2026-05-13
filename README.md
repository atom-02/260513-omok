# 프리미엄 AI 오목 (Omok Premium)

정식 19x19 규격의 오목 게임입니다. 강력한 패턴 기반 AI와 대결하거나 친구와 함께 즐길 수 있습니다.

## 주요 기능
- **정식 규격**: 19x19 격자와 정확한 화점 위치 구현
- **강력한 AI**: 휴리스틱 패턴 매칭 알고리즘을 사용한 지능형 AI 대결 모드
- **반응형 UI**: 데스크톰과 모바일에 최적화된 세련된 디자인
- **입체감 있는 그래픽**: Canvas API를 사용한 리얼한 바둑돌 렌더링

## 기술 스택
- React 19
- TypeScript
- Tailwind CSS 4
- Motion (Animations)
- Lucide React (Icons)
- Vite (Build Tool)

## Vercel 배포 방법 (GitHub 연동)

이 저장소를 GitHub에 올린 후, Vercel에서 다음 설정을 확인해 주세요:

1. **Framework Preset**: `Vite` (자동으로 감지됨)
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Install Command**: `npm install` (또는 기본값)

배포가 완료되면 즉시 오목 게임을 즐기실 수 있습니다.

---

### 개발 모드 실행
```bash
npm install
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```
