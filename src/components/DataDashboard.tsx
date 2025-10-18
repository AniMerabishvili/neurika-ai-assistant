import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, Hash, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface DataDashboardProps {
  fileContent: string;
  fileName: string;
}

interface DataStats {
  totalRows: number;
  totalColumns: number;
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  sampleData: any[];
  columnStats: Record<string, {
    type: 'numeric' | 'categorical';
    uniqueValues?: number;
    min?: number;
    max?: number;
    avg?: number;
    topValues?: { value: string; count: number }[];
  }>;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const DataDashboard = ({ fileContent, fileName }: DataDashboardProps) => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parseData();
  }, [fileContent]);

  const parseData = () => {
    try {
      // Parse CSV
      const lines = fileContent.trim().split('\n');
      if (lines.length < 2) {
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1, Math.min(101, lines.length)).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Analyze columns
      const columnStats: Record<string, any> = {};
      const numericColumns: string[] = [];
      const categoricalColumns: string[] = [];

      headers.forEach(column => {
        const values = rows.map(row => row[column]).filter(v => v !== '');
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        
        if (numericValues.length > values.length * 0.7) {
          // Numeric column
          numericColumns.push(column);
          columnStats[column] = {
            type: 'numeric',
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            uniqueValues: new Set(values).size,
          };
        } else {
          // Categorical column
          categoricalColumns.push(column);
          const valueCounts = values.reduce((acc: any, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {});
          const topValues = Object.entries(valueCounts)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([value, count]) => ({ value, count: count as number }));
          
          columnStats[column] = {
            type: 'categorical',
            uniqueValues: new Set(values).size,
            topValues,
          };
        }
      });

      setStats({
        totalRows: lines.length - 1,
        totalColumns: headers.length,
        columns: headers,
        numericColumns,
        categoricalColumns,
        sampleData: rows.slice(0, 5),
        columnStats,
      });
    } catch (error) {
      console.error('Error parsing data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Analyzing data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6 max-w-full overflow-hidden">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <Database className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              Total Rows
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalRows.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              Columns
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalColumns}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              {stats.numericColumns.length} numeric
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              Numeric
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.numericColumns.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              {stats.numericColumns.slice(0, 1).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.categoricalColumns.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              {stats.categoricalColumns.slice(0, 1).join(', ')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Sample Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Data Preview
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">First 5 rows of {fileName}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-xs min-w-full">
                <thead>
                  <tr className="border-b">
                    {stats.columns.slice(0, 3).map(col => (
                      <th key={col} className="text-left p-2 font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.sampleData.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {stats.columns.slice(0, 3).map(col => (
                        <td key={col} className="p-2 truncate max-w-[80px] sm:max-w-[100px]">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        {stats.categoricalColumns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">Top values in {stats.categoricalColumns[0]}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.columnStats[stats.categoricalColumns[0]]?.topValues || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.value}
                    outerRadius={60}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                    nameKey="value"
                  >
                    {stats.columnStats[stats.categoricalColumns[0]]?.topValues?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Numeric Summary */}
        {stats.numericColumns.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Numeric Summary</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Statistical overview of numeric columns</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {stats.numericColumns.slice(0, 4).map(col => {
                  const colStats = stats.columnStats[col];
                  return (
                    <div key={col} className="border rounded-lg p-2 sm:p-3">
                      <p className="text-xs sm:text-sm font-medium truncate mb-1 sm:mb-2">{col}</p>
                      <div className="space-y-1 text-[10px] sm:text-xs">
                        <div className="flex justify-between gap-1">
                          <span className="text-muted-foreground">Min:</span>
                          <span className="font-medium truncate">{colStats.min?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="text-muted-foreground">Max:</span>
                          <span className="font-medium truncate">{colStats.max?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-1">
                          <span className="text-muted-foreground">Avg:</span>
                          <span className="font-medium truncate">{colStats.avg?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataDashboard;