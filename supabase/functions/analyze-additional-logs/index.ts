
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logData } = await req.json();

    console.log('Received request for additional log analysis');

    // Process log data
    const analysisResults = processLogData(logData);

    return new Response(JSON.stringify(analysisResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Detailed error in analyze-additional-logs function:', {
      message: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Process log data similar to the Python script
function processLogData(logFiles) {
  // Initialize results
  const results = {
    unitNumbers: new Set(),
    unitCycles: {},
    unitErrors: {},
    batteryStats: [],
    programStarts: [],
    logSummaries: []
  };

  logFiles.forEach(logFile => {
    const { file_name, raw_content } = logFile;
    const lines = raw_content.split('\n');
    
    // Extract unit number
    const unitNumber = extractUnitNumber(lines);
    results.unitNumbers.add(unitNumber);
    
    // Extract important information
    const { 
      importantLines, 
      errorCount, 
      batteryStatsList, 
      programStarts, 
      rlxxxLines 
    } = extractImportantInfo(lines);
    
    // Add to summary
    results.logSummaries.push({
      fileName: file_name,
      unitNumber,
      importantLines,
      errorCount,
      rlxxxLines
    });
    
    // Update battery stats
    batteryStatsList.forEach(stat => {
      results.batteryStats.push({
        ...stat,
        fileName: file_name,
        unitNumber
      });
    });
    
    // Update program starts
    programStarts.forEach(start => {
      results.programStarts.push({
        fileName: file_name,
        unitNumber,
        programStart: start
      });
    });
    
    // Update unit cycles and errors
    if (!results.unitCycles[unitNumber]) {
      results.unitCycles[unitNumber] = 0;
      results.unitErrors[unitNumber] = 0;
    }
    results.unitCycles[unitNumber] += programStarts.length;
    results.unitErrors[unitNumber] += errorCount;
  });
  
  // Convert Sets to Arrays for JSON serialization
  return {
    ...results,
    unitNumbers: [...results.unitNumbers]
  };
}

// Extract unit number from log content
function extractUnitNumber(lines) {
  for (const line of lines) {
    const match = line.match(/Setting "unitNumber" value is (\d+)/);
    if (match) {
      return match[1];
    }
  }
  return "Unknown";
}

// Extract important information from log content - enhanced with more comprehensive analysis
function extractImportantInfo(lines) {
  const importantLines = [];
  let errorCount = 0;
  const batteryStatsList = [];
  const programStarts = [];
  const rlxxxLines = [];
  
  let batteryEntry = null;
  
  for (const line of lines) {
    // Clean the line first (remove ANSI escape sequences)
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    
    // Search for relevant log patterns
    if (/ERROR|Battery|RL\s*\d{3}|SI32/i.test(cleanLine)) {
      importantLines.push(cleanLine);
      
      // Count error lines
      if (cleanLine.toUpperCase().includes('RECEIVED ERROR CODE')) {
        errorCount++;
      }
    }
    
    // Collect battery statistics - enhanced to capture more parameters
    const batteryMatch = cleanLine.match(/I \((.*?)\) ManagerSystem: (\w+) = ([\d\.]+)([A-Za-z%]*)/);
    if (batteryMatch) {
      const timestamp = batteryMatch[1];
      const parameter = batteryMatch[2];
      const value = batteryMatch[3];
      
      // Create a new entry if timestamp changes
      if (!batteryEntry || batteryEntry.timestamp !== timestamp) {
        if (batteryEntry) {
          batteryStatsList.push(batteryEntry);
        }
        batteryEntry = { timestamp };
      }
      
      // Store the parameter value
      batteryEntry[parameter] = value;
    }
    
    // Collect program starts
    if (cleanLine.includes('ManagerSystemImplDevice: Started program')) {
      programStarts.push(cleanLine);
    }
    
    // Collect RLXXX lines
    if (/RL\d{3}/.test(cleanLine)) {
      rlxxxLines.push(cleanLine);
    }
  }
  
  // Append the last battery entry if exists
  if (batteryEntry) {
    batteryStatsList.push(batteryEntry);
  }
  
  return {
    importantLines,
    errorCount,
    batteryStatsList,
    programStarts,
    rlxxxLines
  };
}
