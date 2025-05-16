document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');
    const positionInput = document.getElementById('position');
    // genderSelect нам больше не нужен для склонения через Morpher, но может быть нужен для других целей

    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput || 
        !positionInput) { // Убрал genderSelect из этой проверки, т.к. он не критичен для Morpher
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены.");
        alert("Ошибка инициализации страницы. Обратитесь к администратору.");
        return; 
    }
    
    function toggleForeignFields() { /* ... без изменений, как в предыдущей версии ... */ 
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
    function updateAutoLatName() { /* ... без изменений, как в предыдущей версии ... */ 
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
    
    // --- Функция для склонения через Morpher API ---
    async function declineWithMorpher(textToDecline, isFullName = false) {
        if (!textToDecline || textToDecline.trim() === '') {
            return textToDecline; // Возвращаем исходный текст, если он пустой
        }
        // Для ФИО Morpher рекомендует передавать части отдельно, если возможно,
        // или использовать флаг name=true. Но для простоты пока передаем всю строку.
        // Вы можете добавить токен, если зарегистрируетесь: &token=ВАШ_ТОКЕН
        const encodedText = encodeURIComponent(textToDecline.trim());
        const url = `https://ws3.morpher.ru/russian/declension?s=${encodedText}&format=json`;

        console.log(`[Morpher] Запрос для "${textToDecline}": ${url}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                let errorText = `Ошибка Morpher API: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                       errorText += ` - ${errorData.message}`;
                    } else if (errorData && errorData.code) {
                       // Коды ошибок Morpher: https://morpher.ru/ws3/russian/#error-codes
                       // 5 - Превышен лимит на число запросов в сутки.
                       // 6 - Превышен лимит на суммарную длину для операций деления на слоги и прописи чисел и денежных единиц.
                       // 4 - Неверный формат параметра s или слишком много слов в параметре s.
                       // и т.д.
                       errorText += ` (код ${errorData.code})`;
                    }
                } catch (e) { /* не удалось распарсить JSON ошибки */ }
                console.error(errorText);
                // alert(errorText); // Можно показывать пользователю, если нужно
                return textToDecline; // Возвращаем исходный текст в случае ошибки API
            }
            const data = await response.json();
            console.log(`[Morpher] Ответ для "${textToDecline}":`, data);
            if (data && data["Р"]) { // "Р" - ключ для родительного падежа в JSON ответе
                return data["Р"];
            } else {
                console.warn(`[Morpher] Родительный падеж (Р) не найден в ответе для "${textToDecline}". Ответ:`, data);
                return textToDecline; // Возвращаем исходный, если нет нужного падежа
            }
        } catch (error) {
            console.error(`[Morpher] Сетевая ошибка или ошибка парсинга для "${textToDecline}":`, error);
            // alert("Сетевая ошибка при попытке склонения текста.");
            return textToDecline; // Возвращаем исходный текст в случае сетевой ошибки
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);
    toggleForeignFields();

    form.addEventListener('submit', async function (event) { // Делаем обработчик асинхронным
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (С MORPHER API) ---");

        const formData = new FormData(form);
        const data = {};

        let cyrNameRaw = cyrNameInput.value.trim();
        let positionRaw = positionInput.value.trim();
        // const genderForFIO = genderSelect.value; // Пол больше не нужен для Morpher

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("[SUBMIT] Исходное ФИО:", cyrNameRaw);
        console.log("[SUBMIT] Исходная должность (обработанная):", data.position);

        // --- Склонение ФИО с помощью Morpher ---
        if (cyrNameRaw) {
            data.cyr_name_genitive = await declineWithMorpher(cyrNameRaw, true); // true - указываем, что это ФИО
            console.log("[SUBMIT] ФИО после Morpher (Р.п.):", data.cyr_name_genitive);
        } else {
            data.cyr_name_genitive = '';
        }

        // --- Склонение Должности с помощью Morpher ---
        // Morpher должен уметь склонять должности, но они склоняются как обычные фразы.
        // Для должностей мужского рода он должен дать правильный результат.
        if (data.position) {
            data.position_genitive = await declineWithMorpher(data.position);
            console.log("[SUBMIT] Должность после Morpher (Р.п.):", data.position_genitive);
        } else {
            data.position_genitive = '';
        }
        
        // 4. Данные для иностранного гражданина (логика остается)
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

        // 5. Расчеты длительностей (логика остается)
        const moDurationInputVal = formData.get('mo_duration');
        // ... (остальной код расчета длительностей и submissionDate, как в предыдущей версии) ...
        if (moDurationInputVal) {
            data.mo_duration = moDurationInputVal;
        } else if (formData.get('mo_from') && formData.get('mo_to')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const moToDate = new Date(formData.get('mo_to'));
                if (!isNaN(moFromDate) && !isNaN(moToDate) && moToDate >= moFromDate) {
                    const diffTime = moToDate - moFromDate;
                    data.mo_duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                } else { data.mo_duration = "[дат.ош.]"; }
            } catch (e) { data.mo_duration = "[ош.расч.]"; }
        } else { data.mo_duration = ''; }

        if (formData.get('mo_from') && formData.get('work_from')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const workFromDate = new Date(formData.get('work_from'));
                if (!isNaN(moFromDate) && !isNaN(workFromDate) && moFromDate >= workFromDate) {
                    const diffTime = moFromDate - workFromDate;
                    data.work_duration = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                } else { data.work_duration = "[дат.ош.]"; }
            } catch (e) { data.work_duration = "[ош.расч.]"; }
        } else { data.work_duration = ''; }
        
        data.submissionDate = new Date().toLocaleDateString('ru-RU');


        console.log("Финальные данные для шаблона (перед генерацией документа):", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = data.cyr_name ? (data.cyr_name.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename); // Эта функция не меняется
    });
});

// Функция loadAndProcessDocx остается той же, как в предыдущем ответе
function loadAndProcessDocx(templateUrl, data, outputFilename) {
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
