interface LogEvent {
  time: number;
  event: string;
  timestamp: string;
}

export const extractEvents = (rawContent: string): LogEvent[] => {
  const lines = rawContent.split('\n');
  const events: LogEvent[] = [];
  let startTime: string | null = null;
  
  const importantEvents = [
    'clear line to CH start',
    'clear line to CH end',
    'Triggered!',
    'TIME TO VENT',
    'Starting venting',
    'Venting complete',
    'Waiting to trigger with sample',
    'Running test',
    'Test complete'
  ];

  lines.forEach((line) => {
    // Find the first timestamp to use as reference
    if (!startTime && line.includes('_CST')) {
      const timeMatch = line.match(/\((.*?)_CST\)/);
      if (timeMatch) {
        startTime = timeMatch[1];
      }
    }

    // Look for important events
    const timeMatch = line.match(/\((.*?)_CST\)/);
    if (timeMatch && importantEvents.some(event => line.includes(event))) {
      const timestamp = timeMatch[1];
      const eventText = importantEvents.find(event => line.includes(event));
      
      if (startTime && eventText) {
        // Calculate time difference in milliseconds
        const startDate = new Date(startTime.replace(/_/g, ' '));
        const eventDate = new Date(timestamp.replace(/_/g, ' '));
        const timeDiff = eventDate.getTime() - startDate.getTime();
        
        events.push({
          time: timeDiff,
          event: eventText,
          timestamp: timestamp
        });
      }
    }
  });

  return events;
};

export interface CleaningCycleData {
  startTime: string;
  endTime: string;
  pressureReadings: number[];
  timestamps: string[];
}

export const extractCleaningCycleData = (rawContent: string): CleaningCycleData | null => {
  const lines = rawContent.split('\n');
  let startTime: string | null = null;
  let endTime: string | null = null;
  const pressureReadings: number[] = [];
  const timestamps: string[] = [];
  let isCleaningCycle = false;

  for (const line of lines) {
    // Clean the line first (remove ANSI escape sequences)
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    
    // Look for the start of cleaning cycle
    if (cleanLine.includes('Bubble Sensor Second: Waiting to trigger with sample')) {
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (timeMatch) {
        startTime = timeMatch[1];
        isCleaningCycle = true;
      }
      continue;
    }

    // Look for the end of cleaning cycle
    if (isCleaningCycle && cleanLine.includes('Bubble Sensor Second: Triggered!')) {
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (timeMatch) {
        endTime = timeMatch[1];
        isCleaningCycle = false;
      }
      continue;
    }

    // Collect pressure readings during cleaning cycle
    if (isCleaningCycle) {
      const pressureMatch = cleanLine.match(/(\d+\.\d+)psi/);
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (pressureMatch && timeMatch) {
        pressureReadings.push(parseFloat(pressureMatch[1]));
        timestamps.push(timeMatch[1]);
      }
    }
  }

  if (!startTime || !endTime || pressureReadings.length === 0) {
    return null;
  }

  return {
    startTime,
    endTime,
    pressureReadings,
    timestamps
  };
};

export interface SamplePushData {
  startTime: string;
  endTime: string;
  pressureReadings: number[];
  timestamps: string[];
}

export const extractSamplePushData = (rawContent: string): SamplePushData | null => {
  const lines = rawContent.split('\n');
  let startTime: string | null = null;
  let endTime: string | null = null;
  const pressureReadings: number[] = [];
  const timestamps: string[] = [];
  let measuring = false;

  for (const line of lines) {
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();

    // Start marker
    if (cleanLine.includes('Bubble Sensor First: Waiting to trigger with sample')) {
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (timeMatch) {
        startTime = timeMatch[1];
      }
      measuring = true;
      continue;
    }

    // End marker
    if (measuring && cleanLine.includes('Bubble Sensor First: Triggered!')) {
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (timeMatch) {
        endTime = timeMatch[1];
      }
      measuring = false;
      break; // Stop after trigger
    }

    if (measuring) {
      const pressureMatch = cleanLine.match(/(\d+\.\d+)psi/);
      const timeMatch = cleanLine.match(/\((.*?)_CDT\)/);
      if (pressureMatch && timeMatch) {
        pressureReadings.push(parseFloat(pressureMatch[1]));
        timestamps.push(timeMatch[1]);
      }
    }
  }

  if (!startTime || !endTime || pressureReadings.length === 0) return null;

  return { startTime, endTime, pressureReadings, timestamps };
};
