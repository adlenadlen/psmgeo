document.addEventListener('DOMContentLoaded', function () {
    // ... (код toggleForeignFields, updateAutoLatName, declinePositionToGenitiveMale - без изменений, оставляю их как есть) ...
    // --- Упрощенная функция склонения должностей (мужской род, родительный падеж) ---
    function declinePositionToGenitiveMale(position) {
        if (!position) return '';
        position = position.trim().toLowerCase(); 
        if (position.endsWith('ер') || position.endsWith('ор') || position.endsWith('ель') || position.endsWith('арь')) { return position + 'а'; }
        else if (position.endsWith('ист')) { return position + 'а'; }
        else if (position.endsWith('ик')) { return position.slice(0, -2) + 'ика'; }
        else if (position.endsWith('аг') || position.endsWith('ог')) { return position.slice(0, -2) + 'ога'; }
        else if (position.endsWith('ец')) { return position.slice(0, -2) + 'ца'; }
        console.warn(`Для должности "${position}" не найдено правило склонения. Возвращено исходное.`);
        return position; 
    }

    const form = document.getElementById('moItrForm');
    // ... (остальные const для элементов формы) ...
    const cyrNameInput = document.getElementById('cyr_name');
    const positionInput = document.getElementById('position'); // Добавим для явного получения значения
    const genderSelect = document.getElementById('gender');     // Добавим для явного получения значения


    if (!form || !cyrNameInput || !positionInput || !genderSelect /* ... и другие проверки ... */) {
        console.error("Один из ключевых элементов формы (ФИО, должность, пол) не найден!");
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ ---");

        const formData = new FormData(form);
        const data = {};

        // 1. Получаем значения для ФИО, должности, пола НАПРЯМУЮ из элементов
        // Это чтобы исключить проблемы с formData.get, если они есть
        let cyrNameRawFromElement = cyrNameInput.value.trim();
        let positionRawFromElement = positionInput.value.trim();
        let genderFromElement = genderSelect.value;

        console.log("[ПРОВЕРКА ИЗ ЭЛЕМЕНТОВ] Исходное ФИО:", cyrNameRawFromElement, `(Тип: ${typeof cyrNameRawFromElement})`);
        console.log("[ПРОВЕРКА ИЗ ЭЛЕМЕНТОВ] Исходная должность:", positionRawFromElement, `(Тип: ${typeof positionRawFromElement})`);
        console.log("[ПРОВЕРКА ИЗ ЭЛЕМЕНТОВ] Выбранный пол:", genderFromElement, `(Тип: ${typeof genderFromElement})`);

        // Используем значения, полученные напрямую
        let cyrNameRaw = cyrNameRawFromElement;
        let positionRaw = positionRawFromElement;
        const genderForFIO = genderFromElement; 

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("--- Отладка Petrovich и склонения должности ---");
        console.log("Подготовленное ФИО для обработки:", cyrNameRaw);
        console.log("Подготовленная должность (И.п.) для обработки:", data.position);
        console.log("Подготовленный пол для ФИО:", genderForFIO);

        // Проверка доступности функции petrovich
        if (typeof petrovich !== 'function') {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: Функция petrovich НЕ НАЙДЕНА в глобальной области видимости!");
            alert("Ошибка: Библиотека для склонения ФИО не загружена. Обратитесь к администратору.");
            // Заполняем значения по умолчанию, чтобы не было ошибок дальше
            data.cyr_name_genitive = cyrNameRaw || '';
            data.position_genitive = data.position;
        } else {
            console.log("Функция petrovich найдена и доступна.");

            // Склонение ФИО
            if (cyrNameRaw && genderForFIO) {
                const nameParts = cyrNameRaw.split(/\s+/);
                if (nameParts.length < 2) { // Простая проверка, что есть хотя бы Фамилия и Имя
                    console.warn("ФИО введено не полностью (меньше 2 слов). Качество склонения может быть низким.");
                }
                const personDataForPetrovich = {
                    gender: genderForFIO,
                    first: nameParts[1] || '',
                    last: nameParts[0] || '',
                    middle: nameParts[2] || ''
                };
                // Если есть отчество, можно позволить petrovich определить пол
                // Но мы уже имеем genderForFIO от пользователя, так что передаем его.
                // if (personDataForPetrovich.middle && !genderForFIO) { delete personDataForPetrovich.gender; }
                
                console.log("ОБЪЕКТ ДЛЯ PETROVICH (ФИО):", JSON.stringify(personDataForPetrovich)); // Выводим как строку для точности
                try {
                    const declinedPerson = petrovich(personDataForPetrovich, 'genitive'); 
                    console.log("PETROVICH ВЕРНУЛ (объект ФИО):", JSON.stringify(declinedPerson));
                    
                    data.cyr_name_genitive = [declinedPerson.last, declinedPerson.first, declinedPerson.middle]
                                              .filter(Boolean).join(' ');
                    console.log("РЕЗУЛЬТАТ СКЛОНЕНИЯ (ФИО, родительный, строка):", data.cyr_name_genitive);

                    if (data.cyr_name_genitive.toLowerCase() === cyrNameRaw.toLowerCase() && cyrNameRaw !== "") {
                         console.warn("ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул ФИО без изменений. Проверьте введенные данные и правила библиотеки.");
                    }
                } catch (e) {
                    console.error("ОШИБКА ВНУТРИ PETROVICH при склонении ФИО:", e, "С данными:", personDataForPetrovich);
                    data.cyr_name_genitive = cyrNameRaw;
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
                if (!cyrNameRaw) console.log("ФИО для склонения не предоставлено.");
            }
        }

        // Склонение Должности (используем нашу упрощенную функцию)
        console.log("--- Обработка должности ---");
        if (data.position) {
            console.log("Должность для declinePositionToGenitiveMale:", data.position);
            let declinedPos = declinePositionToGenitiveMale(data.position);
            data.position_genitive = declinedPos;
            console.log("РЕЗУЛЬТАТ СКЛОНЕНИЯ (должность, Р.п. м.р.):", data.position_genitive);
             if (data.position_genitive.toLowerCase() === data.position.toLowerCase() && data.position !== "") {
                 console.warn("ПРЕДУПРЕЖДЕНИЕ: Функция declinePositionToGenitiveMale вернула должность без изменений (или правило не найдено).");
             }
        } else {
            data.position_genitive = '';
            console.log("Должность не предоставлена, склонение не выполняется.");
        }
        console.log("--- Конец отладки ---");

        // ... (остальной код: данные для иностранного гражданина, расчеты длительностей, submissionDate) ...
        // Этот блок я не менял, он был ниже
        // 4. Данные для иностранного гражданина
        data.lat_name = '';
        data.passport_expire = '';
        // Убедитесь, что latNameAutoInput объявлен в начале файла
        const latNameAutoInputValue = latNameAutoInput ? latNameAutoInput.value : '';
        if (formData.get('citizenship') === 'other') {
            data.lat_name = latNameAutoInputValue; // Используем значение из input, которое обновляется динамически
            const passportExpireRaw = formData.get('passport_expire');
            if (passportExpireRaw) {
                try {
                    data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU');
                } catch (e) { data.passport_expire = passportExpireRaw; }
            }
        }

        // 5. Расчеты длительностей
        const moDurationInput = formData.get('mo_duration');
        if (moDurationInput) {
            data.mo_duration = moDurationInput;
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


        console.log("Финальные данные для шаблона:", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = data.cyr_name ? (data.cyr_name.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });

    // Код toggleForeignFields и updateAutoLatName остается здесь (я их убрал из этого блока для краткости, но они должны быть)
    function toggleForeignFields() {
        const isForeign = citizenshipSelect.value === 'other';
        foreignCitizenFieldsDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireFieldContainerDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireInput.required = isForeign;

        if (isForeign) {
            updateAutoLatName();
        } else {
            if (latNameAutoInput) latNameAutoInput.value = ''; // Проверка на null
            if (passportExpireInput) passportExpireInput.value = ''; // Проверка на null
        }
    }

    function updateAutoLatName() {
        if (citizenshipSelect.value === 'other' && cyrNameInput && cyrNameInput.value && typeof slug === 'function') {
            try {
                const transliterated = slug(cyrNameInput.value.trim(), {
                    locale: 'ru',
                    replacement: ' ',
                    lower: false,
                    remove: /[*+~.()'"!:@]/g 
                });
                if (latNameAutoInput) { // Проверка на null
                    latNameAutoInput.value = transliterated
                        .split(' ')
                        .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                        .join(' ');
                }
            } catch (e) {
                console.error("Ошибка автоматической транслитерации:", e);
                if (latNameAutoInput) latNameAutoInput.value = "Ошибка транслитерации";
            }
        } else if (citizenshipSelect.value !== 'other') {
            if (latNameAutoInput) latNameAutoInput.value = ''; // Проверка на null
        }
    }
    // Инициализация
    if (citizenshipSelect) citizenshipSelect.addEventListener('change', toggleForeignFields);
    if (cyrNameInput) cyrNameInput.addEventListener('input', updateAutoLatName);
    if (form) toggleForeignFields(); // Вызываем один раз при загрузке


}); // Конец DOMContentLoaded

// Функция loadAndProcessDocx остается без изменений
function loadAndProcessDocx(templateUrl, data, outputFilename) {
    // ... (код этой функции)
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
