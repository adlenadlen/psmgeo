// modules/dataManager.js - Модуль управления данными
export class DataManager {
    constructor() {
        this.csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTa3l-bUfZwy3iCNzVKmawZ_dApKSqMm6yuddAzP3eIkLp5m7zuHydF2UdSkUxKwW0CntEv6EBCxFf7/pub?gid=1125461087&single=true&output=csv';
        this.columnIndices = {
            CoordSystem: 0,
            Point: 1,
            Xraw: 2,
            Yraw: 3,
            H: 4,
            Info: 5
        };
    }
    
    async fetchData() {
        try {
            const response = await fetch(`${this.csvUrl}&_=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            throw new Error(`Не удалось загрузить данные: ${error.message}`);
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const records = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = this.parseCSVLine(line);
            if (parts.length >= 6) {
                records.push({
                    id: `gs_${i + 1}`,
                    fields: {
                        CoordSystem: parts[this.columnIndices.CoordSystem]?.trim().toUpperCase() || 'UNKNOWN',
                        Point: parts[this.columnIndices.Point]?.trim() || '',
                        Xraw: parseFloat(parts[this.columnIndices.Xraw]) || NaN,
                        Yraw: parseFloat(parts[this.columnIndices.Yraw]) || NaN,
                        H: parseFloat(parts[this.columnIndices.H]) || NaN,
                        Info: parts[this.columnIndices.Info]?.trim() || ''
                    }
                });
            }
        }
        
        return records;
    }
    
    parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        parts.push(current);
        return parts;
    }
}
