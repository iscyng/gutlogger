import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Gauge } from "lucide-react";
import type { WellPressureData } from "@/utils/logParser";

interface AnalysisResult {
  file_name: string;
  wellPressureData?: WellPressureData | null;
}

interface WellPressureResultsDisplayProps {
  results: AnalysisResult[];
}

export const WellPressureResultsDisplay = ({ results }: WellPressureResultsDisplayProps) => {
  const wellPressureResults = results.filter(r => r.wellPressureData);

  if (wellPressureResults.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Well Pressure Status</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {wellPressureResults.map((result, index) => {
          const wellData = result.wellPressureData!;
          const isOK = wellData.status === 'OK';
          
          return (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  {result.file_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge 
                    variant={isOK ? "default" : "destructive"}
                    className={`flex items-center gap-1 ${
                      isOK ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                    }`}
                  >
                    {isOK ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {wellData.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pressure:</span>
                  <span className="font-medium">
                    {wellData.pressure.toFixed(3)} psi
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="text-xs text-muted-foreground">
                    {wellData.timestamp.replace(/_/g, ' ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {wellPressureResults.filter(r => r.wellPressureData?.status === 'OK').length}
              </div>
              <div className="text-sm text-muted-foreground">OK Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {wellPressureResults.filter(r => r.wellPressureData?.status !== 'OK').length}
              </div>
              <div className="text-sm text-muted-foreground">Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(wellPressureResults.reduce((acc, r) => acc + (r.wellPressureData?.pressure || 0), 0) / wellPressureResults.length).toFixed(3)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Pressure (psi)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.max(...wellPressureResults.map(r => r.wellPressureData?.pressure || 0)).toFixed(3)}
              </div>
              <div className="text-sm text-muted-foreground">Max Pressure (psi)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 