document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoInput = document.getElementById('lat_name_auto');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    const cyrNameInput = document.getElementById('cyr_name');

    // Проверка наличия элементов для предотвращения ошибок
    if (!form || !citizenshipSelect || !foreignCitizenFieldsDiv || !latNameAutoInput || !passportExpireFieldContainerDiv || !passportExpireInput || !cyrNameInput) {
        console.error("Один или несколько обязательных элементов формы не найдены. Проверьте HTML.");
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
                // slug генерирует строки типа 'ivanov-ivan-ivanovich'
                // Нам нужно 'Ivanov Ivan Ivanovich'
                const transliterated = slug(cyrNameInput.value, {
                    locale: 'ru', // Используем русский язык для транслитерации
                    replacement: ' ', // Заменяем разделители на пробел
                    lower: false, // Не переводить в нижний регистр
                    remove: /[*+~.()'"!:@]/g // Удаляем некоторые спецсимволы
                });
                 // Преобразуем первую букву каждого слова в заглавную
                latNameAutoInput.value = transliterated
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
    cyrNameInput.addEventListener('input', updateAutoLatName); // Обновляем транслит при вводе ФИО

    // Инициализация состояния полей при загрузке страницы
    toggleForeignFields();


    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = {};

        // --- Сбор и обработка данных ---

        // 1. Простые текстовые поля
        const simpleFields = ['passport_number', 'path', 'phone', 'site'];
        simpleFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        // 2. Даты (форматируем в dd.mm.yyyy)
        const dateFieldsToFormat = ['birthday', 'mo_from', 'mo_to', 'work_from'];
        dateFieldsToFormat.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try {
                    data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU');
                } catch (e) {
                    data[fieldName] = rawDate;
                }
            } else {
                data[fieldName] = '';
            }
        });
        
        // 3. ФИО и Должность
        let cyrNameRaw = formData.get('cyr_name');
        let positionRaw = formData.get('position');
        const gender = formData.get('gender'); // 'male' или 'female'

        data.cyr_name = cyrNameRaw || '';
        if (positionRaw && positionRaw.length > 0) {
            data.position = positionRaw.charAt(0).toLowerCase() + positionRaw.slice(1);
        } else {
            data.position = '';
        }

        // Склонение с Petrovich-JS (https://github.com/petrovich/petrovich-js)
        // Убедитесь, что глобальная переменная Petrovich доступна из CDN
        if (typeof Petrovich !== 'undefined') {
            const kasus = Petrovich.CASES; // Константы для падежей

            if (cyrNameRaw && gender) {
                const nameParts = cyrNameRaw.trim().split(/\s+/);
                const pConfig = {
                    lastName: nameParts[0] || '',
                    firstName: nameParts[1] || '',
                    middleName: nameParts[2] || '',
                    gender: gender
                };
                try {
                    const petrovichPerson = new Petrovich(pConfig);
                    data.cyr_name_genitive = petrovichPerson.getFullName(kasus.GENITIVE);
                } catch (e) {
                    console.error("Ошибка склонения ФИО (Petrovich):", e, pConfig);
                    data.cyr_name_genitive = cyrNameRaw;
                }
            } else {
                data.cyr_name_genitive = cyrNameRaw || '';
            }

            if (positionRaw && gender) {
                try {
                    // Petrovich-JS не имеет встроенного склонения должностей.
                    // Если вам нужно склонение должностей, потребуется другая библиотека или ручная логика.
                    // Пока оставляем должность в родительном падеже такой же, как в именительном,
                    // или вы можете создать специальный плейсхолдер и заполнить его вручную / по другой логике.
                    // data.position_genitive = data.position; // Просто копируем

                    // Если вы нашли библиотеку для склонения должностей, интегрируйте ее здесь.
                    // Для примера, если бы Petrovich мог:
                    // const petrovichJob = new Petrovich.Job({ name: data.position, gender: gender });
                    // data.position_genitive = petrovichJob.getName(kasus.GENITIVE);
                    // Но текущий petrovich-js этого не умеет.
                    console.warn("Petrovich-JS (0.2.1) не склоняет должности. Плейсхолдер {position_genitive} будет равен {position}.");
                    data.position_genitive = data.position;

                } catch (e) {
                    console.error("Ошибка обработки должности (Petrovich):", e);
                    data.position_genitive = data.position;
                }
            } else {
                data.position_genitive = data.position;
            }
        } else {
            console.warn("Библиотека Petrovich не найдена. Склонение не будет выполнено.");
            data.cyr_name_genitive = cyrNameRaw || '';
            data.position_genitive = data.position;
        }


        // 4. Данные для иностранного гражданина
        data.lat_name = '';
        data.passport_expire = '';
        if (formData.get('citizenship') === 'other') {
            data.lat_name = latNameAutoInput.value; // Берем из автоматически заполненного поля
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

        console.log("Данные для шаблона:", data);

        // --- Генерация документа ---
        const templateUrl = '/docs/templates/mo_itr.docx';
        let outputNamePart = data.cyr_name ? (data.cyr_name.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename);
    });
});

function loadAndProcessDocx(templateUrl, data, outputFilename) {
    // Проверка наличия библиотек перед использованием
    if (typeof PizZip === 'undefined') {
        alert("Ошибка: Библиотека PizZip не загружена. Проверьте CDN ссылки.");
        console.error("PizZip is not defined"); return;
    }
    if (typeof docxtemplater === 'undefined') {
        alert("Ошибка: Библиотека docxtemplater не загружена. Проверьте CDN ссылки.");
        console.error("docxtemplater is not defined"); return;
    }
    if (typeof saveAs === 'undefined') {
        alert("Ошибка: Библиотека FileSaver.js не загружена. Проверьте CDN ссылки.");
        console.error("saveAs is not defined"); return;
    }

    fetch(templateUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка сети при загрузке шаблона: ${response.status} ${response.statusText}`);
            }
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
            saveAs(out, outputFilename);
        })
        .catch(error => {
            console.error('Ошибка загрузки или обработки шаблона:', error);
            alert(`Не удалось загрузить или обработать шаблон: ${error.message}\nПодробности в консоли (F12).`);
        });
}
