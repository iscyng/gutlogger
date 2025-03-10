
import { extractEvents } from "./logParser";

export const lineColors = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
];

export interface PressureReading {
  time: number;
  pressure: number;
}

export const getPressureReadings = (rawContent: string): PressureReading[] => {
  const lines = rawContent.split('\n');
  const readings: PressureReading[] = [];
  let firstPressureIndex = -1;
  
  // First find the first actual pressure reading (where pressure > 0)
  lines.forEach((line, index) => {
    if (firstPressureIndex === -1) {
      const pressureMatch = line.match(/(\d+\.\d+)psi/);
      if (pressureMatch && parseFloat(pressureMatch[1]) > 0) {
        firstPressureIndex = index;
      }
    }
  });

  // If no pressure readings found, return empty array
  if (firstPressureIndex === -1) return readings;

  // Now collect all readings with normalized time
  lines.forEach((line, index) => {
    const pressureMatch = line.match(/(\d+\.\d+)psi/);
    if (pressureMatch) {
      readings.push({
        time: (index - firstPressureIndex) * 50, // Normalize time relative to first pressure reading
        pressure: parseFloat(pressureMatch[1]),
      });
    }
  });
  
  return readings;
};

export const prepareOverlayChartData = (
  selectedFiles: Set<string>, 
  results: AnalysisResult[]
) => {
  const selectedFilesData = Array.from(selectedFiles).map((fileName, index) => {
    const fileData = results.find(r => r.file_name === fileName);
    if (!fileData) return null;
    
    const readings = getPressureReadings(fileData.raw_content);
    const events = extractEvents(fileData.raw_content);
    
    return {
      fileName,
      readings,
      events,
      color: lineColors[index % lineColors.length]
    };
  }).filter(Boolean);

  const maxTime = Math.max(
    ...selectedFilesData.map(data => 
      Math.max(...data!.readings.map(r => r.time))
    )
  );

  const timePoints = Array.from(
    { length: Math.floor(maxTime / 50) + 1 },
    (_, i) => i * 50
  );

  return timePoints.map(time => {
    const point: { [key: string]: number | string } = { time };
    selectedFilesData.forEach(data => {
      const reading = data!.readings.find(r => r.time === time);
      if (reading) {
        point[data!.fileName] = reading.pressure;
      }
      // Add event if it exists at this time point
      const event = data!.events.find(e => Math.abs(e.time - time) < 25);
      if (event) {
        point[`${data!.fileName}_event`] = event.event;
      }
    });
    return point;
  });
};

export interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
  raw_content: string;
}

export const prepareComparisonData = (results: AnalysisResult[]) => {
  return results.map(result => ({
    name: result.file_name,
    pressure: parseFloat(result.max_pressure),
    readings: result.pressure_readings,
  }));
};
