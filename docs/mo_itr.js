document.addEventListener('DOMContentLoaded', function () {
    // --- Получение всех необходимых элементов DOM ---
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields'); // Для ФИО латиницей
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer'); // Для срока паспорта
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');
    const positionInput = document.getElementById('position');
    const genderSelect = document.getElementById('gender');

    // --- Проверка наличия всех ключевых элементов ---
    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput || 
        !positionInput || !genderSelect) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены. Проверьте HTML ID элементов и их наличие.");
        alert("Ошибка инициализации страницы. Некоторые элементы формы не найдены. Обратитесь к администратору.");
        return; // Прерываем выполнение, если что-то важное отсутствует
    }
    
    // --- Функция для отображения/скрытия полей иностранного гражданина ---
    function toggleForeignFields() {
        const isForeign = citizenshipSelect.value === 'other';
        
        foreignCitizenFieldsDiv.style.display = isForeign ? 'block' : 'none';
        passportExpireFieldContainerDiv.style.display = isForeign ? 'block' : 'none'; // Показываем/скрываем контейнер срока паспорта
        
        passportExpireInput.required = isForeign;

        if (isForeign) {
            updateAutoLatName(); // Обновляем транслит, если нужно
        } else {
            latNameAutoInput.value = '';
            passportExpireInput.value = ''; // Очищаем поле срока паспорта
        }
    }

    // --- Функция для автоматической транслитерации ---
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

    // --- Привязка обработчиков событий ---
    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);

    // --- Инициализация состояния полей при загрузке страницы ---
    toggleForeignFields(); 

    // --- Обработчик отправки формы ---
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ ---");

        const formData = new FormData(form); // FormData все еще полезна для других полей
        const data = {};

        // Получаем значения для ФИО, должности, пола напрямую, чтобы быть уверенными
        let cyrNameRaw = cyrNameInput.value.trim();
        let positionRaw = positionInput.value.trim();
        const genderForFIO = genderSelect.value; 

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("[ОТПРАВКА ФОРМЫ] Исходное ФИО:", cyrNameRaw);
        console.log("[ОТПРАВКА ФОРМЫ] Исходная должность (обработанная):", data.position);
        console.log("[ОТПРАВКА ФОРМЫ] Выбранный пол для ФИО:", genderForFIO);

        // Проверка доступности функции petrovich
        if (typeof petrovich !== 'function') {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: Функция petrovich НЕ НАЙДЕНА!");
            alert("Ошибка: Библиотека для склонения ФИО не загружена. Генерация невозможна.");
            data.cyr_name_genitive = cyrNameRaw || ''; // fallback
            data.position_genitive = data.position;   // fallback
        } else {
            console.log("Функция petrovich найдена.");

            // Склонение ФИО
            if (cyrNameRaw && genderForFIO) {
                const nameParts = cyrNameRaw.split(/\s+/);
                const personDataForPetrovich = {
                    gender: genderForFIO,
                    first: nameParts[1] || '',
                    last: nameParts[0] || '',
                    middle: nameParts[2] || ''
                };
                if (personDataForPetrovich.middle && !personDataForPetrovich.gender) { // Если пол не указан, но есть отчество
                    // petrovich сам определит пол, можно удалить gender
                    // delete personDataForPetrovich.gender;
                    // Но т.к. у нас genderForFIO всегда есть, это условие можно упростить или убрать
                }
                
                console.log("ОБЪЕКТ ДЛЯ PETROVICH (ФИО):", JSON.stringify(personDataForPetrovich));
                try {
                    const declinedPerson = petrovich(personDataForPetrovich, 'genitive'); 
                    console.log("PETROVICH ВЕРНУЛ (объект ФИО):", JSON.stringify(declinedPerson));
                    
                    data.cyr_name_genitive = [declinedPerson.last, declinedPerson.first, declinedPerson.middle]
                                              .filter(Boolean).join(' ');
                    console.log("РЕЗУЛЬТАТ СКЛОНЕНИЯ (ФИО, родительный, строка):", data.cyr_name_genitive);

                    if (data.cyr_name_genitive.toLowerCase() === cyrNameRaw.toLowerCase() && cyrNameRaw !== "") {
                         console.warn("ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул ФИО без изменений.");
                    }
                } catch (e) {
                    console.error("ОШИБКА ВНУТРИ PETROVICH при склонении ФИО:", e, "\nС данными:", personDataForPetrovich);
                    data.cyr_name_genitive = cyrNameRaw;
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
            }
        }

        // Склонение Должности (используем нашу упрощенную функцию)
        if (data.position) {
            let declinedPos = declinePositionToGenitiveMale(data.position);
            data.position_genitive = declinedPos;
            console.log("РЕЗУЛЬТАТ СКЛОНЕНИЯ (должность, Р.п. м.р.):", data.position_genitive);
             if (data.position_genitive.toLowerCase() === data.position.toLowerCase() && data.position !== "") {
                 console.warn("ПРЕДУПРЕЖДЕНИЕ: declinePositionToGenitiveMale вернула должность без изменений.");
             }
        } else {
            data.position_genitive = '';
        }
        console.log("--- КОНЕЦ ОБРАБОТКИ СКЛОНЕНИЙ ---");

        // Сбор остальных полей из FormData (если они не были обработаны выше)
        // Важно: если имена в formData совпадают с уже созданными ключами в data, они НЕ будут перезаписаны этим циклом,
        // так как мы заполняем data. Но лучше избегать дублирования.
        const otherSimpleFields = ['passport_number', 'path', 'phone', 'site']; // Поля, которые не требуют спец. обработки
        otherSimpleFields.forEach(fieldName => {
            if (!(fieldName in data)) { // Только если еще не добавлено
                 data[fieldName] = formData.get(fieldName) || '';
            }
        });
        
        const dateFieldsToFormat = ['birthday', 'mo_from', 'mo_to', 'work_from'];
        dateFieldsToFormat.forEach(fieldName => {
            if (!(fieldName in data)) { // Только если еще не добавлено
                const rawDate = formData.get(fieldName);
                if (rawDate) {
                    try {
                        data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU');
                    } catch (e) { data[fieldName] = rawDate; }
                } else { data[fieldName] = ''; }
            }
        });


        // 4. Данные для иностранного гражданина
        data.lat_name = ''; // Убедимся, что по умолчанию пусто
        data.passport_expire = ''; // Убедимся, что по умолчанию пусто
        if (citizenshipSelect.value === 'other') { // Проверяем текущее значение селекта
            data.lat_name = latNameAutoInput.value; // Берем актуальное значение
            const passportExpireRaw = passportExpireInput.value; // Берем актуальное значение
            if (passportExpireRaw) {
                try {
                    data.passport_expire = new Date(passportExpireRaw).toLocaleDateString('ru-RU');
                } catch (e) { data.passport_expire = passportExpireRaw; }
            }
        }

        // 5. Расчеты длительностей
        const moDurationInputVal = formData.get('mo_duration'); // Используем formData, т.к. это отдельное поле
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

        console.log("Финальные данные для шаблона:", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = data.cyr_name ? (data.cyr_name.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });
}); // Конец DOMContentLoaded

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
