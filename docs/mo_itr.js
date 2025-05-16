document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');
    const positionInput = document.getElementById('position');
    // genderSelect не используется для Morpher

    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput || 
        !positionInput) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены.");
        alert("Ошибка инициализации страницы. Обратитесь к администратору.");
        return; 
    }
    
    function toggleForeignFields() { /* ... как раньше ... */ 
        const isForeign = citizenshipSelect.value === 'other';
        foreignCitizenFieldsDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireFieldContainerDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireInput.required = isForeign;
        if (isForeign) updateAutoLatName();
        else {
            latNameAutoInput.value = '';
            passportExpireInput.value = '';
        }
    }
    function updateAutoLatName() { /* ... как раньше ... */ 
        if (citizenshipSelect.value === 'other' && cyrNameInput.value && typeof slug === 'function') {
            try {
                const transliterated = slug(cyrNameInput.value.trim(), {
                    locale: 'ru', replacement: ' ', lower: false, remove: /[*+~.()'"!:@]/g 
                });
                latNameAutoInput.value = transliterated.split(' ')
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '').join(' ');
            } catch (e) {
                console.error("Ошибка автоматической транслитерации:", e);
                latNameAutoInput.value = "Ошибка транслитерации";
            }
        } else if (citizenshipSelect.value !== 'other') {
            latNameAutoInput.value = '';
        }
    }
    
    async function declineWithMorpher(textToDecline) {
        console.log(`[declineWithMorpher] Вызвана для текста: "${textToDecline}" (тип: ${typeof textToDecline})`);
        if (!textToDecline || typeof textToDecline !== 'string' || textToDecline.trim() === '') {
            console.warn(`[declineWithMorpher] Пустой или некорректный текст для склонения: "${textToDecline}". Возвращаем как есть.`);
            return textToDecline; 
        }

        const trimmedText = textToDecline.trim();
        const encodedText = encodeURIComponent(trimmedText);
        // Добавьте &token=ВАШ_ТОКЕН если он у вас есть
        const url = `https://ws3.morpher.ru/russian/declension?s=${encodedText}&format=json`;

        console.log(`[declineWithMorpher] Формируем URL: ${url}`);

        try {
            const response = await fetch(url);
            console.log(`[declineWithMorpher] Ответ от fetch для "${trimmedText}":`, response);

            if (!response.ok) {
                let errorDetail = `Статус: ${response.status}`;
                try {
                    const errorJson = await response.json(); // Попытка прочитать тело ошибки как JSON
                    console.error(`[declineWithMorpher] Ошибка API Morpher (JSON):`, errorJson);
                    if(errorJson && errorJson.message) errorDetail += ` - ${errorJson.message}`;
                    else if(errorJson && errorJson.code) errorDetail += ` - Код ошибки: ${errorJson.code}`;
                } catch (e) {
                    // Если тело ответа не JSON, читаем как текст
                    const errorText = await response.text();
                    console.error(`[declineWithMorpher] Ошибка API Morpher (текст):`, errorText);
                    errorDetail += ` - ${errorText.substring(0, 100)}`; // Первые 100 символов ошибки
                }
                throw new Error(`Ошибка Morpher API: ${errorDetail}`);
            }

            const responseData = await response.json();
            console.log(`[declineWithMorpher] JSON ответ от Morpher для "${trimmedText}":`, responseData);

            if (responseData && responseData["Р"]) {
                console.log(`[declineWithMorpher] Родительный падеж (Р) НАЙДЕН для "${trimmedText}": "${responseData["Р"]}"`);
                return responseData["Р"];
            } else {
                console.warn(`[declineWithMorpher] Родительный падеж (Р) НЕ НАЙДЕН в ответе для "${trimmedText}". Ответ:`, responseData);
                return trimmedText; // Возвращаем исходный, если нет нужного падежа
            }
        } catch (error) {
            console.error(`[declineWithMorpher] Общая ошибка при склонении "${trimmedText}":`, error);
            return trimmedText; // Возвращаем исходный текст в случае ошибки
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);
    toggleForeignFields();

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (С MORPHER API) ---");

        const formData = new FormData(form);
        const data = {};

        let cyrNameRaw = cyrNameInput.value.trim();
        let positionRaw = positionInput.value.trim();

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("[SUBMIT] Исходное ФИО для склонения:", `"${cyrNameRaw}"`);
        console.log("[SUBMIT] Исходная должность для склонения (обработанная):", `"${data.position}"`);

        // --- Склонение ФИО с помощью Morpher ---
        console.log("[SUBMIT] --- Начинаем склонение ФИО через Morpher ---");
        if (cyrNameRaw) {
            data.cyr_name_genitive = await declineWithMorpher(cyrNameRaw);
        } else {
            data.cyr_name_genitive = '';
        }
        console.log("[SUBMIT] ФИО после Morpher (Р.п.) записано в data:", `"${data.cyr_name_genitive}"`);

        // --- Склонение Должности с помощью Morpher ---
        console.log("[SUBMIT] --- Начинаем склонение Должности через Morpher ---");
        if (data.position) {
            data.position_genitive = await declineWithMorpher(data.position);
        } else {
            data.position_genitive = '';
        }
        console.log("[SUBMIT] Должность после Morpher (Р.п.) записана в data:", `"${data.position_genitive}"`);
        
        // 4. Данные для иностранного гражданина
        data.lat_name = ''; 
        data.passport_expire = ''; 
        if (citizenshipSelect.value === 'other') {
            data.lat_name = latNameAutoInput.value; 
            const passportExpireRaw = passportExpireInput.value; 
            if (passportExpireRaw) {
                try { data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU'); } 
                catch (e) { data.passport_expire = passportExpireRaw; }
            }
        }

        // Сбор остальных полей
        const otherSimpleFields = ['passport_number', 'path', 'phone', 'site'];
        otherSimpleFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });
        const formDateFields = ['birthday', 'mo_from', 'mo_to', 'work_from'];
        formDateFields.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try { data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU'); } 
                catch (e) { data[fieldName] = rawDate; }
            } else { data[fieldName] = ''; }
        });
        
        // 5. Расчеты длительностей
        const moDurationInputVal = formData.get('mo_duration');
        if (moDurationInputVal) { data.mo_duration = moDurationInputVal; } 
        else if (formData.get('mo_from') && formData.get('mo_to')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const moToDate = new Date(formData.get('mo_to'));
                if (!isNaN(moFromDate) && !isNaN(moToDate) && moToDate >= moFromDate) {
                    data.mo_duration = Math.ceil((moToDate - moFromDate) / (1000 * 60 * 60 * 24)) + 1;
                } else { data.mo_duration = "[дат.ош.]"; }
            } catch (e) { data.mo_duration = "[ош.расч.]"; }
        } else { data.mo_duration = ''; }

        if (formData.get('mo_from') && formData.get('work_from')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const workFromDate = new Date(formData.get('work_from'));
                if (!isNaN(moFromDate) && !isNaN(workFromDate) && moFromDate >= workFromDate) {
                    data.work_duration = Math.floor((moFromDate - workFromDate) / (1000 * 60 * 60 * 24));
                } else { data.work_duration = "[дат.ош.]"; }
            } catch (e) { data.work_duration = "[ош.расч.]"; }
        } else { data.work_duration = ''; }
        
        data.submissionDate = new Date().toLocaleDateString('ru-RU');

        console.log("Финальные данные для шаблона (перед генерацией документа):", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = data.cyr_name ? (data.cyr_name.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });
});

function loadAndProcessDocx(templateUrl, data, outputFilename) { /* ... без изменений ... */ 
    if (typeof PizZip === 'undefined') {
        alert("Ошибка: Библиотека PizZip не загружена."); console.error("PizZip is not defined"); return;
    }
    if (typeof docxtemplater === 'undefined') {
        alert("Ошибка: Библиотека docxtemplater не загружена."); console.error("docxtemplater is not defined"); return;
    }
    if (typeof saveAs === 'undefined') {
        alert("Ошибка: Библиотека FileSaver.js не загружена."); console.error("saveAs is not defined"); return;
    }

    fetch(templateUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Ошибка сети при загрузке шаблона: ${response.status} ${response.statusText}`);
            return response.arrayBuffer();
        })
        .then(content => {
            const zip = new PizZip(content);
            const doc = new docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function() { return ""; }
            });
            doc.setData(data);
            try {
                doc.render();
            } catch (error) {
                console.error("Ошибка рендеринга Docxtemplater:", error.message, error.stack, error.properties);
                alert(`Ошибка при генерации документа: ${error.message}\nПодробности в консоли (F12).`);
                throw error;
            }
            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            saveAs(out, outputFilename);
        })
        .catch(error => {
            console.error('Общая ошибка в loadAndProcessDocx:', error);
            alert(`Не удалось загрузить или обработать шаблон: ${error.message}\nПодробности в консоли (F12).`);
        });
}
