
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
