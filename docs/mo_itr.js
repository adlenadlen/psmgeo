document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoDisplayInput = document.getElementById('lat_name_auto_display');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    
    const cyrNameInputElement = document.getElementById('cyr_name_input');
    const positionInputElement = document.getElementById('position_input');
    const genderSelect = document.getElementById('gender');

    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoDisplayInput || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInputElement || 
        !positionInputElement || !genderSelect ) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены. Проверьте HTML ID.");
        alert("Ошибка инициализации страницы. Обратитесь к администратору.");
        return; 
    }
    
    function toggleForeignFields() {
        const isForeign = citizenshipSelect.value === 'other';
        foreignCitizenFieldsDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireFieldContainerDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireInput.required = isForeign;
        if (isForeign) {
            updateAutoLatName();
        } else {
            latNameAutoDisplayInput.value = '';
            passportExpireInput.value = '';
        }
    }

    function updateAutoLatName() {
        // Проверяем, загрузилась ли ваша функция transliterateName
        if (typeof transliterateName !== 'function') { 
            console.warn("Функция transliterateName (для транслитерации) не найдена. Проверьте файл /docs/lib/transliterate.js");
            latNameAutoDisplayInput.value = "Ошибка: транслитерация недоступна"; 
            return;
        }
        if (citizenshipSelect.value === 'other' && cyrNameInputElement.value) {
            try {
                const nameToTransliterate = cyrNameInputElement.value.trim();
                let transliterated = transliterateName(nameToTransliterate);
                
                // Приводим каждое слово к формату: ПерваяБукваЗаглавнаяОстальныеСтрочные
                // Ваша функция transliterateName сохраняет регистр или использует тот, что в её карте.
                // Дополнительная обработка ниже гарантирует Title Case.
                latNameAutoDisplayInput.value = transliterated.split(' ')
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                    .join(' ');

            } catch (e) {
                console.error("Ошибка автоматической транслитерации:", e);
                latNameAutoDisplayInput.value = "Ошибка транслитерации";
            }
        } else if (citizenshipSelect.value !== 'other') {
            latNameAutoDisplayInput.value = '';
        }
    }
    
    async function declineWithMorpher(textToDecline) {
        console.log(`[declineWithMorpher] Вызвана для текста: "${textToDecline}"`);
        if (!textToDecline || typeof textToDecline !== 'string' || textToDecline.trim() === '') {
            console.warn(`[declineWithMorpher] Пустой текст для склонения. Возвращаем как есть.`);
            return textToDecline; 
        }
        const trimmedText = textToDecline.trim();
        const encodedText = encodeURIComponent(trimmedText);
        const url = `https://ws3.morpher.ru/russian/declension?s=${encodedText}&format=json`;
        console.log(`[declineWithMorpher] Формируем URL: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                let errorDetail = `Статус: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    if(errorJson && errorJson.message) errorDetail += ` - ${errorJson.message}`;
                    else if(errorJson && errorJson.code) errorDetail += ` - Код ошибки Morpher: ${errorJson.code}`;
                    else errorDetail += ` - Ответ не в формате JSON или не содержит ожидаемых полей ошибки.`;
                } catch (e) { 
                    const errorTextResponse = await response.text(); 
                    errorDetail += ` - ${errorTextResponse.substring(0,150)}`;
                 }
                throw new Error(`Ошибка Morpher API: ${errorDetail}`);
            }
            const responseData = await response.json();
            console.log(`[declineWithMorpher] JSON ответ от Morpher для "${trimmedText}":`, responseData);
            if (responseData && responseData["Р"]) {
                return responseData["Р"];
            } else if (responseData && responseData["code"] === 5) {
                 console.warn(`[declineWithMorpher] Morpher сообщил: "Не найдено русских слов" (код 5) для "${trimmedText}". Возвращаем исходный текст.`);
                 return trimmedText;
            } else if (responseData && responseData["code"] === 1) {
                console.warn(`[declineWithMorpher] Morpher сообщил: "Суточный лимит для IP адреса исчерпан" (код 1) для "${trimmedText}". Возвращаем исходный текст.`);
                alert("Превышен лимит запросов на склонение для вашего IP-адреса на сегодня. Попробуйте позже. Склонение ФИО и должности не будет выполнено.");
                return trimmedText;
            }
            else {
                console.warn(`[declineWithMorpher] Родительный падеж (Р) НЕ НАЙДЕН в ответе для "${trimmedText}". Возвращаем исходный текст.`);
                return trimmedText;
            }
        } catch (error) {
            console.error(`[declineWithMorpher] Общая ошибка при склонении "${trimmedText}":`, error);
            return trimmedText; 
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInputElement.addEventListener('input', updateAutoLatName);
    toggleForeignFields();

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (MORPHOR, ЦЕЛЬ: СКЛОНЕННЫЕ В data ДЛЯ DOCX) ---");

        const formData = new FormData(form);
        const data = {}; 

        let cyrNameNominative = cyrNameInputElement.value.trim();
        let positionNominative = positionInputElement.value.trim();
        
        if (cyrNameNominative) {
            data.cyr_name = await declineWithMorpher(cyrNameNominative);
        } else {
            data.cyr_name = ''; 
        }
        
        let positionNominativeProcessed = ''; 
        if (positionNominative && positionNominative.length > 0) {
            positionNominativeProcessed = positionNominative.charAt(0).toLowerCase() + positionNominative.slice(1);
        }
        
        if (positionNominativeProcessed) {
            data.position = await declineWithMorpher(positionNominativeProcessed); 
        } else if (positionNominative) {
             data.position = await declineWithMorpher(positionNominative);
        } else {
            data.position = '';
        }
        
        data.lat_name = ''; 
        if (citizenshipSelect.value === 'other') {
            data.lat_name = latNameAutoDisplayInput.value; // Уже обработано updateAutoLatName
            const passportExpireRaw = passportExpireInput.value; 
            if (passportExpireRaw) {
                try { data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU'); } 
                catch (e) { data.passport_expire = passportExpireRaw; }
            } else { data.passport_expire = ''; }
        } else {
             data.passport_expire = '';
        }
        
        const directFields = ['passport_number', 'path', 'phone', 'site', 'gender'];
        directFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        const dateFields = ['birthday', 'mo_from', 'mo_to', 'work_from']; 
        dateFields.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try { data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU'); } 
                catch (e) { data[fieldName] = rawDate; }
            } else { data[fieldName] = ''; }
        });
        
        const moDurationInputVal = formData.get('mo_duration');
        if (moDurationInputVal) { data.mo_duration = moDurationInputVal; } 
        else if (data.mo_from && data.mo_to) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const moToDate = new Date(formData.get('mo_to'));
                if (!isNaN(moFromDate) && !isNaN(moToDate) && moToDate >= moFromDate) {
                    data.mo_duration = Math.ceil((moToDate - moFromDate) / (1000 * 60 * 60 * 24)) + 1;
                } else { data.mo_duration = "[дат.ош.]"; }
            } catch (e) { data.mo_duration = "[ош.расч.]"; }
        } else { data.mo_duration = ''; }

        if (data.mo_from && data.work_from) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const workFromDate = new Date(formData.get('work_from'));
                if (!isNaN(moFromDate) && !isNaN(workFromDate) && moFromDate >= workFromDate) {
                    data.work_duration = Math.floor((moFromDate - workFromDate) / (1000 * 60 * 60 * 24));
                } else { data.work_duration = "[дат.ош.]"; }
            } catch (e) { data.work_duration = "[ош.расч.]"; }
        } else { data.work_duration = ''; }
        
        data.submissionDate = new Date().toLocaleDateString('ru-RU');
        console.log("Финальные данные для шаблона DOCX:", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = cyrNameNominative ? (cyrNameNominative.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        if (typeof loadAndProcessDocx === 'function') {
            loadAndProcessDocx(templateUrl, data, outputFilename);
        } else {
            console.error("Функция loadAndProcessDocx не найдена!");
            alert("Критическая ошибка: функция для генерации документа не определена.");
        }
    });

    function loadAndProcessDocx(url, data, fileName) {
        if (typeof PizZip === 'undefined') {
            console.error('Библиотека PizZip не загружена.');
            alert('Ошибка: Библиотека PizZip для генерации документа не найдена.');
            return;
        }
        if (typeof Docxtemplater === 'undefined') {
            console.error('Библиотека Docxtemplater не загружена.');
            alert('Ошибка: Библиотека Docxtemplater для генерации документа не найдена.');
            return;
        }
        if (typeof saveAs === 'undefined') { 
            console.error('Библиотека FileSaver (saveAs) не загружена.');
            alert('Ошибка: Библиотека FileSaver для сохранения документа не найдена.');
            return;
        }
        // Проверяем вашу функцию транслитерации
        if (typeof transliterateName === 'undefined') {
            console.warn('Функция transliterateName не загружена. ФИО на латинице может быть не заполнено или некорректно.');
            // Не прерываем, но предупреждаем
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Не удалось загрузить шаблон DOCX: ${response.status} ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(content => {
                let zip;
                try {
                    zip = new PizZip(content);
                } catch (e) {
                    console.error("Ошибка при инициализации PizZip:", e);
                    alert("Ошибка чтения файла шаблона.");
                    throw e;
                }
                
                let doc;
                try {
                    doc = new Docxtemplater(zip, {
                        paragraphLoop: true,
                        linebreaks: true,
                        nullGetter: function(part) { 
                            if (part.module === "rawxml") { return "";}
                            return ""; 
                        }
                    });
                } catch (e) {
                    console.error("Ошибка при инициализации Docxtemplater:", e);
                    alert("Ошибка подготовки генератора документа.");
                    throw e;
                }

                doc.setData(data);

                try {
                    doc.render();
                } catch (error) {
                    if (error.properties && error.properties.errors) {
                        console.error('Ошибка рендеринга шаблона Docxtemplater:', JSON.stringify(error.properties.errors));
                        const unrenderedTag = error.properties.errors[0]?.properties?.part?.value;
                        if (unrenderedTag) {
                             alert(`Ошибка при заполнении шаблона. Возможно, не найден тег: {${unrenderedTag}}.`);
                        } else {
                             alert('Ошибка при заполнении шаблона. Проверьте консоль.');
                        }
                    } else {
                        console.error('Общая ошибка рендеринга Docxtemplater:', error);
                        alert('Ошибка при заполнении шаблона.');
                    }
                    throw error;
                }

                const out = doc.getZip().generate({
                    type: 'blob',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                });
                saveAs(out, fileName);
            })
            .catch(error => {
                console.error('Общая ошибка в loadAndProcessDocx:', error);
            });
    }
});
