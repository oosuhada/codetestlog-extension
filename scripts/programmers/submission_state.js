/**
 * 프로그래머스 제출 상태 머신
 *
 * 상태 전환:
 *   IDLE → SUBMITTED (제출 버튼 클릭 감지)
 *   SUBMITTED → WAITING (결과 DOM 대기)
 *   WAITING → RESULT_READY (결과 텍스트 파싱 완료)
 *   RESULT_READY → COMMITTING (GitHub 업로드 시작)
 *   COMMITTING → IDLE (업로드 완료)
 *
 * 핵심: COMMITTING 상태일 때 새 제출 결과를 감지하면 큐에 쌓고 순서대로 처리한다.
 */
const SubmissionState = (() => {
  const STATE = {
    IDLE:         'IDLE',
    SUBMITTED:    'SUBMITTED',
    WAITING:      'WAITING',
    RESULT_READY: 'RESULT_READY',
    COMMITTING:   'COMMITTING',
  };

  let current = STATE.IDLE;
  let pendingQueue = [];
  let lastCommitTime = 0;
  let lastResultSignature = '';
  const COMMIT_COOLDOWN_MS = 3000;

  return {
    STATE,
    get() {
      return current;
    },
    transition(next) {
      console.log(`[ALG] State: ${current} -> ${next}`);
      current = next;
    },
    canCommit(signature) {
      if (current === STATE.COMMITTING) return false;
      const elapsed = Date.now() - lastCommitTime;
      if (signature && signature === lastResultSignature && elapsed <= COMMIT_COOLDOWN_MS) return false;
      return elapsed > COMMIT_COOLDOWN_MS;
    },
    enqueue(item) {
      if (!item) return;
      pendingQueue.push(item);
      console.log(`[ALG] 제출 결과 큐 추가: ${pendingQueue.length}개 대기`);
    },
    dequeue() {
      return pendingQueue.shift();
    },
    hasPending() {
      return pendingQueue.length > 0;
    },
    markCommitStart(signature) {
      lastCommitTime = Date.now();
      if (signature) lastResultSignature = signature;
      current = STATE.COMMITTING;
    },
    markCommitEnd() {
      current = STATE.IDLE;
    },
  };
})();
