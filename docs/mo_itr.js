document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed. Initializing script...");

    const form = document.getElementById('moItrForm');
    console.log('Element #moItrForm:', form);

    const citizenshipSelect = document.getElementById('citizenship');
    console.log('Element #citizenship:', citizenshipSelect);

    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    console.log('Element #passportExpireFieldContainer:', passportExpireFieldContainerDiv);

    const passportExpireInput = document.getElementById('passport_expire');
    console.log('Element #passport_expire:', passportExpireInput);
    
    const cyrNameInputElement = document.getElementById('cyr_name_input');
    console.log('Element #cyr_name_input:', cyrNameInputElement);

    const positionInputElement = document.getElementById('position_input');
    console.log('Element #position_input:', positionInputElement);

    const genderSelect = document.getElementById('gender');
    console.log('Element #gender:', genderSelect);

    const ticketOption1Checkbox = document.getElementById('ticket_option_1');
    console.log('Element #ticket_option_1:', ticketOption1Checkbox);

    const ticketOption2Checkbox = document.getElementById('ticket_option_2');
    console.log('Element #ticket_option_2:', ticketOption2Checkbox);

    const ticketOption3Checkbox = document.getElementById('ticket_option_3');
    console.log('Element #ticket_option_3:', ticketOption3Checkbox);

    const ticketOption4Checkbox = document.getElementById('ticket_option_4');
    console.log('Element #ticket_option_4:', ticketOption4Checkbox);

    if (!form || !citizenshipSelect || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInputElement || 
        !positionInputElement || !genderSelect || !ticketOption1Checkbox || 
        !ticketOption2Checkbox || !ticketOption3Checkbox || !ticketOption4Checkbox) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены. Проверьте HTML ID в вашем файле mo_itr.html и сравните с console.log выше.");
        alert("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены. Проверьте HTML ID. См. консоль разработчика (F12) для деталей.");
        return; 
    }
    console.log("All required elements found successfully.");
    
    function toggleForeignFields() {
        const isForeign = citizenshipSelect.value === 'other';
        passportExpireFieldContainerDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireInput.required = isForeign;
        
        if (!isForeign) {
            passportExpireInput.value = '';
        }
    }

    function performTransliteration(nameToTransliterate) {
        if (typeof transliterateName !== 'function') { 
            console.warn("Функция transliterateName (для транслитерации) не найдена. Проверьте файл /docs/lib/transliterate.js");
            return "Ошибка: транслитерация недоступна";
        }
        try {
            let transliterated = transliterateName(nameToTransliterate);
            return transliterated.split(' ')
                .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                .join(' ');
        } catch (e) {
            console.error("Ошибка автоматической транслитерации:", e);
            return "Ошибка транслитерации";
        }
    }
    
    citizenshipSelect.addEventListener('change', toggleForeignFields);
    toggleForeignFields();

    async function declineWithMorpher(textToDecline) {
        // ... (код функции declineWithMorpher без изменений) ...
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

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ ---");

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
        if (citizenshipSelect.value === 'other' && cyrNameNominative) {
            data.lat_name = performTransliteration(cyrNameNominative);
        }

        data.passport_expire = '';
        if (citizenshipSelect.value === 'other') {
            const passportExpireRaw = passportExpireInput.value; 
            if (passportExpireRaw) {
                try { 
                    let formattedDate = new Date(passportExpireRaw).toLocaleDateString('ru-RU');
                    data.passport_expire = `до ${formattedDate}`;
                } catch (e) { 
                    data.passport_expire = passportExpireRaw; 
                }
            }
        }
        
        const directFields = ['passport_number', 'path', 'phone', 'site', 'gender'];
        directFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        data.mo_to_year = '';
        const dateFields = ['birthday', 'mo_from', 'mo_to', 'work_from']; 
        dateFields.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try { 
                    data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU');
                    if (fieldName === 'mo_to' && data.mo_to) {
                        const yearParts = data.mo_to.split('.');
                        if (yearParts.length === 3) {
                            data.mo_to_year = yearParts[2];
                        }
                    }
                } catch (e) { 
                    data[fieldName] = rawDate; 
                    if (fieldName === 'mo_to') data.mo_to_year = '';
                }
            } else { 
                data[fieldName] = ''; 
                if (fieldName === 'mo_to') data.mo_to_year = '';
            }
        });
        
        if (data.mo_from && data.mo_to) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const moToDate = new Date(formData.get('mo_to'));
                if (!isNaN(moFromDate) && !isNaN(moToDate) && moToDate >= moFromDate) {
                    data.mo_duration = Math.ceil((moToDate - moFromDate) / (1000 * 60 * 60 * 24)) + 1;
                } else { data.mo_duration = "[дат.ош.]"; }
            } catch (e) { data.mo_duration = "[ош.расч.]"; }
        } else { data.mo_duration = ''; }

        data.work_duration = ''; 
        if (data.mo_from && data.work_from) {
            const moFromDateForCalc = new Date(formData.get('mo_from'));
            const workFromDateForCalc = new Date(formData.get('work_from'));
            try {
                if (!isNaN(moFromDateForCalc) && !isNaN(workFromDateForCalc) && moFromDateForCalc >= workFromDateForCalc) {
                    let duration = Math.floor((moFromDateForCalc - workFromDateForCalc) / (1000 * 60 * 60 * 24));
                    data.work_duration = `${duration} д.`;
                } else { data.work_duration = "[дат.ош.]"; }
            } catch (e) { data.work_duration = "[ош.расч.]"; }
        }
        
        data.submissionDate = new Date().toLocaleDateString('ru-RU');

        data.tick_1 = ticketOption1Checkbox.checked ? "🗹" : "□";
        data.tick_2 = ticketOption2Checkbox.checked ? "🗹" : "□";
        data.tick_3 = ticketOption3Checkbox.checked ? "🗹" : "□";
        data.tick_4 = ticketOption4Checkbox.checked ? "🗹" : "□";

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
        // ... (код функции loadAndProcessDocx без изменений, с docxtemplater с большой 'D') ...
        if (typeof PizZip === 'undefined') {
            console.error('Библиотека PizZip не загружена.');
            alert('Ошибка: Библиотека PizZip для генерации документа не найдена.');
            return;
        }
        if (typeof docxtemplater === 'undefined') { 
            console.error('Библиотека docxtemplater не загружена.');
            alert('Ошибка: Библиотека docxtemplater для генерации документа не найдена.');
            return;
        }
        if (typeof saveAs === 'undefined') { 
            console.error('Библиотека FileSaver (saveAs) не загружена.');
            alert('Ошибка: Библиотека FileSaver для сохранения документа не найдена.');
            return;
        }
        if (typeof transliterateName === 'undefined') {
            console.warn('Функция transliterateName не загружена. ФИО на латинице может быть не заполнено или некорректно.');
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
                    doc = new docxtemplater(zip, { 
                        paragraphLoop: true,
                        linebreaks: true,
                        nullGetter: function(part) { 
                            if (part.module === "rawxml") { return "";}
                            return ""; 
                        }
                    });
                } catch (e) {
                    console.error("Ошибка при инициализации docxtemplater:", e);
                    alert("Ошибка подготовки генератора документа.");
                    throw e;
                }

                doc.setData(data);

                try {
                    doc.render();
                } catch (error) {
                    if (error.properties && error.properties.errors) {
                        console.error('Ошибка рендеринга шаблона docxtemplater:', JSON.stringify(error.properties.errors));
                        const unrenderedTag = error.properties.errors[0]?.properties?.part?.value;
                        if (unrenderedTag) {
                             alert(`Ошибка при заполнении шаблона. Возможно, не найден тег: {${unrenderedTag}}.`);
                        } else {
                             alert('Ошибка при заполнении шаблона. Проверьте консоль.');
                        }
                    } else {
                        console.error('Общая ошибка рендеринга docxtemplater:', error);
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
