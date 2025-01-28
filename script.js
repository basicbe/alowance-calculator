// 상수 정의
const CONSTANTS = {
    ITEMS_PER_PAGE: 10,
    MIN_ITEMS_FOR_PAGINATION: 50,
    STORAGE_KEYS: {
        WAGE: 'contractWage',
        SALARY_DATA: 'salaryData'
    },
    SORT_ORDERS: {
        DESC: 'desc',
        ASC: 'asc'
    }
};

// 유틸리티 함수들
function formatNumber(number) {
    return number.toLocaleString();
}

function createElementWithClass(tag, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function getStorageItem(key, defaultValue = []) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Storage 읽기 오류:', e);
        return defaultValue;
    }
}

function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Storage 저장 오류:', e);
    }
}

// 데이터 관련 함수들
function getSalaryData() {
    return getStorageItem(CONSTANTS.STORAGE_KEYS.SALARY_DATA, []);
}

function saveSalaryData(data) {
    setStorageItem(CONSTANTS.STORAGE_KEYS.SALARY_DATA, data);
}

function calculateOvertimePay(minutes, wage) {
    const hours = minutes / 60;
    return Math.round(wage * hours * 1.5);
}

// UI 생성 함수들
function createButton(text, onClick, className) {
    const button = createElementWithClass('button', className);
    button.textContent = text;
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

function createSalaryItemElement(item) {
    const div = createElementWithClass('div', 'salary-item');
    const hours = Math.round((item.minutes / 60) * 100) / 100;
    
    const leftDiv = createElementWithClass('div', 'salary-left');
    const dateDiv = createElementWithClass('div', 'salary-date');
    dateDiv.textContent = item.date;
    
    const timeDiv = createElementWithClass('div', 'salary-time');
    timeDiv.textContent = `${item.minutes}분 = ${hours}시간`;
    
    leftDiv.append(dateDiv, timeDiv);
    
    const rightDiv = createElementWithClass('div', 'salary-right');
    const amountDiv = createElementWithClass('div', 'salary-amount');
    amountDiv.textContent = `${formatNumber(item.amount)}원`;
    
    const actionDiv = createElementWithClass('div', 'action-buttons');
    const editBtn = createButton('수정', () => showEditForm(item.date), 'btn edit-btn');
    const deleteBtn = createButton('삭제', () => deleteSalary(item.date), 'btn delete-btn');
    
    actionDiv.append(editBtn, deleteBtn);
    rightDiv.append(amountDiv, actionDiv);
    div.append(leftDiv, rightDiv);
    
    return div;
}

function createPaginationElement(totalPages, currentPage, onPageChange) {
    const paginationDiv = createElementWithClass('div', 'pagination');
    
    if (totalPages <= 1) return null;
    
    // 처음으로
    if (currentPage > 1) {
        paginationDiv.appendChild(
            createButton('<<', () => onPageChange(1))
        );
    }
    
    // 이전 10페이지
    if (currentPage > 10) {
        paginationDiv.appendChild(
            createButton('<', () => onPageChange(Math.max(1, currentPage - 10)))
        );
    }
    
    // 페이지 번호들
    const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1;
    const endPage = Math.min(startPage + 9, totalPages);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createButton(
            String(i),
            () => onPageChange(i),
            `page-btn ${i === currentPage ? 'active' : ''}`
        );
        paginationDiv.appendChild(pageBtn);
    }
    
    // 다음 10페이지
    if (endPage < totalPages) {
        paginationDiv.appendChild(
            createButton('>', () => onPageChange(Math.min(totalPages, currentPage + 10)))
        );
    }
    
    // 마지막으로
    if (currentPage < totalPages) {
        paginationDiv.appendChild(
            createButton('>>', () => onPageChange(totalPages))
        );
    }
    
    return paginationDiv;
}

// 이벤트 핸들러들
function handleSalaryAction() {
    if (isEditMode) {
        updateSalary();
    } else {
        calculateSalary();
    }
}

let isEditMode = false;
let editingDate = null;

// 페이지네이션 관련 변수 추가
let currentPage = 1;

// 정렬 관련 상태 추가
let currentSortOrder = CONSTANTS.SORT_ORDERS.DESC; // 기본값은 최신순

// 상태 변수 수정
let selectedMonth = null;

function setSortOrder(order) {
    if (!Object.values(CONSTANTS.SORT_ORDERS).includes(order)) {
        console.error('잘못된 정렬 순서입니다.');
        return;
    }
    
    currentSortOrder = order;
    updateSortButtons();
    displaySalaryList();
}

function updateSortButtons() {
    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        if ((btn.textContent === '최신순' && currentSortOrder === CONSTANTS.SORT_ORDERS.DESC) ||
            (btn.textContent === '과거순' && currentSortOrder === CONSTANTS.SORT_ORDERS.ASC)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function showEditForm(date) {
    isEditMode = true;
    editingDate = date;
    
    // 해당 날짜의 데이터 찾기
    const salaryData = getSalaryData();
    const item = salaryData.find(item => item.date === date);
    
    if (item) {
        // 기존 입력 폼에 데이터 채우기
        document.getElementById('workDate').value = item.date;
        document.getElementById('overtimeMinutes').value = item.minutes;
        
        // 버튼 텍스트 변경
        updateCalculateButton();
        
        // 스크롤을 입력 폼으로 이동
        document.getElementById('workDate').scrollIntoView({ behavior: 'smooth' });
    }
}

function updateCalculateButton() {
    const button = document.querySelector('button[onclick*="handleSalaryAction"]');
    if (button) {
        button.textContent = isEditMode ? '수정하기' : '계산하기';
    }
}

function calculateSalary() {
    const wage = localStorage.getItem(CONSTANTS.STORAGE_KEYS.WAGE);
    if (!wage) {
        alert('계약시급을 먼저 설정해주세요.');
        return;
    }

    const hourlyWage = parseFloat(wage);
    const overtimeMinutes = parseFloat(document.getElementById('overtimeMinutes').value);
    const workDate = document.getElementById('workDate').value;
    
    if (isNaN(overtimeMinutes) || !workDate) {
        alert('날짜와 시간을 모두 입력해주세요.');
        return;
    }

    const overtimeHours = overtimeMinutes / 60;
    const overtimePay = hourlyWage * overtimeHours * 1.5;
    
    const newSalary = {
        date: workDate,
        minutes: overtimeMinutes,
        amount: overtimePay,
        wage: hourlyWage
    };
    
    const salaryData = getSalaryData();
    salaryData.push(newSalary);
    saveSalaryData(salaryData);
    
    displaySalaryList();
    clearInputs();
}

function updateSalary() {
    const newDate = document.getElementById('workDate').value;
    const newMinutes = parseFloat(document.getElementById('overtimeMinutes').value);
    
    if (isNaN(newMinutes)) {
        alert('올바른 시간을 입력해주세요.');
        return;
    }

    let salaryData = getSalaryData();
    const itemIndex = salaryData.findIndex(item => item.date === editingDate);
    
    if (itemIndex !== -1) {
        const wage = salaryData[itemIndex].wage;
        const overtimeHours = newMinutes / 60;
        const overtimePay = wage * overtimeHours * 1.5;
        
        // 기존 항목 업데이트
        salaryData[itemIndex] = {
            date: newDate,
            minutes: newMinutes,
            amount: overtimePay,
            wage: wage
        };
        
        saveSalaryData(salaryData);
        
        // 수정 모드 종료
        isEditMode = false;
        editingDate = null;
        
        // UI 업데이트
        updateCalculateButton();
        displaySalaryList();
        clearInputs();
    }
}

// 어제 날짜를 YYYY-MM-DD 형식으로 반환하는 함수
function getYesterday() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 입력 폼 초기화 함수 수정
function clearInputs() {
    // 연장 근무시간만 초기화
    document.getElementById('overtimeMinutes').value = '';
    
    // 근무일 초기화하지 않음 (이전 코드 제거)
    // const workDateInput = document.getElementById('workDate');
    // if (workDateInput && !isEditMode) {
    //     workDateInput.value = getYesterday();
    // }
}

// 급여 내역 삭제
function deleteSalary(date) {
    if (confirm('정말 삭제하시겠습니까?')) {
        let salaryData = getSalaryData();
        // 날짜로 해당 항목 찾아서 삭제
        salaryData = salaryData.filter(item => item.date !== date);
        saveSalaryData(salaryData);
        displaySalaryList();
    }
}

let currentTab = 'all';

function showCustomPeriod() {
    currentPage = 1;
    currentTab = 'period';
    updateTabButtons();
    document.getElementById('periodSelector').style.display = 'flex';
    updateSortButtons();
    
    // 기본값으로 이번 달 1일부터 오늘까지 설정
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    
    searchByPeriod();
}

function showAllSalaries() {
    currentPage = 1;
    currentTab = 'all';
    selectedMonth = null;
    updateTabButtons();
    hideMonthSelector();
    displaySalaryList();
}

function showMonthSalaries() {
    currentPage = 1;
    currentTab = 'month';
    selectedMonth = null;
    updateTabButtons();
    hideMonthSelector();
    displaySalaryList();
}

function searchByPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('시작일과 종료일을 모두 선택해주세요.');
        return;
    }
    
    if (startDate > endDate) {
        alert('시작일이 종료일보다 늦을 수 없습니다.');
        return;
    }
    
    displaySalaryList(startDate, endDate);
}

function updateTabButtons() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        if ((button.textContent === '전체' && currentTab === 'all') ||
            (button.textContent === '이번 달' && currentTab === 'month') ||
            (button.textContent === '월별 조회' && currentTab === 'monthSelect')) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// 페이지네이션 관련 유틸리티 함수
function shouldShowPagination(totalItems) {
    return totalItems >= CONSTANTS.MIN_ITEMS_FOR_PAGINATION;
}

function calculatePageInfo(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / CONSTANTS.ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * CONSTANTS.ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + CONSTANTS.ITEMS_PER_PAGE, totalItems);
    
    return {
        totalPages,
        startIndex,
        endIndex,
        currentItems: endIndex - startIndex
    };
}

// 정렬 관련 함수
function sortSalaryData(data, sortOrder) {
    return [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === CONSTANTS.SORT_ORDERS.DESC ? dateB - dateA : dateA - dateB;
    });
}

// UI 업데이트 함수
function updateButtonState(button, isActive) {
    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

function createPaginationControls(totalItems, currentPage, onPageChange) {
    if (!shouldShowPagination(totalItems)) {
        return null;
    }

    const { totalPages } = calculatePageInfo(totalItems, currentPage);
    return createPaginationElement(totalPages, currentPage, onPageChange);
}

// 메인 디스플레이 함수 리팩토링
function displaySalaryList(startDate = null, endDate = null) {
    const salaryList = document.getElementById('salaryList');
    const monthTotal = document.getElementById('monthTotal');
    
    if (!salaryList || !monthTotal) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    let salaryData = filterSalaryData(getSalaryData(), startDate, endDate);
    salaryData = sortSalaryData(salaryData, currentSortOrder);

    // 페이지네이션 표시 여부 결정
    const showPagination = shouldShowPagination(salaryData.length);
    
    // 페이지네이션이 표시될 때만 데이터 분할
    let displayData;
    if (showPagination) {
        const { startIndex, endIndex } = calculatePageInfo(salaryData.length, currentPage);
        displayData = salaryData.slice(startIndex, endIndex);
    } else {
        displayData = salaryData; // 전체 데이터 표시
    }

    // 목록 초기화 및 표시
    clearElement(salaryList);
    
    // 아이템 표시
    displayData.forEach(item => {
        const itemElement = createSalaryItemElement(item);
        salaryList.appendChild(itemElement);
    });

    // 페이지네이션 표시
    if (showPagination) {
        const paginationElement = createPaginationControls(
            salaryData.length,
            currentPage,
            (page) => {
                currentPage = page;
                displaySalaryList(startDate, endDate);
            }
        );
        if (paginationElement) {
            salaryList.appendChild(paginationElement);
        }
    }

    // 총계 표시
    updateTotalDisplay(salaryData, monthTotal);
}

// 데이터 필터링 함수
function filterSalaryData(data, startDate, endDate) {
    if (!Array.isArray(data)) return [];

    let filteredData = [...data];

    if (currentTab === 'month') {
        // 이번 달 필터링
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        
        filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
        });
    } else if (currentTab === 'monthSelect' && selectedMonth) {
        // 선택한 월 필터링
        const [year, month] = selectedMonth.split('-').map(Number);
        
        filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
        });
    } else if (currentTab === 'period' && startDate && endDate) {
        filteredData = filteredData.filter(item => 
            item.date >= startDate && item.date <= endDate
        );
    }

    return filteredData;
}

// 총계 표시 함수
function updateTotalDisplay(data, container) {
    const totalAmount = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const totalDiv = createElementWithClass('div', 'total-container');
    const countDiv = createElementWithClass('div', 'total-count');
    const amountDiv = createElementWithClass('div', 'total-amount');
    
    countDiv.textContent = `총 ${data.length}건`;
    amountDiv.textContent = `${formatNumber(totalAmount)}원`;
    
    clearElement(container);
    totalDiv.append(countDiv, amountDiv);
    container.appendChild(totalDiv);
}

// 월 선택 관련 함수들
function showMonthSelector() {
    currentPage = 1;
    currentTab = 'monthSelect';
    updateTabButtons();
    
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        monthSelector.style.display = 'block';
        
        // 현재 년월을 기본값으로 설정
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('monthInput').value = `${year}-${month}`;
        
        // 선택된 월의 데이터 표시
        handleMonthSelect(`${year}-${month}`);
    }
}

function handleMonthSelect(yearMonth) {
    selectedMonth = yearMonth;
    displaySalaryList();
}

// 탭 변경 시 월 선택기 숨기기
function hideMonthSelector() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        monthSelector.style.display = 'none';
    }
}

// 페이지 로드 시 초기화 함수 수정
function initializeApp() {
    displaySalaryList();
    loadWage();
    updateSortButtons();
    updateTabButtons();
    hideMonthSelector();
    
    // 근무일 입력 필드 초기값 설정
    const workDateInput = document.getElementById('workDate');
    if (workDateInput) {
        workDateInput.value = getYesterday();
    }
    
    const overtimeInput = document.getElementById('overtimeMinutes');
    if (overtimeInput) {
        overtimeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSalaryAction();
            }
        });
    }
}

// 페이지 로드 시 초기화
window.onload = initializeApp;

// 계약시급 저장
function saveWage() {
    const wage = parseFloat(document.getElementById('hourlyWage').value);
    if (isNaN(wage)) {
        alert('올바른 시급을 입력해주세요.');
        return;
    }
    
    localStorage.setItem(CONSTANTS.STORAGE_KEYS.WAGE, wage);
    displayWage(wage);
    
    // 입력 폼 숨기고 표시 영역 보이기
    document.getElementById('wageInput').style.display = 'none';
    document.getElementById('wageDisplay').style.display = 'block';
}

// 저장된 계약시급 불러오기
function loadWage() {
    const wage = localStorage.getItem(CONSTANTS.STORAGE_KEYS.WAGE);
    if (wage) {
        displayWage(parseFloat(wage));
        document.getElementById('wageInput').style.display = 'none';
        document.getElementById('wageDisplay').style.display = 'block';
    }
}

// 계약시급 표시
function displayWage(wage) {
    document.getElementById('currentWage').textContent = formatNumber(wage);
    document.getElementById('hourlyWage').value = wage;
}

// 계약시급 수정 모드 표시
function showWageInput() {
    document.getElementById('wageInput').style.display = 'block';
    document.getElementById('wageDisplay').style.display = 'none';
}

// 초기화 확인 및 실행 함수 추가
function confirmReset() {
    if (confirm('모든 연장 수당 내역이 삭제됩니다.\n정말 초기화하시겠습니까?')) {
        resetSalaryData();
    }
}

function resetSalaryData() {
    try {
        // 연장 수당 데이터만 초기화 (계약시급은 유지)
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.SALARY_DATA, JSON.stringify([]));
        
        // 화면 갱신
        currentPage = 1;
        displaySalaryList();
        
        // 성공 메시지
        alert('연장 수당 내역이 초기화되었습니다.');
    } catch (e) {
        console.error('초기화 중 오류 발생:', e);
        alert('초기화 중 오류가 발생했습니다.');
    }
} 