import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lightbulb, Target } from "lucide-react";

interface FormattedResponseProps {
  content: string;
}

const FormattedResponse = ({ content }: FormattedResponseProps) => {
  // Check if this is a structured inventory analysis format
  const isStructuredAnalysis = content.includes("**Total") && content.includes("**Breakdown by");

  if (!isStructuredAnalysis) {
    return (
      <div className="bg-muted/50 px-4 py-3 rounded-lg">
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  // Parse structured content
  const lines = content.split('\n').filter(line => line.trim());
  
  // Extract title (first line with emoji)
  const titleLine = lines[0];
  const title = titleLine.replace(/^📊\s*/, '');

  // Extract total value
  const totalLine = lines.find(line => line.includes("**Total"));
  const totalMatch = totalLine?.match(/\*\*Total.*?\*\*:\s*(.+)/);
  const totalValue = totalMatch ? totalMatch[1].trim() : "";

  // Extract breakdown section
  const breakdownStartIdx = lines.findIndex(line => line.includes("**Breakdown by"));
  const insightsStartIdx = lines.findIndex(line => line.includes("**Key Insights"));
  const recommendationsStartIdx = lines.findIndex(line => line.includes("**Recommendations"));

  // Parse breakdown data (between Breakdown and Key Insights)
  const breakdownLines = lines.slice(breakdownStartIdx + 1, insightsStartIdx)
    .filter(line => line.startsWith('-'));
  
  const breakdownData = breakdownLines.map(line => {
    // Format: - Category: $XX,XXX.XX (XX.X% of total) or - Category: $XX,XXX.XX (XX.X%)
    const match = line.match(/-\s*(.+?):\s*(\$[\d,\.]+)\s*\((\d+\.?\d*%)/);
    if (match) {
      return {
        condition: match[1].trim(),
        value: match[2].trim(),
        percentage: match[3].trim()
      };
    }
    return null;
  }).filter(Boolean);

  // Parse insights
  const insightLines = lines.slice(insightsStartIdx + 1, recommendationsStartIdx)
    .filter(line => line.startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim());

  // Parse recommendations
  const recommendationLines = lines.slice(recommendationsStartIdx + 1)
    .filter(line => line.startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim());

  return (
    <div className="space-y-4">
      {/* Title Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            📊 {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {totalValue}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      {breakdownData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Condition</TableHead>
                  <TableHead className="font-semibold text-right">Value</TableHead>
                  <TableHead className="font-semibold text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownData.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{item.condition}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-lg">
                      {item.value}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.percentage}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {insightLines.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insightLines.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendationLines.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendationLines.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">→</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormattedResponse;
