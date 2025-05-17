document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    const citizenshipSelect = document.getElementById('citizenship');
    const foreignCitizenFieldsDiv = document.getElementById('foreignCitizenFields');
    const latNameAutoDisplayInput = document.getElementById('lat_name_auto_display');
    const passportExpireFieldContainerDiv = document.getElementById('passportExpireFieldContainer');
    const passportExpireInput = document.getElementById('passport_expire');
    
    const cyrNameInputElement = document.getElementById('cyr_name_input');
    const positionInputElement = document.getElementById('position_input');
    const genderSelect = document.getElementById('gender');

    // Ваш токен для Morpher API
    const morpherToken = '24ca96b8-fd93-4871-a913-18a8ee8cc17f';

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
        // Обновленный URL с токеном и указанием формата JSON
        const url = `https://ws3.morpher.ru/russian/declension?s=${encodedText}&token=${morpherToken}&format=json`;
        console.log(`[declineWithMorpher] Формируем URL: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                let errorDetail = `Статус: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    if(errorJson && errorJson.message) errorDetail += ` - ${errorJson.message}`; // Сообщение об ошибке от Morpher
                    else if(errorJson && errorJson.code) errorDetail += ` - Код ошибки Morpher: ${errorJson.code}`; // Код ошибки от Morpher
                    else errorDetail += ` - Ответ не в формате JSON или не содержит ожидаемых полей ошибки.`;
                } catch (e) { // Если ответ не JSON
                    const errorTextResponse = await response.text(); 
                    errorDetail += ` - ${errorTextResponse.substring(0,150)}`; // Показать часть текстового ответа
                 }
                throw new Error(`Ошибка Morpher API: ${errorDetail}`);
            }
            const responseData = await response.json();
            console.log(`[declineWithMorpher] JSON ответ от Morpher для "${trimmedText}":`, responseData);
            if (responseData && responseData["Р"]) { // "Р" - родительный падеж
                return responseData["Р"];
            } else if (responseData && responseData["code"] === 5) { // Код 5 - Не найдено русских слов.
                 console.warn(`[declineWithMorpher] Morpher сообщил: "Не найдено русских слов" (код 5) для "${trimmedText}". Возвращаем исходный текст.`);
                 return trimmedText;
            }
            else {
                console.warn(`[declineWithMorpher] Родительный падеж (Р) НЕ НАЙДЕН в ответе для "${trimmedText}". Проверьте структуру ответа. Возвращаем исходный текст.`);
                return trimmedText; // Возвращаем исходный текст, если нужный падеж не найден
            }
        } catch (error) {
            console.error(`[declineWithMorpher] Общая ошибка при склонении "${trimmedText}":`, error);
            // В случае любой ошибки (сетевой, API и т.д.) возвращаем исходный текст, чтобы не прерывать работу
            return trimmedText; 
        }
    }

    citizenshipSelect.addEventListener('change', toggleForeignFields);
    cyrNameInputElement.addEventListener('input', updateAutoLatName);
    toggleForeignFields();

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (MORPHOR, ЦЕЛЬ: СКЛОНЕННЫЕ В data ДЛЯ DOCX) ---");

        const formData = new FormData(form);
        const data = {}; 

        let cyrNameNominative = cyrNameInputElement.value.trim();
        let positionNominative = positionInputElement.value.trim();

        console.log("[SUBMIT] Введено ФИО (И.п.):", `"${cyrNameNominative}"`);
        console.log("[SUBMIT] Введена Должность (И.п.):", `"${positionNominative}"`);
        
        if (cyrNameNominative) {
            data.cyr_name = await declineWithMorpher(cyrNameNominative);
            console.log("[SUBMIT] ФИО после Morpher (Р.п.) для шаблона {cyr_name}:", `"${data.cyr_name}"`);
        } else {
            data.cyr_name = ''; 
        }

        let positionNominativeProcessed = ''; 
        if (positionNominative && positionNominative.length > 0) {
            // Для должностей часто требуется склонять с маленькой буквы, 
            // но лучше уточнить у Morpher, как они лучше обрабатывают должности.
            // Пока оставляем как есть или первую букву в нижний регистр, если это стандартная практика.
            // Если Morpher хорошо обрабатывает должности с заглавной, эту строку можно убрать.
            positionNominativeProcessed = positionNominative.charAt(0).toLowerCase() + positionNominative.slice(1);
        }
        
        if (positionNominativeProcessed) {
            console.log("[SUBMIT] Должность для склонения (обработанная И.п.):", `"${positionNominativeProcessed}"`);
            data.position = await declineWithMorpher(positionNominativeProcessed); 
            console.log("[SUBMIT] Должность после Morpher (Р.п.) для шаблона {position}:", `"${data.position}"`);
        } else if (positionNominative) { // Если должность была, но стала пустой после обработки
             data.position = await declineWithMorpher(positionNominative); // Попробуем склонить оригинальную
             console.log("[SUBMIT] Должность после Morpher (оригинальная) (Р.п.) для шаблона {position}:", `"${data.position}"`);
        }
        else {
            data.position = '';
        }
        
        data.lat_name = ''; 
        if (citizenshipSelect.value === 'other') {
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
             data.passport_expire = '';
        }
        
        const directFields = ['passport_number', 'path', 'phone', 'site', 'gender'];
        directFields.forEach(fieldName => {
            data[fieldName] = formData.get(fieldName) || '';
        });

        const dateFields = ['birthday', 'mo_from', 'mo_to', 'work_from']; 
        dateFields.forEach(fieldName => {
            const rawDate = formData.get(fieldName);
            if (rawDate) {
                try { data[fieldName] = new Date(rawDate).toLocaleDateString('ru-RU'); } 
                catch (e) { data[fieldName] = rawDate; }
            } else { data[fieldName] = ''; }
        });
        
        const moDurationInputVal = formData.get('mo_duration');
        if (moDurationInputVal) { data.mo_duration = moDurationInputVal; } 
        else if (data.mo_from && data.mo_to) {
            try {
                const moFromDate = new Date(formData.get('mo_from'));
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
        let outputNamePart = cyrNameNominative ? (cyrNameNominative.split(' ')[0] || "сотрудника") : "документ";
        const outputFilename = `МО_${outputNamePart}_${data.submissionDate.replace(/\./g, '-')}.docx`;

        // Убедитесь, что функция loadAndProcessDocx определена и доступна
        if (typeof loadAndProcessDocx === 'function') {
            loadAndProcessDocx(templateUrl, data, outputFilename);
        } else {
            console.error("Функция loadAndProcessDocx не найдена!");
            alert("Ошибка: функция для генерации документа не найдена.");
        }
    });

    // --- Начало функции loadAndProcessDocx ---
    // Эту функцию нужно скопировать из вашей предыдущей рабочей версии, 
    // так как ее полный код не был предоставлен в изначальном mo_itr.js
    // Убедитесь, что она корректно работает с PizZip, Docxtemplater и FileSaver.js
    function loadAndProcessDocx(url, data, fileName) {
        // Примерная структура функции, замените на вашу реализацию
        if (typeof PizZip === 'undefined' || typeof Docxtemplater === 'undefined' || typeof saveAs === 'undefined') {
            console.error('Одна или несколько библиотек (PizZip, Docxtemplater, FileSaver) не загружены.');
            alert('Ошибка: Необходимые библиотеки для генерации документа не найдены.');
            return;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Не удалось загрузить шаблон: ${response.status} ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(content => {
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                });

                doc.setData(data);

                try {
                    doc.render();
                } catch (error) {
                    console.error('Ошибка при рендеринге шаблона:', JSON.stringify({ error: error }));
                    alert('Произошла ошибка при заполнении шаблона документа.');
                    throw error;
                }

                const out = doc.getZip().generate({
                    type: 'blob',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                });
                saveAs(out, fileName);
                console.log(`Документ "${fileName}" успешно сгенерирован и скачан.`);
            })
            .catch(error => {
                console.error('Ошибка при загрузке или обработке DOCX шаблона:', error);
                alert(`Ошибка при генерации документа: ${error.message}`);
            });
    }
    // --- Конец функции loadAndProcessDocx ---
});
