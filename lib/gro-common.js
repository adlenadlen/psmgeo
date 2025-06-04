(function(window){
'use strict';

function formatCoordinate(value){
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(3) : 'N/A';
}

function normalizePointValue(str){
    return (str || '').toLowerCase().replace(/[._,-]/g, '');
}

function parseCSV(csvText){
    const lines = csvText.trim().split(/\r?\n/);
    const records = [];
    for(let i=0;i<lines.length;i++){
        const parts = lines[i].split(',');
        if(parts.length < Object.keys(COL_INDEX).length){
            continue;
        }
        const rec = {id:`gs_${i+1}`, fields:{}};
        for(const key in COL_INDEX){
            rec.fields[key] = (parts[COL_INDEX[key]] || '').trim();
        }
        records.push(rec);
    }
    return records;
}

function convertMskToLocalX(xMsk,yMsk,X0,Y0,K1,K2){
    if(isNaN(xMsk)||isNaN(yMsk)) return NaN;
    return (xMsk-X0)*K1 + (yMsk-Y0)*K2;
}
function convertMskToLocalY(xMsk,yMsk,X0,Y0,K1,K2){
    if(isNaN(xMsk)||isNaN(yMsk)) return NaN;
    return (yMsk-Y0)*K1 - (xMsk-X0)*K2;
}
function convertLocalToMskX(xLocal,yLocal,X0,Y0,K1,K2){
    if(isNaN(xLocal)||isNaN(yLocal)) return NaN;
    return X0 + xLocal*K1 - yLocal*K2;
}
function convertLocalToMskY(xLocal,yLocal,X0,Y0,K1,K2){
    if(isNaN(xLocal)||isNaN(yLocal)) return NaN;
    return Y0 + xLocal*K2 + yLocal*K1;
}

function transformCoordinates(inputX,inputY,sourceLower,targetLower){
    if(isNaN(inputX)||isNaN(inputY)) return {x:NaN,y:NaN};
    if(sourceLower===targetLower) return {x:inputX,y:inputY};
    let xMsk,yMsk;
    switch(sourceLower){
        case 'msk':
            xMsk=inputX; yMsk=inputY; break;
        case 'izp':
            xMsk=convertLocalToMskX(inputX,inputY,X0_SS_IN_MSK,Y0_SS_IN_MSK,K1_SS,K2_SS);
            yMsk=convertLocalToMskY(inputX,inputY,X0_SS_IN_MSK,Y0_SS_IN_MSK,K1_SS,K2_SS);
            break;
        case 'gfu':
            xMsk=convertLocalToMskX(inputX,inputY,X0_GFU_IN_MSK,Y0_GFU_IN_MSK,K1_GFU,K2_GFU);
            yMsk=convertLocalToMskY(inputX,inputY,X0_GFU_IN_MSK,Y0_GFU_IN_MSK,K1_GFU,K2_GFU);
            break;
        default:
            return {x:NaN,y:NaN};
    }
    if(isNaN(xMsk)||isNaN(yMsk)) return {x:NaN,y:NaN};
    switch(targetLower){
        case 'msk':
            return {x:xMsk,y:yMsk};
        case 'izp':
            return {
                x:convertMskToLocalX(xMsk,yMsk,X0_SS_IN_MSK,Y0_SS_IN_MSK,K1_SS,K2_SS),
                y:convertMskToLocalY(xMsk,yMsk,X0_SS_IN_MSK,Y0_SS_IN_MSK,K1_SS,K2_SS)
            };
        case 'gfu':
            return {
                x:convertMskToLocalX(xMsk,yMsk,X0_GFU_IN_MSK,Y0_GFU_IN_MSK,K1_GFU,K2_GFU),
                y:convertMskToLocalY(xMsk,yMsk,X0_GFU_IN_MSK,Y0_GFU_IN_MSK,K1_GFU,K2_GFU)
            };
        default:
            return {x:NaN,y:NaN};
    }
}

function getCoordsInTargetMode(fields,targetLower){
    const x=parseFloat(fields[BASE_X_FIELD_NAME]);
    const y=parseFloat(fields[BASE_Y_FIELD_NAME]);
    const src=(fields['CoordSystem']||'').toLowerCase();
    return transformCoordinates(x,y,src,targetLower);
}

function updateManualConversion(){
    if(!manualCoordXInput||!manualCoordYInput||!manualResultXSpan||!manualResultYSpan){
        return;
    }
    const src=document.querySelector('input[name="manual-source-system"]:checked').value;
    const tgt=document.querySelector('input[name="manual-target-system"]:checked').value;
    const x=parseFloat(manualCoordXInput.value.trim().replace(',','.'));
    const y=parseFloat(manualCoordYInput.value.trim().replace(',','.'));
    if(isNaN(x)||isNaN(y)){
        manualResultXSpan.textContent='---';
        manualResultYSpan.textContent='---';
        return;
    }
    const res=transformCoordinates(x,y,src,tgt);
    manualResultXSpan.textContent=formatCoordinate(res.x);
    manualResultYSpan.textContent=formatCoordinate(res.y);
}

function performSearch(){
    if(isLoading) return;
    const term=searchInput.value.trim();
    const modeEl=document.querySelector('.search-mode-toggle input[name="search-mode"]:checked');
    const ignoreEl=document.querySelector('.ignore-chars-toggle input[name="ignore-mode"]:checked');
    shouldIgnoreChars=ignoreEl?ignoreEl.value==='on':false;
    const mode=modeEl?modeEl.value:'contains';
    if(!term){
        currentDisplayRecords=[];
        displayRecords(currentDisplayRecords);
        return;
    }
    messageState.textContent='Поиск в кэше...';
    messageState.style.display='block';
    messageState.classList.remove('error');
    outputContainer.style.display='none';
    const compare=shouldIgnoreChars?normalizePointValue(term):term.toLowerCase();
    currentDisplayRecords=fullDatabaseCache.filter(r=>{
        const raw=r.fields['Point'];
        if(!raw) return false;
        const val=shouldIgnoreChars?normalizePointValue(raw):raw.toLowerCase();
        return mode==='exact'?val===compare:val.includes(compare);
    });
    displayRecords(currentDisplayRecords);
}

window.groUtils={
    formatCoordinate,
    normalizePointValue,
    parseCSV,
    convertMskToLocalX,
    convertMskToLocalY,
    convertLocalToMskX,
    convertLocalToMskY,
    transformCoordinates,
    getCoordsInTargetMode,
    updateManualConversion,
    performSearch
};
})(window);
