document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    if (!form) {
        console.error("Форма с ID 'moItrForm' не найдена!");
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = {};

        // --- Сбор и обработка данных ---

        // 1. Простые текстовые поля (имена атрибутов 'name' должны совпадать с ключами для шаблона)
        const simpleFields = [
            'passport_number', 'path', 'phone', 'site' 
            // 'cyr_name', 'position', 'lat_name' - будут обработаны отдельно
        ];
        simpleFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        // 2. Даты (форматируем в dd.mm.yyyy)
        const dateFieldsToFormat = ['birthday', 'passport_expire', 'mo_from', 'mo_to', 'work_from'];
        dateFieldsToFormat.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try {
                    data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU');
                } catch (e) {
                    console.warn(`Не удалось отформатировать дату для поля ${fieldName}: ${rawDate}`, e);
                    data[fieldName] = rawDate; // Оставить как есть, если ошибка
                }
            } else {
                data[fieldName] = ''; // Пустое значение, если дата не указана
            }
        });

        // 3. ФИО и Должность (обработка с Petrovich)
        const cyrNameRaw = formData.get('cyr_name');
        const positionRaw = formData.get('position');
        const gender = formData.get('gender');

        data.cyr_name = cyrNameRaw || ''; // Именительный падеж для {cyr_name}
        data.position = positionRaw || ''; // Именительный падеж для {position}

        if (cyrNameRaw && gender && typeof Petrovich !== 'undefined') {
            const nameParts = cyrNameRaw.split(' ');
            const lastName = nameParts[0] || '';
            const firstName = nameParts[1] || '';
            const middleName = nameParts[2] || '';
            
            try {
                const person = new Petrovich({
                    gender: gender, // Убедитесь, что Petrovich ожидает gender здесь или отдельно
                    first: firstName,
                    last: lastName,
                    middle: middleName
                });
                // Уточните, как ваша версия Petrovich принимает gender. 
                // Если конструктор не принимает gender, его нужно передать в метод toString
                // data.cyr_name_genitive = person.toString('genitive', gender); 
                data.cyr_name_genitive = person.toString('genitive'); // Если конструктор обработал gender
            } catch (e) {
                console.error("Ошибка при склонении ФИО:", e);
                data.cyr_name_genitive = cyrNameRaw; // В случае ошибки - исходное ФИО
            }
        } else {
            data.cyr_name_genitive = cyrNameRaw || '';
        }

        if (positionRaw && gender && typeof Petrovich !== 'undefined' && typeof Petrovich.Job !== 'undefined') {
            try {
                const job = new Petrovich.Job(positionRaw, gender);
                data.position_genitive = job.toString('genitive');
            } catch (e) {
                console.error("Ошибка при склонении должности:", e);
                data.position_genitive = positionRaw; // В случае ошибки - исходная должность
            }
        } else {
            data.position_genitive = positionRaw || '';
        }

        // 4. Транслитерация ФИО
        const latNameInput = formData.get('lat_name_input');
        if (latNameInput) {
            data.lat_name = latNameInput;
        } else if (cyrNameRaw && typeof transliterate === 'function') {
            try {
                data.lat_name = transliterate(cyrNameRaw, { lowercase: false, separator: ' ' }).replace(/-/g, ' ');
            } catch (e) {
                console.error("Ошибка при транслитерации ФИО:", e);
                data.lat_name = '';
            }
        } else {
            data.lat_name = '';
        }

        // 5. Расчеты длительностей
        // Продолжительность МО (mo_duration)
        const moDurationInput = formData.get('mo_duration');
        if (moDurationInput) {
            data.mo_duration = moDurationInput;
        } else if (formData.get('mo_from') && formData.get('mo_to')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const moToDate = new Date(formData.get('mo_to'));
                if (moToDate >= moFromDate) {
                    const diffTime = moToDate - moFromDate;
                    data.mo_duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Включая обе даты
                } else {
                    data.mo_duration = "[дат.ошib.]";
                }
            } catch (e) {
                data.mo_duration = "[ош.расч.]";
            }
        } else {
            data.mo_duration = '';
        }

        // Дней на вахте (work_duration)
        if (formData.get('mo_from') && formData.get('work_from')) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
                const workFromDate = new Date(formData.get('work_from'));
                if (moFromDate >= workFromDate) {
                    const diffTime = moFromDate - workFromDate;
                    data.work_duration = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Полных дней между датами
                } else {
                    data.work_duration = "[дат.ошib.]";
                }
            } catch (e) {
                data.work_duration = "[ош.расч.]";
            }
        } else {
            data.work_duration = '';
        }
        
        // Дата подачи заявления
        data.submissionDate = new Date().toLocaleDateString('ru-RU');

        console.log("Данные для шаблона:", data); // Для отладки

        // --- Генерация документа ---
        const templateUrl = '/docs/templates/mo_itr.docx';
        
        let outputNamePart = "документ";
        if (data.cyr_name) {
            outputNamePart = data.cyr_name.split(' ')[0] || "сотрудника";
        } else if (data.lat_name) { // fallback, если кириллицы нет
            outputNamePart = data.lat_name.split(' ')[0] || "сотрудника";
        }
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });
});

function loadAndProcessDocx(templateUrl, data, outputFilename) {
    fetch(templateUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка сети при загрузке шаблона: ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(content => {
            if (typeof PizZip === 'undefined') throw new Error("PizZip не определен. Проверьте подключение библиотеки.");
            if (typeof docxtemplater === 'undefined') throw new Error("docxtemplater не определен. Проверьте подключение библиотеки.");

            const zip = new PizZip(content);
            const doc = new docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function(part) { // Замена отсутствующих тегов на пустую строку
                    if (part.module === "rawxml") { return ""; }
                    return ""; 
                }
            });

            doc.setData(data);

            try {
                doc.render();
            } catch (error) {
                console.error("Ошибка рендеринга шаблона:", JSON.stringify({
                    message: error.message, name: error.name, stack: error.stack, properties: error.properties,
                }));
                alert(`Ошибка при генерации документа: ${error.message}\nПодробности в консоли (F12).`);
                throw error;
            }

            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            
            if (typeof saveAs === 'undefined') throw new Error("FileSaver.js не определен. Проверьте подключение библиотеки.");
            saveAs(out, outputFilename);
        })
        .catch(error => {
            console.error('Ошибка загрузки или обработки шаблона:', error);
            alert(`Не удалось загрузить или обработать шаблон: ${error.message}\nПодробности в консоли (F12).`);
        });
}
