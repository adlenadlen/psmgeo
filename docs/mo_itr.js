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
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Один или несколько обязательных элементов формы не найдены. Проверьте HTML ID элементов и их наличие.");
        alert("Ошибка инициализации страницы. Некоторые элементы формы не найдены. Обратитесь к администратору.");
        return; 
    }
    
    function toggleForeignFields() {
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

    function updateAutoLatName() {
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

    function declinePositionToGenitiveMale(position) {
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
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ ---");

        const formData = new FormData(form);
        const data = {};

        let cyrNameRaw = cyrNameInput.value.trim();
        let positionRaw = positionInput.value.trim();
        const genderForFIO = genderSelect.value; 

        data.cyr_name = cyrNameRaw || ''; 
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        console.log("[SUBMIT] Исходное ФИО:", cyrNameRaw);
        console.log("[SUBMIT] Исходная должность (обработанная):", data.position);
        console.log("[SUBMIT] Выбранный пол для ФИО:", genderForFIO);

        if (typeof petrovich === 'function') {
            console.log("[SUBMIT] Функция petrovich найдена.");

            if (cyrNameRaw && genderForFIO) {
                const nameParts = cyrNameRaw.split(/\s+/); // Разделяем ФИО на части по пробелам
                
                // Формируем объект для Petrovich, как в успешном консольном тесте
                const personToDecline = {
                    last: nameParts[0] || '',     // Первое слово - Фамилия
                    first: nameParts[1] || '',    // Второе слово - Имя
                    middle: nameParts[2] || '',   // Третье слово (если есть) - Отчество
                    // gender: genderForFIO      // По умолчанию используем пол, если отчества нет или для точности
                };

                // Согласно документации petrovich-js, если есть отчество, пол можно не указывать.
                // Если отчества нет, пол ОБЯЗАТЕЛЕН.
                // Так как у нас всегда есть genderForFIO от пользователя, мы его передадим.
                // Если бы мы хотели, чтобы petrovich сам определял пол по отчеству (если оно есть),
                // то мы бы удалили gender из personToDecline, если middle заполнено.
                // Но явное указание пола от пользователя надежнее.
                if (personToDecline.middle) { // Если есть отчество
                    personToDecline.gender = genderForFIO; // Используем выбранный пол
                } else { // Если нет отчества, пол обязателен
                    personToDecline.gender = genderForFIO;
                }


                console.log("[SUBMIT] ОБЪЕКТ ДЛЯ PETROVICH (ФИО):", JSON.stringify(personToDecline));
                try {
                    const declinedPersonObject = petrovich(personToDecline, 'genitive'); 
                    console.log("[SUBMIT] PETROVICH ВЕРНУЛ (объект ФИО):", JSON.stringify(declinedPersonObject));
                    
                    data.cyr_name_genitive = [
                        declinedPersonObject.last, 
                        declinedPersonObject.first, 
                        declinedPersonObject.middle
                    ].filter(Boolean).join(' '); // Собираем строку, убирая пустые части

                    console.log("[SUBMIT] РЕЗУЛЬТАТ СКЛОНЕНИЯ (ФИО, родительный, строка):", data.cyr_name_genitive);

                    if (data.cyr_name_genitive.toLowerCase() === cyrNameRaw.toLowerCase() && cyrNameRaw !== "") {
                         console.warn("[SUBMIT] ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул ФИО без изменений.");
                    } else if (data.cyr_name_genitive) {
                         console.log("[SUBMIT] ИНФО: Склонение ФИО прошло успешно!");
                    }
                } catch (e) {
                    console.error("[SUBMIT] ОШИБКА ВНУТРИ PETROVICH при склонении ФИО:", e, "\nС данными:", personToDecline);
                    data.cyr_name_genitive = cyrNameRaw; // Fallback
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
                if (!cyrNameRaw) console.log("[SUBMIT] ФИО для склонения не предоставлено.");
            }
        } else {
            console.error("[SUBMIT] КРИТИЧЕСКАЯ ОШИБКА: Функция petrovich НЕ НАЙДЕНА!");
            alert("Ошибка: Библиотека для склонения ФИО не загружена. Генерация невозможна.");
            data.cyr_name_genitive = cyrNameRaw || ''; 
            // data.position_genitive останется data.position, так как он определяется ниже
        }

        // Склонение Должности (используем нашу упрощенную функцию)
        if (data.position) {
            data.position_genitive = declinePositionToGenitiveMale(data.position);
            console.log("[SUBMIT] РЕЗУЛЬТАТ СКЛОНЕНИЯ (должность, Р.п. м.р.):", data.position_genitive);
        } else {
            data.position_genitive = '';
        }

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

        // 5. Расчеты длительностей
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
