function formatCoordinate(value) {
    if (value === null || typeof value === 'undefined' || isNaN(value)) {
        return 'N/A';
    }
    return parseFloat(value).toFixed(3);
}

function normalizePointValue(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[\._,\-]/g, '');
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    return lines.map((line, index) => {
        const cleanedLine = line.trim();
        if (!cleanedLine) return null;
        const parts = cleanedLine.split(',');
        const record = { id: `gs_${index + 1}`, fields: {} };
        for (const key in COL_INDEX) {
            record.fields[key] = parts[COL_INDEX[key]]?.trim() || '';
        }
        return record;
    }).filter(r => r !== null);
}

function convertMskToLocalX(xMsk, yMsk, X0_Local_IN_MSK, Y0_Local_IN_MSK, K1_Local, K2_Local) {
    if (isNaN(xMsk) || isNaN(yMsk)) return NaN;
    return (xMsk - X0_Local_IN_MSK) * K1_Local + (yMsk - Y0_Local_IN_MSK) * K2_Local;
}

function convertMskToLocalY(xMsk, yMsk, X0_Local_IN_MSK, Y0_Local_IN_MSK, K1_Local, K2_Local) {
    if (isNaN(xMsk) || isNaN(yMsk)) return NaN;
    return (yMsk - Y0_Local_IN_MSK) * K1_Local - (xMsk - X0_Local_IN_MSK) * K2_Local;
}

function convertLocalToMskX(xLocal, yLocal, X0_Local_IN_MSK, Y0_Local_IN_MSK, K1_Local, K2_Local) {
    if (isNaN(xLocal) || isNaN(yLocal)) return NaN;
    return X0_Local_IN_MSK + xLocal * K1_Local - yLocal * K2_Local;
}

function convertLocalToMskY(xLocal, yLocal, X0_Local_IN_MSK, Y0_Local_IN_MSK, K1_Local, K2_Local) {
    if (isNaN(xLocal) || isNaN(yLocal)) return NaN;
    return Y0_Local_IN_MSK + xLocal * K2_Local + yLocal * K1_Local;
}

function transformCoordinates(inputX, inputY, sourceSystemLowercase, targetSystemLowercase) {
    if (isNaN(inputX) || isNaN(inputY)) {
        return { x: NaN, y: NaN };
    }
    if (sourceSystemLowercase === targetSystemLowercase) {
        return { x: inputX, y: inputY };
    }
    let xMsk, yMsk;
    switch (sourceSystemLowercase) {
        case 'msk':
            xMsk = inputX; yMsk = inputY; break;
        case 'izp':
            xMsk = convertLocalToMskX(inputX, inputY, X0_SS_IN_MSK, Y0_SS_IN_MSK, K1_SS, K2_SS);
            yMsk = convertLocalToMskY(inputX, inputY, X0_SS_IN_MSK, Y0_SS_IN_MSK, K1_SS, K2_SS);
            break;
        case 'gfu':
            xMsk = convertLocalToMskX(inputX, inputY, X0_GFU_IN_MSK, Y0_GFU_IN_MSK, K1_GFU, K2_GFU);
            yMsk = convertLocalToMskY(inputX, inputY, X0_GFU_IN_MSK, Y0_GFU_IN_MSK, K1_GFU, K2_GFU);
            break;
        default:
            console.warn(`Transform: Unknown source system '${sourceSystemLowercase}'`);
            return { x: NaN, y: NaN };
    }
    if (isNaN(xMsk) || isNaN(yMsk)) {
        return { x: NaN, y: NaN };
    }
    switch (targetSystemLowercase) {
        case 'msk':
            return { x: xMsk, y: yMsk };
        case 'izp':
            return {
                x: convertMskToLocalX(xMsk, yMsk, X0_SS_IN_MSK, Y0_SS_IN_MSK, K1_SS, K2_SS),
                y: convertMskToLocalY(xMsk, yMsk, X0_SS_IN_MSK, Y0_SS_IN_MSK, K1_SS, K2_SS)
            };
        case 'gfu':
            return {
                x: convertMskToLocalX(xMsk, yMsk, X0_GFU_IN_MSK, Y0_GFU_IN_MSK, K1_GFU, K2_GFU),
                y: convertMskToLocalY(xMsk, yMsk, X0_GFU_IN_MSK, Y0_GFU_IN_MSK, K1_GFU, K2_GFU)
            };
        default:
            console.warn(`Transform: Unknown target system '${targetSystemLowercase}'`);
            return { x: NaN, y: NaN };
    }
}

function getCoordsInTargetMode(recordFields, targetModeLowercase) {
    const xBaseRaw = recordFields[BASE_X_FIELD_NAME];
    const yBaseRaw = recordFields[BASE_Y_FIELD_NAME];
    const sourceSystemUppercase = recordFields['CoordSystem'];
    const xBase = parseFloat(xBaseRaw);
    const yBase = parseFloat(yBaseRaw);
    return transformCoordinates(xBase, yBase, (sourceSystemUppercase || '').toLowerCase(), targetModeLowercase);
}

function updateManualConversion() {
    if (!manualCoordXInput || !manualCoordYInput || !manualResultXSpan || !manualResultYSpan) {
        return;
    }
    const sourceSystem = document.querySelector('input[name="manual-source-system"]:checked').value;
    const targetSystem = document.querySelector('input[name="manual-target-system"]:checked').value;
    const inputXValue = manualCoordXInput.value.trim().replace(',', '.');
    const inputYValue = manualCoordYInput.value.trim().replace(',', '.');
    if (inputXValue === '' || inputYValue === '') {
        manualResultXSpan.textContent = '---';
        manualResultYSpan.textContent = '---';
        return;
    }
    const inputX = parseFloat(inputXValue);
    const inputY = parseFloat(inputYValue);
    const result = transformCoordinates(inputX, inputY, sourceSystem, targetSystem);
    manualResultXSpan.textContent = formatCoordinate(result.x);
    manualResultYSpan.textContent = formatCoordinate(result.y);
}

function performSearch() {
    if (isLoading) return;
    const searchTerm = searchInput.value.trim();
    const searchModeToggle = document.querySelector('.search-mode-toggle input[name="search-mode"]:checked');
    const ignoreCharsToggle = document.querySelector('.ignore-chars-toggle input[name="ignore-mode"]:checked');
    shouldIgnoreChars = ignoreCharsToggle ? ignoreCharsToggle.value === 'on' : false;
    const searchMode = searchModeToggle ? searchModeToggle.value : 'contains';
    if (!searchTerm) {
        currentDisplayRecords = [];
        displayRecords(currentDisplayRecords);
        return;
    }
    messageState.textContent = 'Поиск в кэше...';
    messageState.style.display = 'block';
    messageState.classList.remove('error');
    outputContainer.style.display = 'none';
    const queryForComparison = shouldIgnoreChars ? normalizePointValue(searchTerm) : searchTerm.toLowerCase();
    const filteredRecords = fullDatabaseCache.filter(record => {
        const rawFieldValue = record.fields['Point'];
        if (!rawFieldValue) return false;
        const fieldValueForComparison = shouldIgnoreChars ? normalizePointValue(rawFieldValue) : rawFieldValue.toLowerCase();
        if (searchMode === 'exact') {
            return fieldValueForComparison === queryForComparison;
        }
        return String(fieldValueForComparison).includes(String(queryForComparison));
    });
    currentDisplayRecords = filteredRecords;
    displayRecords(currentDisplayRecords);
}
