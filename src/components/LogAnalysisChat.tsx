
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LogAnalysisChatProps {
  results: Array<{
    file_name: string;
    wait_time: string;
    trigger_time: string;
    pressure_readings: number;
    duration_ms: number;
    max_pressure: string;
    raw_content: string;
    settings: Record<string, string>;
    battery_info: Record<string, string>;
    temperatures: string[];
    system_events: string[];
  }>;
}

export const LogAnalysisChat = ({ results }: LogAnalysisChatProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAsk = async () => {
    if (!question.trim()) {
      toast({
        title: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-logs', {
        body: { 
          question,
          logData: results.map(result => ({
            ...result,
            settings_summary: Object.entries(result.settings)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n'),
            battery_summary: Object.entries(result.battery_info)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n'),
            temperature_readings: result.temperatures.join(', '),
            system_events: result.system_events.join('\n'),
            complete_log: result.raw_content
          }))
        },
      });

      if (error) throw error;

      setAnswer(data.answer);
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Ask Questions About Your Log Data</h3>
      <div className="space-y-2">
        <Textarea
          placeholder="Ask a question about your log data..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-[100px]"
        />
        <Button 
          onClick={handleAsk} 
          disabled={isLoading || !question.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Ask Question"
          )}
        </Button>
      </div>
      {answer && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Answer:</h4>
          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}
    </Card>
  );
};
