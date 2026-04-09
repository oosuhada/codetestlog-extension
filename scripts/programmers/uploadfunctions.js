/** 푼 문제들에 대한 단일 업로드는 uploadGit 함수로 합니다.
 * 파라미터는 아래와 같습니다.
 * @param {object} bojData - 파싱된 문제 데이터
 * @param {boolean} isPassed - 정답 여부 (true: 정답 ✅, false: 오답 ❌)
 * @param {function} cb - 콜백 함수 (ex. 업로드 후 로딩 아이콘 처리 등)
 * @returns {Promise<void>}
 */
async function uploadOneSolveProblemOnGit(bojData, isPassed = true, cb) {
  const token = await getToken();
  const hook = await getHook();
  if (isNull(token) || isNull(hook)) {
    console.error('token or hook is null', token, hook);
    return;
  }

  // 커밋 메시지 및 파일명 분기
  // isPassed: true=정답, false=오답, null=코드 실행
  if (isPassed === true) {
    bojData.message = `✅ 정답: ${bojData.message}`;
  } else if (isPassed === false) {
    const timestamp = Math.floor(Date.now() / 1000);
    const dotIndex = bojData.fileName.lastIndexOf('.');
    const name = bojData.fileName.substring(0, dotIndex);
    const ext = bojData.fileName.substring(dotIndex);
    bojData.fileName = `${name}_wrong_${timestamp}${ext}`;
    bojData.message = `❌ 오답: ${bojData.message}`;
  } else {
    // 코드 실행 (isPassed === null)
    const timestamp = Math.floor(Date.now() / 1000);
    const dotIndex = bojData.fileName.lastIndexOf('.');
    const name = bojData.fileName.substring(0, dotIndex);
    const ext = bojData.fileName.substring(dotIndex);
    bojData.fileName = `${name}_run_${timestamp}${ext}`;
    bojData.message = `▶️ 코드 실행: ${bojData.message}`;
  }

  try {
    return await upload(token, hook, bojData, isPassed, cb);
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      console.error('GitHub 토큰이 만료되었거나 유효하지 않습니다.', e);
      return;
    }
    throw e;
  }
}

/** Github api를 사용하여 업로드를 합니다.
 * 정답/오답 여부에 따라 커밋 메시지와 파일명을 다르게 처리합니다.
 * @see https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
 * @param {string} token - github api 토큰
 * @param {string} hook - github api hook
 * @param {object} bojData - 파싱된 문제 데이터 (code, readme, directory, fileName, message, notesMarkdown, hasNotes)
 * @param {boolean} isPassed - 정답 여부
 * @param {function} cb - 콜백 함수 (ex. 업로드 후 로딩 아이콘 처리 등)
 */
async function upload(token, hook, bojData, isPassed = true, cb) {
  const git = new GitHub(hook, token);
  const stats = await getStats();
  const default_branch = await git.getDefaultBranchOnRepo();
  stats.branches[hook] = default_branch;
  const { refSHA, ref } = await git.getReference(default_branch);

  const tree_items = [];

  // 소스코드
  tree_items.push({
    path: `${bojData.directory}/${bojData.fileName}`,
    mode: '100644',
    type: 'blob',
    content: bojData.code,
  });

  // README.md (정답인 경우에만, 오답/코드실행은 코드 파일만 커밋)
  if (isPassed === true) {
    tree_items.push({
      path: `${bojData.directory}/README.md`,
      mode: '100644',
      type: 'blob',
      content: bojData.readme,
    });
  }

  // notes.md (태그 주석이 있는 경우에만)
  if (bojData.hasNotes && bojData.notesMarkdown) {
    tree_items.push({
      path: `${bojData.directory}/notes.md`,
      mode: '100644',
      type: 'blob',
      content: bojData.notesMarkdown,
    });
  }

  const treeData = await git.createTree(refSHA, tree_items);
  const commitSHA = await git.createCommit(bojData.message, treeData.sha, refSHA);
  await git.updateHead(ref, commitSHA);

  /* stats 갱신 */
  treeData.tree.forEach((item) => {
    updateObjectDatafromPath(stats.submission, `${hook}/${item.path}`, item.sha);
  });
  await saveStats(stats);

  if (typeof cb === 'function') {
    cb(stats.branches, bojData.directory);
  }
}

/**
 * 프로그래머스에서 맞은 문제 전체를 GitHub에 일괄 업로드합니다.
 * 일괄 업로드는 정답 문제만 대상으로 합니다.
 */
async function uploadAllSolvedProblemProgrammers() {
  const tree_items = [];
  try {
    // 1. GitHub tree 동기화
    const stats = await updateLocalStorageStats();
    const hook = await getHook();
    const token = await getToken();
    const git = new GitHub(hook, token);
    const default_branch = stats.branches[hook];
    const { refSHA, ref } = await git.getReference(default_branch);

    // 2. 풀이 완료 문제 목록 파싱 & 이미 업로드된 문제 스킵
    const solvedProblems = await findAllSolvedProblems();
    const uploadedIds = extractUploadedProblemIdsForProgrammers(stats, hook);
    const newList = solvedProblems.filter((item) => !uploadedIds.has(String(item.problemId)));

    if (newList.length === 0) {
      MultiloaderUpToDate();
      return null;
    }

    // 3. 문제 데이터 파싱 (asyncPool(2) 병렬 제어)
    const { submission } = stats;
    setMultiLoaderDenom(newList.length);
    const datas = await asyncPool(2, newList, fetchProblemCodeAndData);
    const bojDatas = datas.filter((d) => !isNull(d));

    // 4. Tree 아이템 생성
    for (const bojData of bojDatas) {
      if (!isEmpty(bojData.code) && !isEmpty(bojData.readme)) {
        // 소스코드
        tree_items.push({
          path: `${bojData.directory}/${bojData.fileName}`,
          mode: '100644',
          type: 'blob',
          content: bojData.code,
        });
        // README
        tree_items.push({
          path: `${bojData.directory}/README.md`,
          mode: '100644',
          type: 'blob',
          content: bojData.readme,
        });
        // notes.md (태그 주석이 있는 경우에만)
        if (bojData.hasNotes && bojData.notesMarkdown) {
          tree_items.push({
            path: `${bojData.directory}/notes.md`,
            mode: '100644',
            type: 'blob',
            content: bojData.notesMarkdown,
          });
        }
      }
      incMultiLoader(1);
    }

    // 5. 단일 커밋으로 일괄 업로드
    if (tree_items.length !== 0) {
      const treeData = await git.createTree(refSHA, tree_items);
      const commitSHA = await git.createCommit('✅ 전체 코드 업로드 -BaekjoonHub', treeData.sha, refSHA);
      await git.updateHead(ref, commitSHA);
      MultiloaderSuccess();
      treeData.tree.forEach((item) => {
        updateObjectDatafromPath(submission, `${hook}/${item.path}`, item.sha);
      });
      await saveStats(stats);
    } else {
      MultiloaderUpToDate();
    }
  } catch (error) {
    console.error('전체 코드 업로드 실패', error);
  }
}