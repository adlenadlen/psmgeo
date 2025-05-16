document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('moItrForm');
    // ... (остальные const для элементов формы, если они нужны для ДРУГОЙ логики, но для этого теста Petrovich они не важны)

    // Убедимся, что форма есть, чтобы submit сработал
    if (!form) {
        console.error("Форма moItrForm не найдена!");
        alert("Ошибка: Форма не найдена!");
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        console.log("--- НАЧАЛО ОБРАБОТКИ ФОРМЫ (УПРОЩЕННЫЙ ТЕСТ PETROVICH) ---");

        const data = {}; // Объект для данных шаблона, пока не заполняем его полностью

        // --- ЖЕСТКО ЗАДАННЫЕ ДАННЫЕ ДЛЯ PETROVICH ---
        const hardcodedPersonData = {
            gender: 'male',
            first: 'Петр',
            last: 'Чайковский',
            middle: 'Ильич' // Добавим отчество для полноты
        };

        console.log("[ТЕСТ] Жестко заданные данные для petrovich:", JSON.stringify(hardcodedPersonData));

        // Проверка доступности функции petrovich
        if (typeof petrovich !== 'function') {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: Функция petrovich НЕ НАЙДЕНА в глобальной области видимости!");
            alert("Ошибка: Библиотека для склонения ФИО не загружена. Проверьте подключение.");
            data.cyr_name_genitive = "Петр Чайковский Ильич (Ошибка склонения)"; // Fallback
        } else {
            console.log("[ТЕСТ] Функция petrovich найдена.");
            try {
                // Вызываем petrovich с жестко заданными данными
                const declinedHardcodedPerson = petrovich(hardcodedPersonData, 'genitive'); 
                
                console.log("[ТЕСТ] Petrovich ВЕРНУЛ (объект ФИО):", JSON.stringify(declinedHardcodedPerson));
                
                const declinedFullNameString = [
                    declinedHardcodedPerson.last, 
                    declinedHardcodedPerson.first, 
                    declinedHardcodedPerson.middle
                ].filter(Boolean).join(' ');

                data.cyr_name_genitive = declinedFullNameString; // Записываем результат в data
                console.log("[ТЕСТ] РЕЗУЛЬТАТ СКЛОНЕНИЯ (ФИО, родительный, строка):", data.cyr_name_genitive);

                // Проверка, что склонение произошло
                const originalFullName = [hardcodedPersonData.last, hardcodedPersonData.first, hardcodedPersonData.middle].filter(Boolean).join(' ');
                if (data.cyr_name_genitive.toLowerCase() === originalFullName.toLowerCase() && originalFullName !== "") {
                     console.warn("[ТЕСТ] ПРЕДУПРЕЖДЕНИЕ: Petrovich вернул ФИО без изменений с жестко заданными данными.");
                } else if (data.cyr_name_genitive) {
                     console.log("[ТЕСТ] ИНФО: Склонение ФИО с жестко заданными данными прошло успешно!");
                }

            } catch (e) {
                console.error("[ТЕСТ] ОШИБКА ВНУТРИ PETROVICH при склонении жестко заданных данных:", e, "\nС данными:", hardcodedPersonData);
                data.cyr_name_genitive = "Петр Чайковский Ильич (Ошибка вызова petrovich)"; // Fallback
            }
        }
        
        // ЗАПОЛНЯЕМ ОСТАЛЬНЫЕ ДАННЫЕ ЗАГЛУШКАМИ, чтобы docxtemplater не ругался
        // В реальном коде здесь будет ваша логика сбора данных из формы
        data.cyr_name = "Петр Чайковский Ильич (И.п.)";
        data.position = "композитор";
        data.position_genitive = "композитора (Р.п. заглушка)";
        data.lat_name = "Pyotr Tchaikovsky";
        data.birthday = "07.05.1840";
        data.phone = "+70000000000";
        data.passport_number = "0000 000000";
        data.passport_expire = "";
        data.site = "Везде";
        data.work_from = "01.01.1860";
        data.mo_from = "01.06.1893";
        data.mo_to = "06.11.1893";
        data.mo_duration = "много";
        data.work_duration = "тоже много";
        data.path = "Клин";
        data.submissionDate = new Date().toLocaleDateString('ru-RU');


        console.log("Финальные данные для шаблона (с тестовым склонением ФИО):", data);

        const templateUrl = '/docs/templates/mo_itr.docx';
        const outputFilename = `ТЕСТ_СКЛОНЕНИЯ_${data.submissionDate.replace(/\./g, '-')}.docx`;

        loadAndProcessDocx(templateUrl, data, outputFilename); // Вызываем генерацию документа
    });

    // Функции toggleForeignFields, updateAutoLatName, declinePositionToGenitiveMale, loadAndProcessDocx
    // должны быть здесь, но я их не дублирую для краткости.
    // Убедитесь, что они есть в вашем файле.

    // Пример заглушек для них, если вы хотите тестировать только блок Petrovich:
    function toggleForeignFields() { console.log("toggleForeignFields вызвана"); }
    function updateAutoLatName() { console.log("updateAutoLatName вызвана"); }
    function declinePositionToGenitiveMale(pos) { console.log(`declinePositionToGenitiveMale вызвана для: ${pos}`); return pos + " (Р.п. заглушка)"; }

}); // Конец DOMContentLoaded

// Функция loadAndProcessDocx (должна быть полной)
function loadAndProcessDocx(templateUrl, data, outputFilename) {
    if (typeof PizZip === 'undefined') { alert("Ошибка: PizZip не загружен."); console.error("PizZip is not defined"); return; }
    if (typeof docxtemplater === 'undefined') { alert("Ошибка: docxtemplater не загружен."); console.error("docxtemplater is not defined"); return; }
    if (typeof saveAs === 'undefined') { alert("Ошибка: FileSaver.js не загружен."); console.error("saveAs is not defined"); return; }
    fetch(templateUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Шаблон: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(content => {
            const zip = new PizZip(content);
            const doc = new docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
            doc.setData(data);
            try { doc.render(); } 
            catch (error) { console.error("Ошибка рендеринга:", error); alert(`Ошибка генерации: ${error.message}`); throw error; }
            const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            saveAs(out, outputFilename);
        })
        .catch(error => { console.error('Ошибка loadAndProcessDocx:', error); alert(`Ошибка обработки: ${error.message}`); });
}
