document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');
    const positionInput = document.getElementById('position');
    const genderSelect = document.getElementById('gender');

    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || 
        !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput || 
        !positionInput || !genderSelect) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены.");
        alert("Ошибка инициализации страницы. Обратитесь к администратору.");
        return; 
    }
    
    function toggleForeignFields() { /* ... без изменений ... */ 
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
    function updateAutoLatName() { /* ... без изменений ... */ 
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
    function declinePositionToGenitiveMale(position) { /* ... без изменений ... */ 
        if (!position) return '';
        position = position.trim().toLowerCase(); 
        if (position.endsWith('ер') || position.endsWith('ор') || position.endsWith('ель') || position.endsWith('арь')) return position + 'а';
        else if (position.endsWith('ист')) return position + 'а';
        else if (position.endsWith('ик')) return position.slice(0, -2) + 'ика';
        else if (position.endsWith('аг') || position.endsWith('ог')) return position.slice(0, -2) + 'ога';
        else if (position.endsWith('ец')) return position.slice(0, -2) + 'ца';
        console.warn(`Для должности "${position}" не найдено правило склонения. Возвращено исходное.`);
        return position; 
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);
    toggleForeignFields();

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (С ДАННЫМИ ИЗ ФОРМЫ) ---");

        const formData = new FormData(form); // Используем для других полей
        const data = {};

        // Получаем значения для ФИО, должности, пола НАПРЯМУЮ из элементов
        let cyrNameRaw = cyrNameInput.value.trim();
        let positionRaw = positionInput.value.trim();
        const genderForFIO = genderSelect.value; 

        console.log("[ИЗ ФОРМЫ] Исходное ФИО (сырое):", `"${cyrNameRaw}"`); // В кавычках, чтобы видеть пробелы
        console.log("[ИЗ ФОРМЫ] Исходная должность (сырая):", `"${positionRaw}"`);
        console.log("[ИЗ ФОРМЫ] Выбранный пол для ФИО:", `"${genderForFIO}"`);

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }
        console.log("[ИЗ ФОРМЫ] Должность (обработанная, И.п.):", `"${data.position}"`);


        if (typeof petrovich !== 'function') {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: Функция petrovich НЕ НАЙДЕНА!");
            alert("Ошибка: Библиотека для склонения ФИО не загружена.");
            data.cyr_name_genitive = cyrNameRaw || '';
            data.position_genitive = data.position; 
        } else {
            console.log("[ИЗ ФОРМЫ] Функция petrovich найдена.");

            // Склонение ФИО
            if (cyrNameRaw && genderForFIO) {
                const nameParts = cyrNameRaw.split(/\s+/).filter(part => part.length > 0); // Разделяем и убираем пустые строки от лишних пробелов
                
                console.log("[ИЗ ФОРМЫ] Разобранные части ФИО (nameParts):", nameParts, `(Количество: ${nameParts.length})`);

                // Проверяем, что у нас есть хотя бы фамилия и имя для склонения
                if (nameParts.length >= 1) { // Минимум 1 слово для попытки (хотя бы фамилия)
                    const personToDecline = {
                        last: nameParts[0] || '',     // Первое слово - Фамилия
                        first: nameParts[1] || '',    // Второе слово - Имя
                        middle: nameParts[2] || '',   // Третье слово (если есть) - Отчество
                        gender: genderForFIO         // Всегда передаем пол, выбранный пользователем
                    };

                    // Дополнительная отладка для случая с одним или двумя словами в ФИО
                    if (nameParts.length === 1) {
                        console.warn("[ИЗ ФОРМЫ] Введено только одно слово в ФИО. Petrovich будет пытаться склонить его как Фамилию (last).");
                        personToDecline.first = ''; // Убедимся, что first и middle пустые, если только одно слово
                        personToDecline.middle = '';
                    } else if (nameParts.length === 2) {
                         console.warn("[ИЗ ФОРМЫ] Введено два слова в ФИО. Petrovich будет пытаться склонить их как Фамилию (last) и Имя (first).");
                         personToDecline.middle = ''; // Убедимся, что middle пустое
                    }
                    
                    console.log("[ИЗ ФОРМЫ] ОБЪЕКТ ДЛЯ PETROVICH (ФИО):", JSON.stringify(personToDecline));
                    try {
                        const declinedPersonObject = petrovich(personToDecline, 'genitive'); 
                        console.log("[ИЗ ФОРМЫ] PETROVICH ВЕРНУЛ (объект ФИО):", JSON.stringify(declinedPersonObject));
                        
                        data.cyr_name_genitive = [
                            declinedPersonObject.last, 
                            declinedPersonObject.first, 
                            declinedPersonObject.middle
                        ].filter(Boolean).join(' ');

                        console.log("[ИЗ ФОРМЫ] РЕЗУЛЬТАТ СКЛОНЕНИЯ (ФИО, родительный, строка):", `"${data.cyr_name_genitive}"`);

                        if (data.cyr_name_genitive.toLowerCase() === cyrNameRaw.toLowerCase() && cyrNameRaw !== "") {
                             console.warn("[ИЗ ФОРМЫ] ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул ФИО без изменений.");
                        } else if (data.cyr_name_genitive && data.cyr_name_genitive !== cyrNameRaw) { // Добавил проверку, что не пусто и не равно исходному
                             console.log("[ИЗ ФОРМЫ] ИНФО: Склонение ФИО прошло успешно!");
                        } else if (!data.cyr_name_genitive && cyrNameRaw) {
                             console.warn("[ИЗ ФОРМЫ] ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул пустой результат для ФИО.");
                        }


                    } catch (e) {
                        console.error("[ИЗ ФОРМЫ] ОШИБКА ВНУТРИ PETROVICH при склонении ФИО:", e, "\nС данными:", personToDecline);
                        data.cyr_name_genitive = cyrNameRaw; 
                    }
                } else { // Если cyrNameRaw не пустой, но nameParts пустой (например, ввели одни пробелы)
                    console.warn("[ИЗ ФОРМЫ] ФИО состоит из пробелов или не удалось разобрать на части. Склонение не выполняется.");
                    data.cyr_name_genitive = cyrNameRaw || '';
                }
            } else { // Если cyrNameRaw или genderForFIO пустые
                data.cyr_name_genitive = cyrNameRaw || '';
                if (!cyrNameRaw) console.log("[ИЗ ФОРМЫ] ФИО для склонения не предоставлено.");
                // genderForFIO всегда будет, т.к. select имеет default
            }
        }

        // Склонение Должности
        if (data.position) {
            data.position_genitive = declinePositionToGenitiveMale(data.position);
            console.log("[ИЗ ФОРМЫ] РЕЗУЛЬТАТ СКЛОНЕНИЯ (должность, Р.п. м.р.):", `"${data.position_genitive}"`);
        } else {
            data.position_genitive = '';
        }
        
        // ... (остальной код: сбор других полей formData, данные для иностранного гражданина, расчеты длительностей, submissionDate, генерация документа) ...
        // Этот код я не менял, он должен быть ниже
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
        // 5. Расчеты длительностей и submissionDate
        const otherSimpleFields = ['passport_number', 'path', 'phone', 'site'];
        otherSimpleFields.forEach(fieldName => {
            if (!(fieldName in data)) { data[fieldName] = formData.get(fieldName) || ''; }
        });
        const formDateFields = ['birthday', 'mo_from', 'mo_to', 'work_from']; // Переименовал, чтобы не конфликтовать
        formDateFields.forEach(fieldName => {
            if (!(fieldName in data)) {
                const rawDate = formData.get(fieldName);
                if (rawDate) {
                    try { data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU'); } 
                    catch (e) { data[fieldName] = rawDate; }
                } else { data[fieldName] = ''; }
            }
        });
        const moDurationInputVal = formData.get('mo_duration');
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
