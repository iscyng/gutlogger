
import { supabase } from "@/integrations/supabase/client";

export interface UnitSelection {
  fileName: string;
  unit: string;
}

export const saveUnitSelection = async (fileName: string, unit: string): Promise<void> => {
  const { error } = await supabase
    .from('unit_selections')
    .upsert(
      { 
        file_name: fileName, 
        unit,
        updated_at: new Date().toISOString()
      } as any, // Type assertion to fix the type mismatch
      {
        onConflict: 'file_name'
      }
    );
  
  if (error) {
    console.error('Error saving unit selection:', error);
    throw error;
  }
};

export const getUnitSelection = async (fileName: string): Promise<string> => {
  const { data, error } = await supabase
    .from('unit_selections')
    .select('unit')
    .eq('file_name', fileName)
    .maybeSingle() as { data: { unit: string } | null; error: any };
  
  if (error) {
    console.error('Error getting unit selection:', error);
    return '';
  }
  
  return data?.unit || '';
};

export const getAllUnitSelections = async (): Promise<UnitSelection[]> => {
  const { data, error } = await supabase
    .from('unit_selections')
    .select('file_name, unit') as { data: Array<{ file_name: string; unit: string }> | null; error: any };
  
  if (error) {
    console.error('Error getting all unit selections:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    fileName: item.file_name,
    unit: item.unit
  }));
};
