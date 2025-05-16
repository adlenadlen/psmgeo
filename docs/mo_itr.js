document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');

    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput) {
        console.error("Один или несколько обязательных элементов формы не найдены. Проверьте HTML.");
        alert("Ошибка инициализации формы. Обратитесь к администратору.");
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
            latNameAutoInput.value = '';
            passportExpireInput.value = '';
        }
    }

    function updateAutoLatName() {
        if (citizenshipSelect.value === 'other' && cyrNameInput.value && typeof slug === 'function') {
            try {
                const transliterated = slug(cyrNameInput.value.trim(), {
                    locale: 'ru',
                    replacement: ' ',
                    lower: false,
                    remove: /[*+~.()'"!:@]/g 
                });
                latNameAutoInput.value = transliterated
                    .split(' ')
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
                    .join(' ');
            } catch (e) {
                console.error("Ошибка автоматической транслитерации:", e);
                latNameAutoInput.value = "Ошибка транслитерации";
            }
        } else if (citizenshipSelect.value !== 'other') {
            latNameAutoInput.value = '';
        }
    }

    // --- Упрощенная функция склонения должностей (мужской род, родительный падеж) ---
    // ЭТУ ФУНКЦИЮ НУЖНО РАСШИРЯТЬ И УЛУЧШАТЬ!
    function declinePositionToGenitiveMale(position) {
        if (!position) return '';
        position = position.trim().toLowerCase(); // Приводим к нижнему регистру для сравнения

        // Простые правила для примера. Нужна более сложная логика или библиотека.
        if (position.endsWith('ер') || position.endsWith('ор') || position.endsWith('ель') || position.endsWith('арь')) { // инженер, директор, учитель, секретарь
            return position + 'а';
        } else if (position.endsWith('ист')) { // программист, экономист
            return position + 'а';
        } else if (position.endsWith('ик')) { // механик, техник
             return position.slice(0, -2) + 'ика';
        } else if (position.endsWith('аг') || position.endsWith('ог')) { // педагог
             return position.slice(0, -2) + 'ога';
        } else if (position.endsWith('ец')) { // продавец
            return position.slice(0, -2) + 'ца';
        }
        // ... другие правила ...

        // Если нет правила, возвращаем исходную (или добавляем 'а' как очень грубое приближение)
        console.warn(`Для должности "${position}" не найдено точное правило склонения в родительный падеж (м.р.). Возвращено исходное или примерное.`);
        // Можно вернуть position + 'а' как очень грубое предположение для многих сущ. м.р. на согл.
        // Но лучше вернуть исходное, если нет уверенности.
        return position; // Или более умное правило по умолчанию
    }


    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);

    toggleForeignFields();

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = {};

        // 1. Простые текстовые поля
        const simpleFields = ['passport_number', 'path', 'phone', 'site'];
        simpleFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        // 2. Даты
        const dateFieldsToFormat = ['birthday', 'mo_from', 'mo_to', 'work_from'];
        dateFieldsToFormat.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try {
                    data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU');
                } catch (e) { data[fieldName] = rawDate; }
            } else { data[fieldName] = ''; }
        });
        
        // 3. ФИО и Должность
        let cyrNameRaw = formData.get('cyr_name').trim();
        let positionRaw = formData.get('position').trim(); // Получаем должность как есть
        const genderForFIO = formData.get('gender'); // Пол для склонения ФИО

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            // Сохраняем должность в именительном падеже, но с маленькой буквы
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("--- Отладка Petrovich и склонения должности ---");
        console.log("Исходное ФИО:", cyrNameRaw);
        console.log("Должность (И.п., обработанная):", data.position);
        console.log("Выбранный пол для ФИО:", genderForFIO);

        // Склонение ФИО с помощью Petrovich
        if (typeof petrovich === 'function') {
            console.log("Функция petrovich найдена.");
            if (cyrNameRaw && genderForFIO) {
                const nameParts = cyrNameRaw.split(/\s+/);
                const personDataForPetrovich = {
                    gender: genderForFIO,
                    first: nameParts[1] || '',
                    last: nameParts[0] || '',
                    middle: nameParts[2] || ''
                };
                if (personDataForPetrovich.middle && !genderForFIO) { // Если пол не был выбран, но есть отчество
                     delete personDataForPetrovich.gender;
                }
                console.log("Данные для petrovich(ФИО):", personDataForPetrovich);
                try {
                    const declinedPerson = petrovich(personDataForPetrovich, 'genitive'); 
                    console.log("Petrovich результат (объект ФИО):", declinedPerson);
                    data.cyr_name_genitive = [declinedPerson.last, declinedPerson.first, declinedPerson.middle]
                                              .filter(Boolean).join(' ');
                    console.log("Petrovich результат (ФИО, родительный, строка):", data.cyr_name_genitive);
                    if (data.cyr_name_genitive.toLowerCase() === cyrNameRaw.toLowerCase() && cyrNameRaw !== "") {
                         console.warn("Petrovich возможно НЕ склонил ФИО. Имя:", cyrNameRaw, "Результат:", data.cyr_name_genitive);
                    }
                } catch (e) {
                    console.error("Ошибка при вызове petrovich для ФИО:", e, personDataForPetrovich);
                    data.cyr_name_genitive = cyrNameRaw;
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
            }
        } else {
            console.warn("Функция petrovich не найдена. Склонение ФИО не будет выполнено.");
            data.cyr_name_genitive = cyrNameRaw || '';
        }

        // Склонение Должности (используем нашу упрощенную функцию)
        if (data.position) {
            let declinedPos = declinePositionToGenitiveMale(data.position);
            // Возвращаем первую букву в тот регистр, который был у исходной первой буквы data.position
            // (т.к. data.position уже с маленькой первой, то и результат будет с маленькой)
            // Если нужно, чтобы первая буква была заглавной в шаблоне, это делается в шаблоне или тут:
            // declinedPos = declinedPos.charAt(0).toUpperCase() + declinedPos.slice(1);
            data.position_genitive = declinedPos;
            console.log("Должность (Р.п., мужской род, результат declinePositionToGenitiveMale):", data.position_genitive);
        } else {
            data.position_genitive = '';
        }
        console.log("--- Конец отладки ---");

        // 4. Данные для иностранного гражданина
        data.lat_name = '';
        data.passport_expire = '';
        if (formData.get('citizenship') === 'other') {
            data.lat_name = latNameAutoInput.value;
            const passportExpireRaw = formData.get('passport_expire');
            if (passportExpireRaw) {
                try {
                    data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU');
                } catch (e) { data.passport_expire = passportExpireRaw; }
            }
        }

        // 5. Расчеты длительностей (оставил без изменений, т.к. они не затрагивались)
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
});

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
