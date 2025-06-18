// modules/uiController.js - Обновленный модуль управления интерфейсом
import { CoordinateSystem } from './coordinates.js';

export class UIController {
    constructor(app) {
        this.app = app;
        this.coordSystem = new CoordinateSystem();
        this.elements = {};
        this.debounceTimer = null;
        this.popupHistory = [];
    }
    
    init() {
        this.createElements();
        this.bindEvents();
    }
    
    createElements() {
        const searchControls = document.getElementById('searchControls');
        searchControls.innerHTML = this.createSearchControlsHTML();
        
        const conversionControls = document.getElementById('conversionControls');
        conversionControls.innerHTML = this.createConversionControlsHTML();
        
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            outputList: document.getElementById('outputList'),
            messageState: document.getElementById('messageState'),
            nearbyPopup: document.getElementById('nearbyPopup'),
            nearbyList: document.getElementById('nearbyList'),
            nearbyPopupTitle: document.getElementById('nearbyPopupTitle'),
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
                <div class="coord-toggle">
                    <input id="toggleIzp" name="coordSystem" type="radio" value="izp" checked>
                    <label for="toggleIzp">ИЗП</label>
                    <input id="toggleMsk" name="coordSystem" type="radio" value="msk">
                    <label for="toggleMsk">МСК</label>
                    <input id="toggleGfu" name="coordSystem" type="radio" value="gfu">
                    <label for="toggleGfu">ГФУ</label>
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
            <div class="control-row search-row">
                <input id="searchInput" type="text" placeholder="Поиск по названию..." class="search-input">
                <button id="geolocateButton" class="b geolocate-button" title="Поиск по геолокации">📍</button>
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
            <div class="control-row">
                <label for="manualCoordX" class="control-label">X (Север):</label>
                <input id="manualCoordX" type="text" placeholder="Введите X" class="manual-coord-input" inputmode="decimal">
            </div>
            <div class="control-row">
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
                <div class="conversion-result">
                    X: <span id="manualResultX">---</span>
                    Y: <span id="manualResultY">---</span>
                </div>
            </div>
        `;
    }
    
    // ... остальные методы без изменений ...
    
    showNearbyLocationPopup(result, userCoords) {
        const popupContent = document.createElement('div');
        popupContent.className = 'popup-content';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'popup-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Закрыть';
        popupContent.appendChild(closeBtn);
        
        const header = document.createElement('div');
        header.className = 'popup-header';
        
        const title = document.createElement('h3');
        title.className = 'popup-title';
        title.textContent = 'Геолокация'; // Изменено с "Поиск по геолокации"
        header.appendChild(title);
        
        const coordsDiv = document.createElement('div');
        coordsDiv.className = 'popup-coordinates';
        coordsDiv.innerHTML = `
            Ваше местоположение (${this.app.state.currentCoordMode.toUpperCase()}):<br>
            <strong>X:</strong> ${this.formatCoordinate(result.userCoords.x)}<br>
            <strong>Y:</strong> ${this.formatCoordinate(result.userCoords.y)}
        `;
        header.appendChild(coordsDiv);
        
        popupContent.appendChild(header);
        
        const nearbySection = document.createElement('div');
        nearbySection.className = 'nearby-section';
        
        const nearbyTitle = document.createElement('h4');
        nearbyTitle.className = 'nearby-title';
        nearbyTitle.textContent = 'Ближайшие точки (до 300м):';
        nearbySection.appendChild(nearbyTitle);
        
        const nearbyList = document.createElement('div');
        nearbyList.className = 'nearby-list';
        
        if (result.points.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'Поблизости нет точек';
            nearbyList.appendChild(noResults);
        } else {
            result.points.forEach(item => {
                const element = this.createRecordElement(item.record, true, item.distance);
                
                element.addEventListener('click', (e) => {
                    if (e.target.classList.contains('map-link')) {
                        return;
                    }
                    this.showPointDetails(item.record);
                });
                
                nearbyList.appendChild(element);
            });
        }
        
        nearbySection.appendChild(nearbyList);
        popupContent.appendChild(nearbySection);
        
        this.elements.nearbyPopup.innerHTML = '';
        this.elements.nearbyPopup.appendChild(popupContent);
        this.elements.nearbyPopup.style.display = 'flex';
        
        this.popupHistory = [];
    }
    
    // ... остальной код без изменений ...
}
