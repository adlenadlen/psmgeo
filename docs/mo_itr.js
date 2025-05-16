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
                    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '') // Обработка пустых слов после split
                    .join(' ');
            } catch (e) {
                console.error("Ошибка автоматической транслитерации:", e);
                latNameAutoInput.value = "Ошибка транслитерации";
            }
        } else if (citizenshipSelect.value !== 'other') {
            latNameAutoInput.value = '';
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInput.addEventListener('input', updateAutoLatName);

    toggleForeignFields(); // Инициализация при загрузке

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
        let positionRaw = formData.get('position').trim();
        const gender = formData.get('gender'); 

        data.cyr_name = cyrNameRaw || '';
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        // Отладка и использование Petrovich
        console.log("--- Отладка Petrovich ---");
        console.log("Исходное ФИО:", cyrNameRaw);
        console.log("Исходная должность:", positionRaw);
        console.log("Выбранный пол:", gender);

        if (typeof Petrovich !== 'undefined') {
            console.log("Библиотека Petrovich найдена.");
            const kasus = Petrovich.CASES; // GENITIVE, DATIVE, ACCUSATIVE, INSTRUMENTAL, PREPOSITIONAL

            // Склонение ФИО
            if (cyrNameRaw && gender) {
                const nameParts = cyrNameRaw.split(/\s+/); // Разделяем по пробелам
                const pConfig = {
                    gender: gender, // 'male' или 'female'
                    firstName: nameParts[1] || '', // Имя
                    lastName: nameParts[0] || '',  // Фамилия
                    middleName: nameParts[2] || '' // Отчество
                };
                console.log("Конфигурация для Petrovich (ФИО):", pConfig);
                try {
                    const petrovichPerson = new Petrovich(pConfig);
                    data.cyr_name_genitive = petrovichPerson.getFullName(kasus.GENITIVE);
                    console.log("Petrovich результат (ФИО, родительный):", data.cyr_name_genitive);
                    if (data.cyr_name_genitive === cyrNameRaw && cyrNameRaw !== "") { // Простая проверка, что что-то изменилось
                        console.warn("Petrovich НЕ склонил ФИО. Проверьте данные и правила библиотеки. Имя:", cyrNameRaw, "Конфиг:", pConfig);
                    }
                } catch (e) {
                    console.error("Ошибка при вызове Petrovich для ФИО:", e, pConfig);
                    data.cyr_name_genitive = cyrNameRaw; // fallback
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
                if (!cyrNameRaw) console.log("ФИО для склонения не предоставлено.");
                if (!gender) console.log("Пол для склонения ФИО не выбран.");
            }

            // Склонение Должности
            // ВНИМАНИЕ: Petrovich-JS 0.2.1 (с CDN jsdelivr) НЕ УМЕЕТ склонять произвольные существительные/должности.
            // Этот блок оставлен как пример, если бы он умел, или если вы подключите другую библиотеку.
            // Сейчас он просто скопирует значение.
            if (positionRaw && gender) {
                 console.log("Попытка обработки должности (Petrovich-JS не склоняет должности):", data.position);
                 // data.position_genitive = data.position; // Просто копируем, т.к. petrovich-js не склоняет должности
                 // Если бы у вас была библиотека, которая склоняет должности, вы бы использовали ее здесь.
                 // Например, если бы petrovich.Job существовал и работал как в старых версиях:
                 // try {
                 //     const job = new Petrovich.Job(data.position, gender); // Примерный вызов, НЕ РАБОТАЕТ с petrovich-js 0.2.1
                 //     data.position_genitive = job.toString(kasus.GENITIVE);
                 //     console.log("Petrovich результат (должность, родительный):", data.position_genitive);
                 // } catch (e) {
                 //     console.error("Ошибка при склонении должности:", e);
                 //     data.position_genitive = data.position;
                 // }
                 data.position_genitive = data.position; // ЗАГЛУШКА
                 if (data.position_genitive === data.position && data.position !== "") {
                     console.warn("Должность НЕ склонена (Petrovich-JS не поддерживает / или используется заглушка). Должность:", data.position);
                 }
            } else {
                data.position_genitive = data.position;
                 if (!positionRaw) console.log("Должность для склонения не предоставлена.");
            }

        } else {
            console.warn("Библиотека Petrovich не найдена или не загружена. Склонение не будет выполнено.");
            data.cyr_name_genitive = cyrNameRaw || '';
            data.position_genitive = data.position;
        }
        console.log("--- Конец отладки Petrovich ---");

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
