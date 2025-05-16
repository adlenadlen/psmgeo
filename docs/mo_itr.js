document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoDisplayInput = document.getElementById('lat_name_auto_display'); // Обновлено имя переменной
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    
    // --- Получаем элементы полей ввода ---
    const cyrNameInputElement = document.getElementById('cyr_name_input');
    const positionInputElement = document.getElementById('position_input');
    const genderSelect = document.getElementById('gender'); // Оставляем, если нужен для чего-то еще или для передачи в Morpher API (если API поддерживает)

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
        if (citizenshipSelect.value === 'other' && cyrNameInputElement.value && typeof slug === 'function') {
            try {
                const transliterated = slug(cyrNameInputElement.value.trim(), {
                    locale: 'ru', replacement: ' ', lower: false, remove: /[*+~.()'"!:@]/g 
                });
                latNameAutoDisplayInput.value = transliterated.split(' ')
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '').join(' ');
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
                    else if(errorJson && errorJson.code) errorDetail += ` - Код ошибки: ${errorJson.code}`;
                } catch (e) {
                    const errorTextResponse = await response.text(); // Читаем как текст, если JSON не удался
                    errorDetail += ` - ${errorTextResponse.substring(0,100)}`;
                 }
                throw new Error(`Ошибка Morpher API: ${errorDetail}`);
            }
            const responseData = await response.json();
            console.log(`[declineWithMorpher] JSON ответ от Morpher для "${trimmedText}":`, responseData);
            if (responseData && responseData["Р"]) { // "Р" - родительный падеж
                return responseData["Р"];
            } else {
                console.warn(`[declineWithMorpher] Родительный падеж (Р) НЕ НАЙДЕН для "${trimmedText}". Возвращаем исходный.`);
                return trimmedText;
            }
        } catch (error) {
            console.error(`[declineWithMorpher] Общая ошибка при склонении "${trimmedText}":`, error);
            return trimmedText;
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInputElement.addEventListener('input', updateAutoLatName); // Обновляем имя переменной инпута
    toggleForeignFields();

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (MORPHOR, ЦЕЛЬ: СКЛОНЕННЫЕ В data ДЛЯ DOCX) ---");

        const formData = new FormData(form); // Используем для сбора остальных полей
        const data = {}; // Данные для DOCX шаблона

        // 1. Получаем ИСХОДНЫЕ значения из полей ввода
        let cyrNameNominative = cyrNameInputElement.value.trim();     // ФИО в Именительном падеже
        let positionNominative = positionInputElement.value.trim(); // Должность в Именительном падеже
        // const userSelectedGender = genderSelect.value; // Пока не используем для Morpher, но можно сохранить

        console.log("[SUBMIT] Введено ФИО (И.п.):", `"${cyrNameNominative}"`);
        console.log("[SUBMIT] Введена Должность (И.п.):", `"${positionNominative}"`);
        
        // --- Склонение ФИО в родительный падеж ---
        if (cyrNameNominative) {
            data.cyr_name = await declineWithMorpher(cyrNameNominative); // Результат для плейсхолдера {cyr_name}
            console.log("[SUBMIT] ФИО после Morpher (Р.п.) для шаблона {cyr_name}:", `"${data.cyr_name}"`);
        } else {
            data.cyr_name = ''; 
        }

        // --- Склонение Должности в родительный падеж ---
        let positionNominativeProcessed = ''; // Для передачи в Morpher (с маленькой буквы)
        if (positionNominative && positionNominative.length > 0) {
            positionNominativeProcessed = positionNominative.charAt(0).toLowerCase() + positionNominative.slice(1);
        }
        
        if (positionNominativeProcessed) {
            console.log("[SUBMIT] Должность для склонения (обработанная И.п.):", `"${positionNominativeProcessed}"`);
            data.position = await declineWithMorpher(positionNominativeProcessed); // Результат для плейсхолдера {position}
            console.log("[SUBMIT] Должность после Morpher (Р.п.) для шаблона {position}:", `"${data.position}"`);
        } else {
            data.position = '';
        }
        
        // 3. Данные для иностранного гражданина (плейсхолдер {lat_name})
        data.lat_name = ''; 
        if (citizenshipSelect.value === 'other') {
            // Берем значение из поля, которое обновляется функцией updateAutoLatName
            data.lat_name = latNameAutoDisplayInput.value; 
            console.log("[SUBMIT] ФИО латиницей для шаблона {lat_name}:", `"${data.lat_name}"`);
            
            const passportExpireRaw = passportExpireInput.value; 
            if (passportExpireRaw) {
                try { data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU'); } 
                catch (e) { data.passport_expire = passportExpireRaw; }
            } else {
                data.passport_expire = '';
            }
        } else {
             data.passport_expire = ''; // Убедимся, что пусто для РФ
        }
        
        // Сбор остальных полей, которые НЕ ТРЕБУЮТ специальной обработки перед записью в data
        // и для которых плейсхолдеры в DOCX совпадают с name атрибутами в HTML
        const directFields = ['passport_number', 'path', 'phone', 'site', 'gender']; // gender можно тоже напрямую записать
        directFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        const dateFields = ['birthday', 'mo_from', 'mo_to', 'work_from']; // Имена атрибутов name
        dateFields.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try { data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU'); } 
                catch (e) { data[fieldName] = rawDate; }
            } else { data[fieldName] = ''; }
        });
        
        // Расчеты длительностей
        const moDurationInputVal = formData.get('mo_duration');
        if (moDurationInputVal) { data.mo_duration = moDurationInputVal; } 
        else if (data.mo_from && data.mo_to) { // Используем уже отформатированные даты из data
            try {
                // Для расчета разницы нужны объекты Date, а не строки
                const moFromDate = new Date(formData.get('mo_from')); // Берем из formData для точности расчета
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
        // Имя файла можно формировать из исходного именительного падежа ФИО
        let outputNamePart = cyrNameNominative ? (cyrNameNominative.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });
});

function loadAndProcessDocx(templateUrl, data, outputFilename) { /* ... без изменений ... */ }
// Убедитесь, что функции toggleForeignFields, updateAutoLatName и loadAndProcessDocx полностью скопированы из предыдущих версий.
// И в loadAndProcessDocx проверки на PizZip, docxtemplater, saveAs.
