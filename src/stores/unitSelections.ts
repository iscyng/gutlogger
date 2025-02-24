
const STORAGE_KEY = 'unit-selections';

export interface UnitSelection {
  fileName: string;
  unit: string;
}

export const saveUnitSelection = (fileName: string, unit: string) => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  const selections: UnitSelection[] = existingData ? JSON.parse(existingData) : [];
  
  const existingIndex = selections.findIndex(s => s.fileName === fileName);
  if (existingIndex >= 0) {
    selections[existingIndex].unit = unit;
  } else {
    selections.push({ fileName, unit });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
};

export const getUnitSelection = (fileName: string): string => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  if (!existingData) return '';
  
  const selections: UnitSelection[] = JSON.parse(existingData);
  const selection = selections.find(s => s.fileName === fileName);
  return selection?.unit || '';
};

export const getAllUnitSelections = (): UnitSelection[] => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  return existingData ? JSON.parse(existingData) : [];
};
