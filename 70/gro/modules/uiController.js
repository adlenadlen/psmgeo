// modules/uiController.js - Модуль управления интерфейсом
import { CoordinateSystem } from './coordinates.js';

export class UIController {
    constructor(app) {
        this.app = app;
        this.coordSystem = new CoordinateSystem();
        this.elements = {};
        this.debounceTimer = null;
        this.virtualScroller = null;
    }
    
    init() {
        this.createElements();
        this.bindEvents();
    }
    
    createElements() {
        // Создание элементов управления поиском
        const searchControls = document.getElementById('searchControls');
        searchControls.innerHTML = this.createSearchControlsHTML();
        
        // Создание элементов управления конвертацией
        const conversionControls = document.getElementById('conversionControls');
        conversionControls.innerHTML = this.createConversionControlsHTML();
        
        // Кэширование часто используемых элементов
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            outputList: document.getElementById('outputList'),
            messageState: document.getElementById('messageState'),
            nearbyPopup: document.getElementById('nearbyPopup'),
            nearbyList: document.getElementById('nearbyList'),
            nearbyPopupTitle: document.getElementById('nearbyPopupTitle'),
            // Элементы конвертации
            manualCoordX: document.getElementById('manualCoordX'),
            manualCoordY: document.getElementById('manualCoordY'),
            manualResultX: document.getElementById('manualResultX'),
            manualResultY: document.getElementById('manualResultY')
        };
    }
    
    createSearchControlsHTML() {
        return `
            <div class="control-row">
                <span class="control-label">Целевая СК:</span>
                <div class="coord-toggle" id="coordToggle">
                    <input id="toggleIzp" name="coordSystem" type="radio" value="izp" checked>
                    <label for="toggleIzp">ИЗП</label>
                    <input id="toggleMsk" name="coordSystem" type="radio" value="msk">
                    <label for="toggleMsk">МСК</label>
                    <input id="toggleGfu" name="coordSystem" type="radio" value="gfu">
                    <label for="toggleGfu">ГФУ</label>
                </div>
            </div>
            <div class="control-row">
                <span class="control-label">Примечание:</span>
                <div class="note-toggle">
                    <input id="noteOn" name="noteMode" type="radio" value="on" checked>
                    <label for="noteOn">Вкл</label>
                    <input id="noteOff" name="noteMode" type="radio" value="off">
                    <label for="noteOff">Выкл</label>
                </div>
            </div>
            <div class="control-row">
                <span class="control-label">Совпадение:</span>
                <div class="search-mode-toggle">
                    <input id="searchContains" name="searchMode" type="radio" value="contains" checked>
                    <label for="searchContains">Содержит</label>
                    <input id="searchExact" name="searchMode" type="radio" value="exact">
                    <label for="searchExact">Точно</label>
                </div>
            </div>
            <div class="control-row">
                <span class="control-label">Игнор. спецсимв.:</span>
                <div class="ignore-chars-toggle">
                    <input id="ignoreOff" name="ignoreMode" type="radio" value="off" checked>
                    <label for="ignoreOff">Выкл</label>
                    <input id="ignoreOn" name="ignoreMode" type="radio" value="on">
                    <label for="ignoreOn">Вкл</label>
                </div>
            </div>
            <div class="control-row">
                <span class="control-label">Разделитель:</span>
                <div class="separator-toggle">
                    <input id="separatorComma" name="separatorMode" type="radio" value="comma" checked>
                    <label for="separatorComma">Запятая</label>
                    <input id="separatorSpace" name="separatorMode" type="radio" value="space">
                    <label for="separatorSpace">Пробел</label>
                </div>
            </div>
            <div class="control-row">
                <button id="geolocateButton" class="button button-primary">Поиск по геолокации</button>
            </div>
            <div class="control-row">
                <input id="searchInput" type="text" placeholder="Поиск по названию..." class="search-input">
            </div>
        `;
    }
    
    createConversionControlsHTML() {
        return `
            <div class="control-row">
                <span class="control-label">Исходная система:</span>
                <div class="coord-toggle">
                    <input id="manualSourceIzp" name="manualSourceSystem" type="radio" value="izp" checked>
                    <label for="manualSourceIzp">ИЗП</label>
                    <input id="manualSourceMsk" name="manualSourceSystem" type="radio" value="msk">
                    <label for="manualSourceMsk">МСК</label>
                    <input id="manualSourceGfu" name="manualSourceSystem" type="radio" value="gfu">
                    <label for="manualSourceGfu">ГФУ</label>
                </div>
            </div>
            <div class="control-row input-control-row">
                <label for="manualCoordX" class="control-label">X (Север):</label>
                <input id="manualCoordX" type="text" placeholder="Введите X" class="manual-coord-input" inputmode="decimal">
            </div>
            <div class="control-row input-control-row">
                <label for="manualCoordY" class="control-label">Y (Восток):</label>
                <input id="manualCoordY" type="text" placeholder="Введите Y" class="manual-coord-input" inputmode="decimal">
            </div>
            <div class="control-row">
                <span class="control-label">Целевая система:</span>
                <div class="coord-toggle">
                    <input id="manualTargetIzp" name="manualTargetSystem" type="radio" value="izp">
                    <label for="manualTargetIzp">ИЗП</label>
                    <input id="manualTargetMsk" name="manualTargetSystem" type="radio" value="msk" checked>
                    <label for="manualTargetMsk">МСК</label>
                    <input id="manualTargetGfu" name="manualTargetSystem" type="radio" value="gfu">
                    <label for="manualTargetGfu">ГФУ</label>
                </div>
            </div>
            <div class="control-row">
                <span class="control-label">Результат:</span>
                <div>
                    X: <span id="manualResultX">---</span>
                    Y: <span id="manualResultY">---</span>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // Поиск
        this.elements.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.app.performSearch(this.elements.searchInput.value.trim());
            }, 400);
        });
        
        // Переключатели
        document.querySelectorAll('input[name="coordSystem"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.app.updateSettings({ currentCoordMode: e.target.value });
            });
        });
        
        document.querySelectorAll('input[name="noteMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.app.updateSettings({ isNoteVisible: e.target.value === 'on' });
            });
        });
        
        document.querySelectorAll('input[name="searchMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.app.updateSettings({ searchMode: e.target.value });
                if (this.elements.searchInput.value.trim()) {
                    this.app.performSearch(this.elements.searchInput.value.trim());
                }
            });
        });
        
        document.querySelectorAll('input[name="ignoreMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.app.updateSettings({ shouldIgnoreChars: e.target.value === 'on' });
                if (this.elements.searchInput.value.trim()) {
                    this.app.performSearch(this.elements.searchInput.value.trim());
                }
            });
        });
        
        document.querySelectorAll('input[name="separatorMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.app.updateSettings({ separatorChar: e.target.value === 'space' ? ' ' : ',' });
            });
        });
        
        // Геолокация
        document.getElementById('geolocateButton').addEventListener('click', () => {
            this.app.findNearbyUserLocation();
        });
        
        // Клики по точкам
        this.elements.outputList.addEventListener('click', (e) => {
            if (e.target.classList.contains('point-link')) {
                e.preventDefault();
                const recordId = e.target.dataset.id;
                const record = this.app.state.fullDatabase.find(r => r.id === recordId);
                if (record) {
                    this.app.findNearbyPoints(record);
                }
            }
        });
        
        // Закрытие попапа
        this.elements.nearbyPopup.addEventListener('click', (e) => {
            if (e.target === this.elements.nearbyPopup || e.target.classList.contains('popup-close-btn')) {
                this.closeNearbyPopup();
            }
        });
        
        // Конвертация координат
        this.bindConversionEvents();
    }
    
    bindConversionEvents() {
        const updateConversion = () => {
            const sourceSystem = document.querySelector('input[name="manualSourceSystem"]:checked').value;
            const targetSystem = document.querySelector('input[name="manualTargetSystem"]:checked').value;
            
            const xValue = this.elements.manualCoordX.value.trim().replace(',', '.');
            const yValue = this.elements.manualCoordY.value.trim().replace(',', '.');
            
            if (!xValue || !yValue) {
                this.elements.manualResultX.textContent = '---';
                this.elements.manualResultY.textContent = '---';
                return;
            }
            
            const x = parseFloat(xValue);
            const y = parseFloat(yValue);
            
            const result = this.coordSystem.transform(x, y, sourceSystem, targetSystem);
            this.elements.manualResultX.textContent = this.formatCoordinate(result.x);
            this.elements.manualResultY.textContent = this.formatCoordinate(result.y);
        };
        
        document.querySelectorAll('input[name="manualSourceSystem"], input[name="manualTargetSystem"]').forEach(radio => {
            radio.addEventListener('change', updateConversion);
        });
        
        this.elements.manualCoordX.addEventListener('input', updateConversion);
        this.elements.manualCoordY.addEventListener('input', updateConversion);
    }
    
    displayRecords(records) {
        if (this.app.state.isLoading) {
            this.showLoading();
            return;
        }
        
        if (records.length === 0) {
            this.showMessage(
                this.app.state.fullDatabase.length === 0 
                    ? 'База данных пуста или произошла ошибка загрузки'
                    : this.elements.searchInput.value.trim() === ''
                        ? 'База данных загружена. Введите запрос для поиска...'
                        : 'Ничего не найдено по вашему запросу'
            );
            return;
        }
        
        this.elements.messageState.style.display = 'none';
        this.elements.outputList.style.display = 'block';
        
        // Используем виртуальный скроллинг для больших списков
        if (records.length > 100) {
            this.renderVirtualList(records);
        } else {
            this.renderFullList(records);
        }
    }
    
    renderFullList(records) {
        const fragment = document.createDocumentFragment();
        
        records.forEach(record => {
            const element = this.createRecordElement(record);
            fragment.appendChild(element);
        });
        
        this.elements.outputList.innerHTML = '';
        this.elements.outputList.appendChild(fragment);
    }
    
    renderVirtualList(records) {
        // Упрощенная реализация виртуального скроллинга
        const itemHeight = 30;
        const containerHeight = 600;
        const visibleItems = Math.ceil(containerHeight / itemHeight) + 10;
        
        let scrollTop = 0;
        let startIndex = 0;
        
        const container = this.elements.outputList;
        container.style.height = `${containerHeight}px`;
        container.style.overflow = 'auto';
        container.style.position = 'relative';
        
        const content = document.createElement('div');
        content.style.height = `${records.length * itemHeight}px`;
        content.style.position = 'relative';
        
        const renderVisible = () => {
            startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleItems, records.length);
            
            content.innerHTML = '';
            
            for (let i = startIndex; i < endIndex; i++) {
                const element = this.createRecordElement(records[i]);
                element.style.position = 'absolute';
                element.style.top = `${i * itemHeight}px`;
                element.style.height = `${itemHeight}px`;
                content.appendChild(element);
            }
        };
        
        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            requestAnimationFrame(renderVisible);
        });
        
        container.innerHTML = '';
        container.appendChild(content);
        renderVisible();
    }
    
    createRecordElement(record) {
        const div = document.createElement('div');
        div.className = 'output-line';
        
        const fields = record.fields;
        const coords = this.coordSystem.transform(
            fields.Xraw,
            fields.Yraw,
            fields.CoordSystem.toLowerCase(),
            this.app.state.currentCoordMode
        );
        
        const sep = this.app.state.separatorChar;
        
        // Ссылка на точку
        const link = document.createElement('a');
        link.textContent = fields.Point || 'N/A';
        link.className = 'point-link';
        link.href = '#';
        link.dataset.id = record.id;
        div.appendChild(link);
        
        // Координаты и информация
        let text = `${sep}${this.formatCoordinate(coords.x)}${sep}${this.formatCoordinate(coords.y)}${sep}${this.formatCoordinate(fields.H)}${sep}`;
        if (this.app.state.isNoteVisible) {
            text += fields.Info || '';
        }
        div.appendChild(document.createTextNode(text));
        
        // Кнопки карт
        this.addMapButtons(div, fields);
        
        return div;
    }
    
    addMapButtons(element, fields) {
        const wgsCoords = this.coordSystem.toWGS84(
            fields.Xraw,
            fields.Yraw,
            fields.CoordSystem.toLowerCase()
        );
        
        if (!wgsCoords) return;
        
        const createMapLink = (href, text, title) => {
            const link = document.createElement('a');
            link.href = href;
            link.textContent = text;
            link.target = '_blank';
            link.className = 'map-link';
            link.title = title;
            return link;
        };
        
        element.appendChild(createMapLink(
            `https://www.google.com/maps?q=${wgsCoords.lat},${wgsCoords.lon}`,
            'G',
            'Открыть в Google Картах'
        ));
        
        element.appendChild(createMapLink(
            `https://yandex.ru/maps/?pt=${wgsCoords.lon},${wgsCoords.lat}&z=18&l=map`,
            'Я',
            'Открыть в Яндекс Картах'
        ));
    }
    
    showNearbyPopup(nearbyPoints, referencePoint) {
        this.elements.nearbyPopupTitle.textContent = `Точки рядом с ${referencePoint.fields.Point} (до 300м):`;
        this.elements.nearbyList.innerHTML = '';
        
        // Добавляем исходную точку
        const refDiv = document.createElement('div');
        refDiv.className = 'reference-point';
        refDiv.innerHTML = `<strong>Исходная точка:</strong> ${this.formatPointInfo(referencePoint)}`;
        this.elements.nearbyList.appendChild(refDiv);
        
        // Добавляем найденные точки
        if (nearbyPoints.length > 0) {
            nearbyPoints.forEach(item => {
                const div = document.createElement('div');
                div.className = 'nearby-item';
                div.innerHTML = `
                    <span class="nearby-distance">${item.distance.toFixed(1)}м</span>
                    ${this.formatPointInfo(item.record, item.coords)}
                `;
                this.addMapButtons(div, item.record.fields);
                this.elements.nearbyList.appendChild(div);
            });
        } else {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.textContent = 'В радиусе 300м точки не найдены';
            this.elements.nearbyList.appendChild(noResultsDiv);
        }
        
        this.elements.nearbyPopup.style.display = 'flex';
    }
    
    showNearbyLocationPopup(result, userCoords) {
        this.elements.nearbyPopupTitle.textContent = 'Точки рядом с вашим местоположением (до 300м):';
        this.elements.nearbyList.innerHTML = '';
        
        // Показываем координаты пользователя
        const userDiv = document.createElement('div');
        userDiv.className = 'reference-point';
        userDiv.innerHTML = `
            <strong>Ваше местоположение (${this.app.state.currentCoordMode.toUpperCase()}):</strong>
            X: ${this.formatCoordinate(result.userCoords.x)}, 
            Y: ${this.formatCoordinate(result.userCoords.y)}
        `;
        this.elements.nearbyList.appendChild(userDiv);
        
        // Добавляем найденные точки
        if (result.points.length > 0) {
            result.points.forEach(item => {
                const div = document.createElement('div');
                div.className = 'nearby-item';
                div.innerHTML = `
                    <span class="nearby-distance">${item.distance.toFixed(1)}м</span>
                    ${this.formatPointInfo(item.record, item.coords)}
                `;
                this.addMapButtons(div, item.record.fields);
                this.elements.nearbyList.appendChild(div);
            });
        } else {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.textContent = 'В радиусе 300м точки не найдены';
            this.elements.nearbyList.appendChild(noResultsDiv);
        }
        
        this.elements.nearbyPopup.style.display = 'flex';
    }
    
    formatPointInfo(record, coords = null) {
        const fields = record.fields;
        const sep = this.app.state.separatorChar;
        
        if (!coords) {
            coords = this.coordSystem.transform(
                fields.Xraw,
                fields.Yraw,
                fields.CoordSystem.toLowerCase(),
                this.app.state.currentCoordMode
            );
        }
        
        let info = `${fields.Point}${sep}${this.formatCoordinate(coords.x)}${sep}${this.formatCoordinate(coords.y)}${sep}${this.formatCoordinate(fields.H)}`;
        
        if (this.app.state.isNoteVisible) {
            info += `${sep}${fields.Info || ''}`;
        }
        
        return info;
    }
    
    closeNearbyPopup() {
        this.elements.nearbyPopup.style.display = 'none';
        this.elements.nearbyList.innerHTML = '';
    }
    
    formatCoordinate(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }
        return parseFloat(value).toFixed(3);
    }
    
    showMessage(message) {
        this.elements.messageState.textContent = message;
        this.elements.messageState.style.display = 'block';
        this.elements.messageState.classList.remove('error');
        this.elements.outputList.style.display = 'none';
    }
    
    showError(message) {
        this.elements.messageState.textContent = message;
        this.elements.messageState.style.display = 'block';
        this.elements.messageState.classList.add('error');
        this.elements.outputList.style.display = 'none';
    }
    
    showLoading() {
        this.showMessage('Загрузка данных...');
    }
}
