// 독서 기록 — 기능 1(기록 추가 · 삭제 · localStorage 저장) + 기능 2(월 보기) + 기능 3(연 보기)
(() => {
  'use strict';

  // localStorage 키. 같은 PC의 다른 앱과 섞이지 않게 "reading-log."로 시작한다
  const STORAGE_KEY = 'reading-log.records';

  // 글자 수 제한 (SPEC 결정 사항 4번). 앞뒤 공백을 뺀 뒤 센다
  const TITLE_MAX = 50;
  const MEMO_MAX = 100;

  const form = document.getElementById('record-form');
  const dateInput = document.getElementById('date');
  const titleInput = document.getElementById('title');
  const startInput = document.getElementById('start-page');
  const endInput = document.getElementById('end-page');
  const memoInput = document.getElementById('memo');
  const messageEl = document.getElementById('message');
  const emptyEl = document.getElementById('empty');
  const listEl = document.getElementById('record-list');
  const monthLabelEl = document.getElementById('month-label');
  const monthCountEl = document.getElementById('month-count');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const yearLabelEl = document.getElementById('year-label');
  const yearCountEl = document.getElementById('year-count');
  const yearEmptyEl = document.getElementById('year-empty');
  const titleListEl = document.getElementById('title-list');
  const prevYearBtn = document.getElementById('prev-year');
  const nextYearBtn = document.getElementById('next-year');
  const tabMonthBtn = document.getElementById('tab-month');
  const tabYearBtn = document.getElementById('tab-year');
  const monthPanel = document.getElementById('month-panel');
  const yearPanel = document.getElementById('year-panel');

  // 기록 하나의 모양: { id, date: "2026-11-03", title, startPage, endPage, memo }
  let records = loadRecords();

  // 지금 보고 있는 달 ("2026-11")과 해 ("2026"). 앱을 열면 휴대폰 현지 시간의 이번 달·올해. 저장하지는 않는다
  let viewMonth = todayString().slice(0, 7);
  let viewYear = todayString().slice(0, 4);

  // ---------- 저장소 ----------

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  // 저장에 성공하면 true, 실패하면 false
  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---------- 도우미 ----------

  // 오늘 날짜를 "YYYY-MM-DD"로. 휴대폰의 현지 시간 기준 (toISOString은 UTC라 날짜가 어긋날 수 있다)
  function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function showMessage(text) {
    messageEl.textContent = text;
    messageEl.hidden = false;
  }

  function clearMessage() {
    messageEl.textContent = '';
    messageEl.hidden = true;
  }

  // ---------- 입력 검사 ----------

  // 문제가 있으면 { error: 안내 문구 }, 없으면 { record: 새 기록 }을 돌려준다
  function readForm() {
    const date = dateInput.value;
    const title = titleInput.value.trim();
    const startText = startInput.value.trim();
    const endText = endInput.value.trim();
    const memo = memoInput.value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: '날짜를 선택해 주세요.' };
    }
    if (title === '') {
      return { error: '책이름을 적어 주세요.' };
    }
    if (title.length > TITLE_MAX) {
      return { error: '책이름은 ' + TITLE_MAX + '자까지 적을 수 있어요. (지금 ' + title.length + '자)' };
    }
    // 숫자 칸에 '1-20'처럼 숫자가 아닌 글자가 있으면 value는 빈칸이 되고 validity.badInput이 true가 된다
    if (startInput.validity && startInput.validity.badInput) {
      return { error: '시작쪽에는 숫자만 적어 주세요.' };
    }
    if (startText === '') {
      return { error: '시작쪽을 적어 주세요.' };
    }
    if (endInput.validity && endInput.validity.badInput) {
      return { error: '끝쪽에는 숫자만 적어 주세요.' };
    }
    if (endText === '') {
      return { error: '끝쪽을 적어 주세요.' };
    }

    const startPage = Number(startText);
    const endPage = Number(endText);

    if (!Number.isInteger(startPage) || startPage < 1) {
      return { error: '시작쪽은 소수점 없는 1 이상의 숫자로 적어 주세요.' };
    }
    if (!Number.isInteger(endPage) || endPage < 1) {
      return { error: '끝쪽은 소수점 없는 1 이상의 숫자로 적어 주세요.' };
    }
    if (endPage < startPage) {
      return { error: '끝쪽이 시작쪽보다 작아요. 다시 확인해 주세요.' };
    }
    if (memo.length > MEMO_MAX) {
      return { error: '메모는 ' + MEMO_MAX + '자까지 적을 수 있어요. (지금 ' + memo.length + '자)' };
    }

    return {
      record: { id: makeId(), date, title, startPage, endPage, memo },
    };
  }

  // ---------- 기간별 보기 도우미 (기능 3 연 보기도 같이 쓴다) ----------

  // prefix가 "2026-11"이면 그 달, "2026"이면 그 해의 기록
  function recordsInPeriod(prefix) {
    return records.filter((record) => String(record.date || '').startsWith(prefix + '-'));
  }

  // 서로 다른 책이름 (앞뒤 공백만 무시, 처음 나온 순서). 권수 = 이 배열의 길이
  function distinctTitles(list) {
    const titles = [];
    list.forEach((record) => {
      const title = String(record.title || '').trim();
      if (title !== '' && !titles.includes(title)) titles.push(title);
    });
    return titles;
  }

  // 과거 → 최신 순. 같은 날짜면 먼저 적은 것이 위 (저장 순서)
  function sortOldestFirst(list) {
    return list
      .map((record, index) => ({ record, index }))
      .sort((a, b) => {
        const dateA = String(a.record.date || '');
        const dateB = String(b.record.date || '');
        if (dateA !== dateB) return dateA < dateB ? -1 : 1;
        return a.index - b.index;
      })
      .map((item) => item.record);
  }

  // "2026-11" → "2026년 11월"
  function monthLabel(ym) {
    return Number(ym.slice(0, 4)) + '년 ' + Number(ym.slice(5, 7)) + '월';
  }

  // 달을 delta만큼 옮긴다. "2026-12"에서 +1이면 "2027-01", "2026-01"에서 -1이면 "2025-12"
  function shiftMonth(ym, delta) {
    const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + delta, 1);
    return String(d.getFullYear()).padStart(4, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // 해를 delta만큼 옮긴다. "2026"에서 +1이면 "2027"
  function shiftYear(y, delta) {
    return String(Number(y) + delta).padStart(4, '0');
  }

  // ---------- 목록 ----------

  // 기록 한 건을 목록 한 줄(li)로 만든다. 사용자가 적은 글은 textContent로만 넣는다 (innerHTML 사용 금지)
  function buildRecordItem(record) {
    const li = document.createElement('li');
    li.className = 'record';

    // 첫째 줄: 날짜 · 책이름 · 쪽수
    const top = document.createElement('div');
    top.className = 'record-top';

    const dateEl = document.createElement('span');
    dateEl.className = 'record-date';
    dateEl.textContent = record.date;

    const titleEl = document.createElement('span');
    titleEl.className = 'record-title';
    titleEl.textContent = record.title;

    const pagesEl = document.createElement('span');
    pagesEl.className = 'record-pages';
    pagesEl.textContent = record.startPage + '~' + record.endPage + '쪽';

    top.append(dateEl, titleEl, pagesEl);

    // 둘째 줄: 메모 · 삭제 버튼
    const bottom = document.createElement('div');
    bottom.className = 'record-bottom';

    const memoEl = document.createElement('span');
    memoEl.className = 'record-memo';
    memoEl.textContent = record.memo || '';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.dataset.id = record.id;
    deleteBtn.setAttribute('aria-label', record.date + ' ' + record.title + ' 기록 삭제');

    bottom.append(memoEl, deleteBtn);
    li.append(top, bottom);
    return li;
  }

  // 월 보기: 달 이름 → 권수 → 빈 달 문구 → 그 달의 기록 목록
  function renderMonth() {
    const list = sortOldestFirst(recordsInPeriod(viewMonth));
    monthLabelEl.textContent = monthLabel(viewMonth);
    monthCountEl.textContent = String(distinctTitles(list).length);
    emptyEl.hidden = list.length > 0;
    listEl.textContent = '';
    list.forEach((record) => listEl.appendChild(buildRecordItem(record)));
  }

  // 연 보기: 연도 → 권수 → 빈 해 문구 → 그 해 읽은 책이름 목록 (처음 읽은 날짜 순)
  function renderYear() {
    const titles = distinctTitles(sortOldestFirst(recordsInPeriod(viewYear)));
    yearLabelEl.textContent = Number(viewYear) + '년';
    yearCountEl.textContent = String(titles.length);
    yearEmptyEl.hidden = titles.length > 0;
    titleListEl.textContent = '';
    titles.forEach((title) => {
      const li = document.createElement('li');
      li.textContent = title;
      titleListEl.appendChild(li);
    });
  }

  function render() {
    renderMonth();
    renderYear();
  }

  // ---------- 탭 전환 ----------

  // 선택 표시(aria-selected)와 패널 숨김을 함께 바꾼다. 보던 달·해는 그대로 둔다
  function showTab(tab) {
    tabMonthBtn.setAttribute('aria-selected', String(tab === 'month'));
    tabYearBtn.setAttribute('aria-selected', String(tab === 'year'));
    monthPanel.hidden = tab !== 'month';
    yearPanel.hidden = tab !== 'year';
  }

  tabMonthBtn.addEventListener('click', () => showTab('month'));
  tabYearBtn.addEventListener('click', () => showTab('year'));

  // ---------- 저장 ----------

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const result = readForm();
    if (result.error) {
      showMessage(result.error);
      return;
    }

    // 다른 탭에서 바꾼 기록을 덮어쓰지 않도록, 쓰기 직전에 저장소를 다시 읽는다
    records = loadRecords();
    records.push(result.record);
    if (!saveRecords()) {
      records.pop();
      showMessage('저장에 실패했어요. 브라우저 저장 공간을 확인해 주세요.');
      return;
    }

    clearMessage();
    // 날짜는 그대로 두고 나머지 칸만 비운다
    titleInput.value = '';
    startInput.value = '';
    endInput.value = '';
    memoInput.value = '';
    // 저장한 기록의 달·해로 이동해 방금 적은 기록이 바로 보이게 한다
    viewMonth = result.record.date.slice(0, 7);
    viewYear = result.record.date.slice(0, 4);
    render();
  });

  // 다시 입력을 시작하면 안내 문구를 지운다
  form.addEventListener('input', clearMessage);

  // ---------- 삭제 ----------

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('.btn-delete');
    if (!button) return;

    const id = button.dataset.id;
    // 다른 탭에서 바꾼 기록을 덮어쓰지 않도록, 쓰기 직전에 저장소를 다시 읽는다
    records = loadRecords();
    const target = records.find((record) => String(record.id) === id);
    if (!target) {
      // 다른 탭에서 이미 지운 기록이면 목록만 다시 그린다
      render();
      return;
    }

    const ok = window.confirm(
      target.date + ' ' + target.title + ' ' + target.startPage + '~' + target.endPage + '쪽 기록을 삭제할까요?'
    );
    if (!ok) return;

    const before = records;
    records = records.filter((record) => String(record.id) !== id);
    if (!saveRecords()) {
      records = before;
      showMessage('삭제하지 못했어요. 다시 시도해 주세요.');
    }
    render();
  });

  // ---------- 달·해 이동 ----------

  prevMonthBtn.addEventListener('click', () => {
    viewMonth = shiftMonth(viewMonth, -1);
    render();
  });

  nextMonthBtn.addEventListener('click', () => {
    viewMonth = shiftMonth(viewMonth, 1);
    render();
  });

  prevYearBtn.addEventListener('click', () => {
    viewYear = shiftYear(viewYear, -1);
    render();
  });

  nextYearBtn.addEventListener('click', () => {
    viewYear = shiftYear(viewYear, 1);
    render();
  });

  // ---------- 시작 ----------

  // 다른 탭에서 기록을 바꾸면 이 탭의 목록도 맞춘다 (storage 이벤트 = 다른 탭이 localStorage를 바꿨을 때 오는 알림)
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      records = loadRecords();
      render();
    }
  });

  dateInput.value = todayString();
  render();
})();
